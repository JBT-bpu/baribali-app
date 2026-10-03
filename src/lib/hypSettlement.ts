import { createHash } from 'node:crypto';

import { HypGatewayError, validateHypCallbackParams, verifyHypPayment } from '@/lib/hypPay';
import type {
    PaymentCallbackRecord,
    PaymentVerificationResult,
} from '@/lib/paymentAttempts';

export interface HypSettlementDependencies {
    verify: typeof verifyHypPayment;
    record: (input: {
        merchantReference: string;
        eventKey: string;
        eventSource: 'browser_return' | 'server_notification' | 'reconciliation';
        providerTransactionId: string | null;
        safePayload: Record<string, string>;
        /** Ordered, complete VERIFY evidence; persistence encrypts it server-side. */
        callbackQuery: string;
    }) => Promise<PaymentCallbackRecord>;
    apply: (input: {
        eventId: number;
        outcome: 'approved' | 'verification_pending';
        providerTransactionId: string | null;
        reportedAmountAgorot: number | null;
        currencyCode: string | null;
        providerCode: string | null;
        verificationMethod: string;
        safePayload: Record<string, string>;
    }) => Promise<PaymentVerificationResult>;
    /**
     * Optional budget for the outbound VERIFY request. It is deliberately
     * claimed only after the callback (including its refund-critical Id) is
     * durable. Returning false leaves the event replayable and the attempt in
     * verification_pending instead of dropping the browser return.
     */
    claimVerificationBudget?: (input: {
        merchantReference: string;
        callback: PaymentCallbackRecord;
    }) => boolean;
}

export interface HypSettlementResult {
    orderId: string | null;
    result: string;
    paid: boolean;
}

function uniqueCallbackValue(params: URLSearchParams, name: string): string | null {
    const values = [...params.entries()]
        .filter(([key]) => key.toLowerCase() === name.toLowerCase())
        .map(([, value]) => value);
    return values.length === 1 ? values[0] : null;
}

function safeCallbackPayload(params: URLSearchParams): Record<string, string> {
    const safe: Record<string, string> = {};
    for (const field of ['Order', 'Id', 'Amount', 'Coin', 'CCode']) {
        const value = uniqueCallbackValue(params, field);
        if (value !== null) safe[field] = value.slice(0, 256);
    }
    return safe;
}

function callbackEventKey(source: string, params: URLSearchParams): string {
    // HYP requires the original parameter order for VERIFY. Different ordered
    // envelopes must not collide and overwrite each other's replay evidence.
    const fingerprint = createHash('sha256')
        .update(params.toString(), 'utf8')
        .digest('hex');
    return `${source}:${fingerprint}`;
}

function errorCode(error: unknown): string {
    return error instanceof HypGatewayError
        ? error.code
        : 'HYP_VERIFY_UNEXPECTED';
}

export async function settleHypCallback(
    params: URLSearchParams,
    source: 'browser_return' | 'server_notification' | 'reconciliation',
    dependencies: HypSettlementDependencies,
): Promise<HypSettlementResult> {
    const merchantReference = uniqueCallbackValue(params, 'Order');
    if (!merchantReference || merchantReference.length > 128) {
        return { orderId: null, result: 'invalid_reference', paid: false };
    }
    const callbackTransactionId = uniqueCallbackValue(params, 'Id');
    if (callbackTransactionId && callbackTransactionId.length > 256) {
        return { orderId: null, result: 'invalid_transaction_id', paid: false };
    }
    validateHypCallbackParams(params);

    const callback = await dependencies.record({
        merchantReference,
        eventKey: callbackEventKey(source, params),
        eventSource: source,
        providerTransactionId: callbackTransactionId,
        safePayload: safeCallbackPayload(params),
        callbackQuery: params.toString(),
    });

    return settleRecordedHypCallback(params, callback, dependencies);
}

/** Replay a durable event, without inserting a new callback or creating a checkout. */
export async function settleRecordedHypCallback(
    params: URLSearchParams,
    callback: PaymentCallbackRecord,
    dependencies: Pick<HypSettlementDependencies, 'verify' | 'apply' | 'claimVerificationBudget'>,
): Promise<HypSettlementResult> {
    validateHypCallbackParams(params);
    const merchantReference = uniqueCallbackValue(params, 'Order');
    const callbackTransactionId = uniqueCallbackValue(params, 'Id');
    if (!merchantReference) return { orderId: null, result: 'invalid_reference', paid: false };

    if (!callback.attemptId || !callback.orderId || callback.eventId === null) {
        return { orderId: null, result: 'unknown_reference', paid: false };
    }
    if (
        callback.duplicateEvent
        && (callback.attemptStatus === 'paid' || callback.attemptStatus === 'duplicate_paid')
    ) {
        return { orderId: callback.orderId, result: 'duplicate_success', paid: true };
    }

    if (dependencies.claimVerificationBudget?.({ merchantReference, callback }) === false) {
        return {
            orderId: callback.orderId,
            result: 'verification_deferred',
            paid: callback.attemptStatus === 'paid'
                || callback.attemptStatus === 'duplicate_paid',
        };
    }

    let verification;
    try {
        verification = await dependencies.verify(params);
    } catch (error) {
        const pending = await dependencies.apply({
            eventId: callback.eventId,
            outcome: 'verification_pending',
            providerTransactionId: callbackTransactionId,
            reportedAmountAgorot: null,
            currencyCode: null,
            providerCode: errorCode(error),
            verificationMethod: 'legacy_apisign_verify',
            safePayload: {},
        });
        return {
            orderId: pending.orderId ?? callback.orderId,
            result: pending.result,
            // Another callback may have completed while this VERIFY request
            // failed. Respect the order state returned by the atomic RPC.
            paid: pending.orderPaymentStatus === 'paid',
        };
    }

    const referenceMatches = verification.orderReference === merchantReference;
    const outcome = verification.verified && referenceMatches
        ? 'approved'
        : 'verification_pending';
    // Pay's documented success redirect can omit Coin, and VERIFY can return
    // only CCode=0. In that exact case the signed request's immutable ILS ledger
    // is authoritative. Never infer currency from an unverified response, an
    // explicit invalid/mismatched Coin, or a ledger in another currency.
    const verifiedCurrency = verification.currencyCode ?? (
        outcome === 'approved'
        && verification.currencyReported === false
        && callback.currencyCode === 'ILS'
        && verification.amountAgorot === callback.amountAgorot
        && verification.transactionId === callbackTransactionId
        && !!callbackTransactionId
            ? 'ILS'
            : null
    );
    const applied = await dependencies.apply({
        eventId: callback.eventId,
        outcome,
        providerTransactionId: verification.transactionId,
        reportedAmountAgorot: verification.amountAgorot,
        currencyCode: verifiedCurrency,
        providerCode: verification.ccode,
        verificationMethod: 'legacy_apisign_verify',
        safePayload: {
            ...verification.safeMetadata,
            ...(verifiedCurrency && !verification.currencyCode
                ? { CurrencySource: 'signed_request_ledger' }
                : {}),
        },
    });

    return {
        orderId: applied.orderId ?? callback.orderId,
        result: applied.result,
        // A concurrent callback can settle the order between record() and
        // apply(), in which case the second apply reports duplicate_event.
        // The order's authoritative payment state still means the customer
        // should land on success instead of an indefinite "verifying" view.
        paid: applied.orderPaymentStatus === 'paid'
            || applied.result === 'settled'
            || applied.result === 'duplicate_success',
    };
}

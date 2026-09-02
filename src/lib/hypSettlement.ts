import { createHash } from 'node:crypto';

import { HypGatewayError, verifyHypPayment } from '@/lib/hypPay';
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
    const canonical = [...params.entries()]
        .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
            leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
        ));
    const fingerprint = createHash('sha256')
        .update(new URLSearchParams(canonical).toString(), 'utf8')
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

    const callback = await dependencies.record({
        merchantReference,
        eventKey: callbackEventKey(source, params),
        eventSource: source,
        providerTransactionId: callbackTransactionId,
        safePayload: safeCallbackPayload(params),
    });

    if (!callback.attemptId || !callback.orderId) {
        return { orderId: null, result: 'unknown_reference', paid: false };
    }
    if (callback.duplicateEvent && callback.attemptStatus === 'paid') {
        return { orderId: callback.orderId, result: 'duplicate_success', paid: true };
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
            paid: false,
        };
    }

    const referenceMatches = verification.orderReference === merchantReference;
    const outcome = verification.verified && referenceMatches
        ? 'approved'
        : 'verification_pending';
    const applied = await dependencies.apply({
        eventId: callback.eventId,
        outcome,
        providerTransactionId: verification.transactionId,
        reportedAmountAgorot: verification.amountAgorot,
        currencyCode: verification.currencyCode,
        providerCode: verification.ccode,
        verificationMethod: 'legacy_apisign_verify',
        safePayload: verification.safeMetadata,
    });

    return {
        orderId: applied.orderId ?? callback.orderId,
        result: applied.result,
        paid: applied.result === 'settled' || applied.result === 'duplicate_success',
    };
}

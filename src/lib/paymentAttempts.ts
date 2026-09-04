import 'server-only';

import { getSupabaseAdmin } from '@/lib/serverSupabase';

export type PaymentAttemptStatus =
    | 'initializing'
    | 'checkout_ready'
    | 'verification_pending'
    | 'paid'
    | 'declined'
    | 'init_failed'
    | 'needs_review'
    | 'duplicate_paid'
    | 'superseded'
    | 'cancelled'
    | 'expired';

export interface ClaimedPaymentAttempt {
    id: string;
    orderId: string;
    provider: string;
    merchantReference: string;
    amountAgorot: number;
    currencyCode: string;
    status: PaymentAttemptStatus;
    checkoutUrl: string | null;
    createdNew: boolean;
    leaseOwned: boolean;
}

export interface PaymentCallbackRecord {
    eventId: number | null;
    attemptId: string | null;
    orderId: string | null;
    amountAgorot: number | null;
    currencyCode: string | null;
    attemptStatus: PaymentAttemptStatus | 'unknown_reference';
    duplicateEvent: boolean;
}

export interface PaymentVerificationResult {
    result: string;
    orderId: string | null;
    attemptId: string | null;
    orderPaymentStatus: string | null;
}

export class PaymentPersistenceError extends Error {
    constructor(
        public readonly operation: string,
        public readonly code: string | null,
    ) {
        super(`Payment persistence failed during ${operation}`);
        this.name = 'PaymentPersistenceError';
    }
}

function firstRow<T>(data: unknown, operation: string): T {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') {
        throw new PaymentPersistenceError(operation, 'EMPTY_RPC_RESULT');
    }
    return row as T;
}

function dbError(operation: string, error: { code?: string | null } | null): never {
    throw new PaymentPersistenceError(operation, error?.code ?? null);
}

export async function claimPaymentAttempt(input: {
    orderId: string;
    idempotencyKey: string;
    leaseToken: string;
}): Promise<ClaimedPaymentAttempt> {
    const { data, error } = await getSupabaseAdmin().rpc('claim_payment_attempt', {
        p_order_id: input.orderId,
        p_provider: 'hyp',
        p_idempotency_key: input.idempotencyKey,
        p_lease_token: input.leaseToken,
    });
    if (error) dbError('claim_payment_attempt', error);

    const row = firstRow<Record<string, unknown>>(data, 'claim_payment_attempt');
    return {
        id: String(row.attempt_id),
        orderId: String(row.attempt_order_id),
        provider: String(row.attempt_provider),
        merchantReference: String(row.merchant_reference),
        amountAgorot: Number(row.amount_agorot),
        currencyCode: String(row.currency_code),
        status: String(row.attempt_status) as PaymentAttemptStatus,
        checkoutUrl: typeof row.checkout_url === 'string' ? row.checkout_url : null,
        createdNew: row.created_new === true,
        leaseOwned: row.lease_owned === true,
    };
}

export async function finishPaymentInitialization(input: {
    attemptId: string;
    leaseToken: string;
    checkoutUrl: string | null;
    errorCode?: string | null;
}): Promise<{ status: PaymentAttemptStatus; checkoutUrl: string | null }> {
    const { data, error } = await getSupabaseAdmin().rpc('finish_payment_initialization', {
        p_attempt_id: input.attemptId,
        p_lease_token: input.leaseToken,
        p_checkout_url: input.checkoutUrl,
        p_error_code: input.errorCode ?? null,
    });
    if (error) dbError('finish_payment_initialization', error);

    const row = firstRow<Record<string, unknown>>(data, 'finish_payment_initialization');
    return {
        status: String(row.attempt_status) as PaymentAttemptStatus,
        checkoutUrl: typeof row.checkout_url === 'string' ? row.checkout_url : null,
    };
}

export async function recordPaymentCallback(input: {
    merchantReference: string;
    eventKey: string;
    eventSource: 'browser_return' | 'server_notification' | 'reconciliation';
    providerTransactionId: string | null;
    safePayload: Record<string, string>;
    /** Known attempts are always recorded. This flag only permits storing an
     * unknown-reference event after the public ingress budget is consumed. */
    recordUnknownReference?: boolean;
}): Promise<PaymentCallbackRecord> {
    const { data, error } = await getSupabaseAdmin().rpc('record_payment_callback', {
        p_provider: 'hyp',
        p_merchant_reference: input.merchantReference,
        p_event_key: input.eventKey,
        p_event_source: input.eventSource,
        p_provider_transaction_id: input.providerTransactionId,
        p_payload_safe: input.safePayload,
        p_record_unknown_reference: input.recordUnknownReference ?? true,
    });
    if (error) dbError('record_payment_callback', error);

    const row = firstRow<Record<string, unknown>>(data, 'record_payment_callback');
    return {
        eventId: row.event_id == null ? null : Number(row.event_id),
        attemptId: typeof row.attempt_id === 'string' ? row.attempt_id : null,
        orderId: typeof row.attempt_order_id === 'string' ? row.attempt_order_id : null,
        amountAgorot: row.amount_agorot == null ? null : Number(row.amount_agorot),
        currencyCode: typeof row.currency_code === 'string' ? row.currency_code : null,
        attemptStatus: String(row.attempt_status) as PaymentCallbackRecord['attemptStatus'],
        duplicateEvent: row.duplicate_event === true,
    };
}

export async function applyPaymentVerification(input: {
    eventId: number;
    outcome: 'approved' | 'verification_pending';
    providerTransactionId: string | null;
    reportedAmountAgorot: number | null;
    currencyCode: string | null;
    providerCode: string | null;
    verificationMethod: string;
    safePayload: Record<string, string>;
}): Promise<PaymentVerificationResult> {
    const { data, error } = await getSupabaseAdmin().rpc('apply_payment_verification', {
        p_event_id: input.eventId,
        p_outcome: input.outcome,
        p_provider_transaction_id: input.providerTransactionId,
        p_reported_amount_agorot: input.reportedAmountAgorot,
        p_currency_code: input.currencyCode,
        p_provider_code: input.providerCode,
        p_verification_method: input.verificationMethod,
        p_payload_safe: input.safePayload,
    });
    if (error) dbError('apply_payment_verification', error);

    const row = firstRow<Record<string, unknown>>(data, 'apply_payment_verification');
    return {
        result: String(row.result),
        orderId: typeof row.result_order_id === 'string' ? row.result_order_id : null,
        attemptId: typeof row.result_attempt_id === 'string' ? row.result_attempt_id : null,
        orderPaymentStatus: typeof row.order_payment_status === 'string'
            ? row.order_payment_status
            : null,
    };
}

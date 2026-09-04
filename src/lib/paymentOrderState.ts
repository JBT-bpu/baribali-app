import type { SupabaseClient } from '@supabase/supabase-js';

export type PaymentStartDecision =
    | 'pending'
    | 'not_required'
    | 'already_settled'
    | 'state_changed';

export type PendingPaymentTransitionResult =
    | { kind: 'updated' }
    | { kind: 'stale' }
    | { kind: 'error'; message: string };

type PendingPaymentUpdate = {
    payment_status: 'pending' | 'paid_unverified' | 'failed';
};

/**
 * Payment-page creation is valid only for the state assigned when a configured
 * online provider created the order. Every other state reflects a later or
 * different payment decision and must not be reopened by a stale request.
 */
export function paymentStartDecision(
    total: number,
    paymentStatus: string,
): PaymentStartDecision {
    if (
        total <= 0
        || paymentStatus === 'no_payment_required'
        || paymentStatus === 'pay_at_pickup'
    ) return 'not_required';
    if (paymentStatus === 'paid' || paymentStatus === 'paid_unverified') {
        return 'already_settled';
    }
    return paymentStatus === 'pending' ? 'pending' : 'state_changed';
}

async function updateOrderWherePaymentStatus(
    admin: SupabaseClient,
    orderId: string,
    expectedStatuses: ('pending' | 'failed')[],
    values: PendingPaymentUpdate,
): Promise<PendingPaymentTransitionResult> {
    let query = admin
        .from('orders')
        .update(values)
        .eq('id', orderId);
    query = expectedStatuses.length === 1
        ? query.eq('payment_status', expectedStatuses[0])
        : query.in('payment_status', expectedStatuses);
    const { data, error } = await query.select('id');

    if (error) return { kind: 'error', message: error.message };
    if (!Array.isArray(data)) {
        return { kind: 'error', message: 'Payment update returned an invalid result' };
    }
    if (data.length === 0) return { kind: 'stale' };
    if (data.length !== 1) {
        return { kind: 'error', message: 'Payment update affected multiple orders' };
    }
    return { kind: 'updated' };
}

/**
 * Failure may claim only `pending`; success may also promote `failed`. This
 * makes an actual charge dominate a racing decline while paid states remain
 * absorbing. `paid_unverified` still requires the register check because the
 * legacy webhook is not cryptographically authenticated.
 */
export function settleLegacyOrder(
    admin: SupabaseClient,
    input: {
        orderId: string;
        success: boolean;
    },
): Promise<PendingPaymentTransitionResult> {
    return updateOrderWherePaymentStatus(
        admin,
        input.orderId,
        input.success ? ['pending', 'failed'] : ['pending'],
        {
            payment_status: input.success ? 'paid_unverified' : 'failed',
        },
    );
}

/**
 * Final compare-and-set before returning a legacy hosted-payment URL. This is
 * intentionally a no-op value update: the guarded write obtains the row lock
 * and makes a stale lookup observable as zero affected rows.
 */
export function confirmPendingLegacyPayment(
    admin: SupabaseClient,
    orderId: string,
): Promise<PendingPaymentTransitionResult> {
    return updateOrderWherePaymentStatus(
        admin,
        orderId,
        ['pending'],
        { payment_status: 'pending' },
    );
}

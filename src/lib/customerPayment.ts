export type CustomerPaymentTone = 'done' | 'verify' | 'owed';

export interface CustomerPaymentPresentation {
    text: string;
    owed: boolean;
    tone: CustomerPaymentTone;
    icon: string;
}

/**
 * The provider fallback owns one exact query value. Repeated payment keys are
 * ambiguous and must not become order-dependent through URLSearchParams.get().
 */
export function isPaymentVerificationReturn(search: string): boolean {
    const values = new URLSearchParams(search).getAll('payment');
    return values.length === 1 && values[0] === 'verifying';
}

/** Only an explicitly pending order may open a hosted checkout page. */
export function requiresHostedPayment(status: string | null | undefined): boolean {
    return status === 'pending';
}

/**
 * Customer-facing payment truth shared by the immediate confirmation and the
 * tracking page. `paid_unverified` means the money must not be requested again,
 * but it is deliberately distinct from a provider-verified `paid` transaction.
 */
export function customerPaymentPresentation(
    status: string | null | undefined,
): CustomerPaymentPresentation | null {
    switch (status) {
        case 'paid':
            return { text: 'שולם', owed: false, tone: 'done', icon: '✓' };
        case 'no_payment_required':
            return { text: 'אין צורך בתשלום', owed: false, tone: 'done', icon: '✓' };
        case 'paid_unverified':
            return { text: 'בבדיקה — אל תשלמו שוב', owed: false, tone: 'verify', icon: '⏳' };
        case 'verification_pending':
            return { text: 'בבדיקה — אל תשלמו שוב', owed: false, tone: 'verify', icon: '⏳' };
        case 'pay_at_pickup':
            return { text: 'לתשלום באיסוף', owed: true, tone: 'owed', icon: '💵' };
        case 'pending':
            return { text: 'ממתין לתשלום', owed: true, tone: 'owed', icon: '💳' };
        case 'failed':
            return { text: 'התשלום נכשל — שלמו באיסוף', owed: true, tone: 'owed', icon: '💳' };
        default:
            return null;
    }
}

/**
 * Payment provider configuration helpers (server-side).
 *
 * The app supports an online-payment flow (order → gateway redirect → webhook
 * marks it paid) and a pay-at-pickup flow. Which one applies depends on
 * whether the selected provider actually has usable credentials: until real
 * gateway credentials are set, orders can't be paid online, so they're treated
 * as pay-at-pickup instead of being stranded at `pending` (invisible to the
 * kitchen board. A zero-total order uses the separate
 * `no_payment_required` state and never enters a gateway flow.
 */

export type PaymentProvider = 'hyp' | 'yaadpay' | 'tranzila';
export type PublicPaymentState =
    | { paymentMode: 'hosted'; paymentProvider: PaymentProvider }
    | { paymentMode: 'pickup' | 'unavailable'; paymentProvider: null };

export function paymentProvider(): PaymentProvider {
    const configured = (process.env.PAYMENT_PROVIDER ?? 'tranzila').trim().toLowerCase();
    if (configured === 'hyp' || configured === 'yaadpay' || configured === 'tranzila') {
        return configured;
    }
    throw new Error('PAYMENT_PROVIDER_INVALID');
}

/**
 * True when the selected provider has usable credentials (online payment can
 * actually happen). False → the app runs pay-at-pickup only.
 */
export function isPaymentConfigured(): boolean {
    switch (paymentProvider()) {
        case 'hyp':
            return !!(process.env.HYP_MASOF && process.env.HYP_KEY && process.env.HYP_PASSP);
        case 'yaadpay':
            return !!(process.env.YAADPAY_MASOF && process.env.YAADPAY_PASSP);
        case 'tranzila':
            // The .env.example ships a placeholder; treat that as unconfigured.
            return !!process.env.TRANZILA_TERMINAL && process.env.TRANZILA_TERMINAL !== 'your_terminal_name';
    }
}

/**
 * The only payment information a customer needs before submitting an order.
 * Invalid provider configuration is an explicit unavailable state so the UI
 * can fail closed; credentials and configuration details never leave here.
 */
export function publicPaymentState(): PublicPaymentState {
    try {
        if (!isPaymentConfigured()) {
            return { paymentMode: 'pickup', paymentProvider: null };
        }
        return { paymentMode: 'hosted', paymentProvider: paymentProvider() };
    } catch {
        return { paymentMode: 'unavailable', paymentProvider: null };
    }
}

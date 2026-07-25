/**
 * Payment provider configuration helpers (server-side).
 *
 * The app supports an online-payment flow (order → gateway redirect → webhook
 * marks it paid) and a pay-at-pickup flow. Which one applies depends on
 * whether the selected provider actually has usable credentials: until real
 * gateway credentials are set, orders can't be paid online, so they're treated
 * as pay-at-pickup instead of being stranded at `pending` (invisible to the
 * kitchen board, which only shows paid / pay_at_pickup / paid_unverified).
 */

export function paymentProvider(): string {
    return process.env.PAYMENT_PROVIDER ?? 'tranzila';
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
        default:
            // The .env.example ships a placeholder; treat that as unconfigured.
            return !!process.env.TRANZILA_TERMINAL && process.env.TRANZILA_TERMINAL !== 'your_terminal_name';
    }
}

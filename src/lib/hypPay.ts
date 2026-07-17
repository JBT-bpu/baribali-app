/**
 * Hyp Pay integration (formerly YaadPay) — https://developers.hyp.co.il/
 *
 * Flow (server-side only, credentials never touch the browser):
 *  1. createHypPaymentUrl() — "SIGN" request: ask Hyp to sign a new payment
 *     page request, then redirect the customer's browser to the result.
 *  2. Customer pays on Hyp's hosted page (we never see card data).
 *  3. Hyp redirects the browser back to whatever "success page" URL is
 *     configured in the Hyp Pay portal (Settings -> Payment Page and API ->
 *     "Post-transaction address") — NOT passed per-request. That route
 *     should call verifyHypPayment() with the redirect's query params
 *     before trusting the transaction, since anyone could hit that URL
 *     with fabricated params otherwise.
 *
 * Docs consulted directly (raw markdown, not summarized):
 *   https://developers.hyp.co.il/pay/getting-started/creating-a-payment-page.md
 *   https://developers.hyp.co.il/pay/security/transaction-validation.md
 */

const HYP_BASE = 'https://pay.hyp.co.il/p/';

function hypCredentials() {
    const masof = process.env.HYP_MASOF;
    const key = process.env.HYP_KEY;
    const passp = process.env.HYP_PASSP;
    if (!masof || !key || !passp) {
        throw new Error('HYP_MASOF / HYP_KEY / HYP_PASSP not set');
    }
    return { masof, key, passp };
}

export async function createHypPaymentUrl(params: {
    amount: number;
    orderNum: string;
    info?: string;
}): Promise<string> {
    const { masof, key, passp } = hypCredentials();
    const signParams = new URLSearchParams({
        action: 'APISign',
        What: 'SIGN',
        Sign: 'True',
        Masof: masof,
        KEY: key,
        PassP: passp,
        Amount: String(params.amount),
        Coin: '1', // ILS
        Order: params.orderNum,
        ...(params.info ? { Info: params.info } : {}),
    });

    const res = await fetch(`${HYP_BASE}?${signParams.toString()}`);
    const bodyText = await res.text();
    if (!res.ok || !bodyText.includes('signature=')) {
        throw new Error(`Hyp Pay SIGN request failed: ${bodyText.slice(0, 300)}`);
    }

    // Per Hyp's docs, the SIGN response is itself a ready-to-use query
    // string — append it verbatim, in the same order, no re-parsing.
    return `${HYP_BASE}?${bodyText}`;
}

export interface HypVerifyResult {
    verified: boolean;
    ccode: string | null;
}

export async function verifyHypPayment(redirectParams: URLSearchParams): Promise<HypVerifyResult> {
    const { masof, key, passp } = hypCredentials();
    const verifyParams = new URLSearchParams({
        action: 'APISign',
        What: 'VERIFY',
        Masof: masof,
        KEY: key,
        PassP: passp,
    });
    // Append the exact params Hyp sent on the redirect, preserving order.
    for (const [k, v] of redirectParams.entries()) {
        verifyParams.append(k, v);
    }

    const res = await fetch(`${HYP_BASE}?${verifyParams.toString()}`);
    const bodyText = await res.text();
    const parsed = new URLSearchParams(bodyText);
    const ccode = parsed.get('CCode');
    return { verified: ccode === '0', ccode };
}

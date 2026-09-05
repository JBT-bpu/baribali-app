/**
 * Legacy Hyp Pay APISign client (pay.hyp.co.il/p).
 *
 * The current public Hyp documentation mostly describes the newer XML /
 * CreditGuard API. This client deliberately keeps the existing APISign
 * protocol until the test terminal's legacy payload contract is confirmed.
 * Credentials and provider response bodies never appear in thrown messages.
 */

const HYP_BASE = 'https://pay.hyp.co.il/p/';
const HYP_TIMEOUT_MS = 10_000;
const MAX_PROVIDER_BODY = 16_384;
const MAX_CALLBACK_QUERY = 8_192;

type FetchLike = typeof fetch;

export interface HypCredentials {
    masof: string;
    key: string;
    passp: string;
}

export interface HypVerifyResult {
    verified: boolean;
    ccode: string | null;
    transactionId: string | null;
    orderReference: string | null;
    amountAgorot: number | null;
    currencyCode: string | null;
    safeMetadata: Record<string, string>;
}

export class HypGatewayError extends Error {
    constructor(
        public readonly code: string,
        public readonly transient: boolean,
    ) {
        super(code);
        this.name = 'HypGatewayError';
    }
}

function hypCredentials(): HypCredentials {
    const masof = process.env.HYP_MASOF;
    const key = process.env.HYP_KEY;
    const passp = process.env.HYP_PASSP;
    if (!masof || !key || !passp) {
        throw new HypGatewayError('HYP_NOT_CONFIGURED', false);
    }
    return { masof, key, passp };
}

function queryValue(params: URLSearchParams, name: string): string | null {
    const values = [...params.entries()]
        .filter(([key]) => key.toLowerCase() === name.toLowerCase())
        .map(([, value]) => value);
    if (values.length > 1) {
        throw new HypGatewayError(`HYP_DUPLICATE_${name.toUpperCase()}`, false);
    }
    return values[0] ?? null;
}

function boundedQueryValue(
    params: URLSearchParams,
    name: string,
    maxLength: number,
): string | null {
    const value = queryValue(params, name);
    if (value !== null && value.length > maxLength) {
        throw new HypGatewayError(`HYP_${name.toUpperCase()}_TOO_LONG`, false);
    }
    return value;
}

function hasQueryKey(params: URLSearchParams, name: string): boolean {
    return [...params.keys()].some(key => key.toLowerCase() === name.toLowerCase());
}

function validateCallbackParams(params: URLSearchParams): void {
    if (params.toString().length > MAX_CALLBACK_QUERY) {
        throw new HypGatewayError('HYP_CALLBACK_TOO_LARGE', false);
    }

    const reserved = new Set(['action', 'what', 'masof', 'key', 'passp']);
    let count = 0;
    for (const [key] of params.entries()) {
        count += 1;
        if (count > 60) throw new HypGatewayError('HYP_CALLBACK_TOO_MANY_FIELDS', false);
        if (key.length > 128) throw new HypGatewayError('HYP_CALLBACK_FIELD_NAME_TOO_LONG', false);
        if (reserved.has(key.toLowerCase())) {
            throw new HypGatewayError('HYP_CALLBACK_RESERVED_FIELD', false);
        }
    }

    boundedQueryValue(params, 'Order', 128);
    boundedQueryValue(params, 'Id', 256);
    boundedQueryValue(params, 'Amount', 64);
    boundedQueryValue(params, 'Coin', 16);
    boundedQueryValue(params, 'CCode', 120);
}

async function providerGet(
    url: string,
    fetchImpl: FetchLike,
    operation: 'SIGN' | 'VERIFY',
): Promise<string> {
    let response: Response;
    try {
        response = await fetchImpl(url, {
            method: 'GET',
            cache: 'no-store',
            signal: AbortSignal.timeout(HYP_TIMEOUT_MS),
        });
    } catch {
        throw new HypGatewayError(`HYP_${operation}_TRANSPORT`, true);
    }

    let body: string;
    try {
        body = await response.text();
    } catch {
        throw new HypGatewayError(`HYP_${operation}_BODY`, true);
    }

    if (body.length > MAX_PROVIDER_BODY) {
        throw new HypGatewayError(`HYP_${operation}_BODY_TOO_LARGE`, false);
    }
    if (!response.ok) {
        throw new HypGatewayError(
            `HYP_${operation}_HTTP_${response.status}`,
            response.status >= 500 || response.status === 429,
        );
    }
    return body;
}

export function formatAgorot(amountAgorot: number): string {
    if (!Number.isSafeInteger(amountAgorot) || amountAgorot <= 0) {
        throw new HypGatewayError('HYP_AMOUNT_INVALID', false);
    }
    const whole = Math.floor(amountAgorot / 100);
    const fraction = amountAgorot % 100;
    return fraction === 0
        ? String(whole)
        : `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function parseHypAmountToAgorot(value: string | null): number | null {
    if (!value) return null;
    const normalized = value.trim().replace(',', '.');
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match) return null;

    const whole = Number(match[1]);
    const fraction = Number((match[2] ?? '').padEnd(2, '0'));
    const result = whole * 100 + fraction;
    return Number.isSafeInteger(result) ? result : null;
}

function currencyCode(coin: string | null): string | null {
    if (!coin) return null;
    const normalized = coin.trim().toUpperCase();
    if (normalized === '1' || normalized === 'ILS') return 'ILS';
    return normalized.length === 3 ? normalized : null;
}

function safeVerificationMetadata(params: URLSearchParams): Record<string, string> {
    const safe: Record<string, string> = {};
    for (const field of ['CCode', 'Order', 'Id', 'Amount', 'Coin', 'ACode']) {
        const value = queryValue(params, field);
        if (value !== null) safe[field] = value.slice(0, 256);
    }
    return safe;
}

export function createHypClient(credentials: HypCredentials, fetchImpl: FetchLike = fetch) {
    const createPaymentUrl = async (params: {
        amountAgorot: number;
        merchantReference: string;
        info?: string;
    }): Promise<string> => {
        const reference = params.merchantReference.trim();
        if (!reference || reference.length > 128) {
            throw new HypGatewayError('HYP_REFERENCE_INVALID', false);
        }

        const signParams = new URLSearchParams({
            action: 'APISign',
            What: 'SIGN',
            Sign: 'True',
            Masof: credentials.masof,
            KEY: credentials.key,
            PassP: credentials.passp,
            Amount: formatAgorot(params.amountAgorot),
            Coin: '1',
            Order: reference,
            // Template 5 is the shortest hosted form that still shows both
            // the merchant name and the amount. Keep this checkout focused on
            // the only method BariBali currently supports: one card payment.
            tmp: '5',
            PageLang: 'HEB',
            Tash: '1',
            FixTash: 'True',
            hideBtns: 'True',
            ...(params.info ? { Info: params.info } : {}),
        });

        const body = await providerGet(
            `${HYP_BASE}?${signParams.toString()}`,
            fetchImpl,
            'SIGN',
        );
        const signed = new URLSearchParams(body);
        if (!hasQueryKey(signed, 'signature')) {
            throw new HypGatewayError('HYP_SIGN_MALFORMED', false);
        }

        if (hasQueryKey(signed, 'KEY') || hasQueryKey(signed, 'PassP')) {
            throw new HypGatewayError('HYP_SIGN_SECRET_ECHO', false);
        }
        return `${HYP_BASE}?${body}`;
    };

    const verifyPayment = async (redirectParams: URLSearchParams): Promise<HypVerifyResult> => {
        validateCallbackParams(redirectParams);

        const verifyParams = new URLSearchParams({
            action: 'APISign',
            What: 'VERIFY',
            Masof: credentials.masof,
            KEY: credentials.key,
            PassP: credentials.passp,
        });
        for (const [key, value] of redirectParams.entries()) {
            verifyParams.append(key, value);
        }

        const body = await providerGet(
            `${HYP_BASE}?${verifyParams.toString()}`,
            fetchImpl,
            'VERIFY',
        );
        const verifiedParams = new URLSearchParams(body);

        const callbackReference = boundedQueryValue(redirectParams, 'Order', 128);
        const verifiedReference = boundedQueryValue(verifiedParams, 'Order', 128);
        if (callbackReference && verifiedReference && callbackReference !== verifiedReference) {
            throw new HypGatewayError('HYP_VERIFY_REFERENCE_MISMATCH', false);
        }

        const callbackId = boundedQueryValue(redirectParams, 'Id', 256);
        const verifiedId = boundedQueryValue(verifiedParams, 'Id', 256);
        if (callbackId && verifiedId && callbackId !== verifiedId) {
            throw new HypGatewayError('HYP_VERIFY_TRANSACTION_MISMATCH', false);
        }

        const callbackAmount = parseHypAmountToAgorot(boundedQueryValue(redirectParams, 'Amount', 64));
        const verifiedAmount = parseHypAmountToAgorot(boundedQueryValue(verifiedParams, 'Amount', 64));
        if (callbackAmount !== null && verifiedAmount !== null && callbackAmount !== verifiedAmount) {
            throw new HypGatewayError('HYP_VERIFY_AMOUNT_MISMATCH', false);
        }

        const callbackCoin = currencyCode(boundedQueryValue(redirectParams, 'Coin', 16));
        const verifiedCoin = currencyCode(boundedQueryValue(verifiedParams, 'Coin', 16));
        if (callbackCoin && verifiedCoin && callbackCoin !== verifiedCoin) {
            throw new HypGatewayError('HYP_VERIFY_CURRENCY_MISMATCH', false);
        }

        const ccode = boundedQueryValue(verifiedParams, 'CCode', 120);
        return {
            verified: ccode === '0',
            ccode,
            transactionId: verifiedId ?? callbackId,
            orderReference: verifiedReference ?? callbackReference,
            amountAgorot: verifiedAmount ?? callbackAmount,
            currencyCode: verifiedCoin ?? callbackCoin,
            safeMetadata: safeVerificationMetadata(verifiedParams),
        };
    };

    return { createPaymentUrl, verifyPayment };
}

export async function createHypPaymentUrl(params: {
    amountAgorot: number;
    merchantReference: string;
    info?: string;
}): Promise<string> {
    return createHypClient(hypCredentials()).createPaymentUrl(params);
}

export async function verifyHypPayment(
    redirectParams: URLSearchParams,
): Promise<HypVerifyResult> {
    return createHypClient(hypCredentials()).verifyPayment(redirectParams);
}

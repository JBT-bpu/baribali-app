import { NextRequest, NextResponse } from 'next/server';

import { createHypPaymentUrl } from '@/lib/hypPay';
import { PaymentStartError, startHypPayment } from '@/lib/hypPaymentStart';
import {
    claimPaymentAttempt,
    finishPaymentInitialization,
    PaymentPersistenceError,
} from '@/lib/paymentAttempts';
import { paymentProvider } from '@/lib/payment';
import { enforceRateLimit } from '@/lib/rateLimit';
import { getSupabaseAdmin } from '@/lib/serverSupabase';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function appOrigin(req: NextRequest): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
        } catch {
            // Fall through to the request origin. Never trust the Origin header.
        }
    }
    return req.nextUrl.origin;
}

function buildTranzilaUrl(orderNum: string, total: number, successUrl: string, failUrl: string) {
    const terminal = process.env.TRANZILA_TERMINAL;
    if (!terminal) throw new Error('TRANZILA_NOT_CONFIGURED');
    const params = new URLSearchParams({
        supplier: terminal,
        sum: String(total),
        currency: '1',
        tranmode: 'A',
        orderId: orderNum,
        remarks: orderNum,
        success_url: successUrl,
        fail_url: failUrl,
        noorder: '1',
        lang: 'il',
    });
    return `https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi?${params}`;
}

function buildYaadPayUrl(orderNum: string, total: number, successUrl: string, failUrl: string) {
    const masof = process.env.YAADPAY_MASOF;
    const passp = process.env.YAADPAY_PASSP;
    if (!masof || !passp) throw new Error('YAADPAY_NOT_CONFIGURED');
    const params = new URLSearchParams({
        action: 'pay',
        Masof: masof,
        PassP: passp,
        Price: String(total * 100),
        Currency: '1',
        Order: orderNum,
        Info: `BariBali ${orderNum}`,
        UTF8: '1',
        UTF8out: '1',
        SuccessUrl: successUrl,
        ErrorUrl: failUrl,
    });
    return `https://icom.yaad.net/p/?${params}`;
}

function startErrorResponse(error: PaymentStartError) {
    const customerMessage = error.httpStatus === 202
        ? 'Payment initialization is still in progress'
        : error.code === 'PAYMENT_ALREADY_SETTLED'
            ? 'Order already paid'
            : error.code === 'PAYMENT_NOT_REQUIRED'
                ? 'No payment is required for this order'
            : error.code === 'PAYMENT_VERIFICATION_PENDING'
                ? 'Payment verification is pending'
                : 'Payment could not be initialized';
    return NextResponse.json({
        error: customerMessage,
        code: error.code,
        retryWithNewKey: error.retryWithNewKey,
    }, { status: error.httpStatus });
}

export async function POST(req: NextRequest) {
    const limited = enforceRateLimit(req, 'payment-create', 12, 60_000);
    if (limited) return limited;

    const configuration = supabaseConfigurationState();
    if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();
    if (configuration === 'demo') {
        return NextResponse.json({
            error: 'Payment is unavailable in demo mode',
            code: 'PAYMENT_UNAVAILABLE_IN_DEMO',
        }, { status: 503 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
    }

    const orderId = typeof body === 'object' && body !== null && 'orderId' in body
        ? String(body.orderId)
        : '';
    const idempotencyKey = typeof body === 'object' && body !== null && 'idempotencyKey' in body
        ? String(body.idempotencyKey)
        : '';

    if (!UUID_PATTERN.test(orderId)) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    // Resolve the order before choosing a provider. Besides keeping every
    // provider on the same eligibility rules, this gives a stale recovery
    // request a truthful terminal answer for an order that needs no charge.
    let admin: ReturnType<typeof getSupabaseAdmin>;
    let order: {
        id: string;
        order_num: string;
        total: number;
        payment_status: string;
    };
    try {
        admin = getSupabaseAdmin();
        const { data, error } = await admin
            .from('orders')
            .select('id, order_num, total, payment_status')
            .eq('id', orderId)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        order = data;
    } catch (error) {
        console.error('[POST /api/payment/create] order lookup unavailable', {
            name: error instanceof Error ? error.name : 'unknown',
        });
        return supabaseConfigurationErrorResponse();
    }

    if (order.total <= 0 || order.payment_status === 'no_payment_required') {
        return NextResponse.json({
            error: 'No payment is required for this order',
            code: 'PAYMENT_NOT_REQUIRED',
            retryWithNewKey: false,
        }, { status: 409 });
    }
    if (order.payment_status === 'paid' || order.payment_status === 'paid_unverified') {
        return NextResponse.json({
            error: 'Order already paid',
            code: 'PAYMENT_ALREADY_SETTLED',
            retryWithNewKey: false,
        }, { status: 409 });
    }

    let provider: ReturnType<typeof paymentProvider>;
    try {
        provider = paymentProvider();
    } catch {
        return NextResponse.json({ error: 'Payment provider is not configured' }, { status: 503 });
    }

    if (provider === 'hyp') {
        if (!UUID_PATTERN.test(idempotencyKey)) {
            return NextResponse.json({ error: 'Invalid idempotencyKey' }, { status: 400 });
        }

        try {
            const started = await startHypPayment({ orderId, idempotencyKey }, {
                randomUUID: () => crypto.randomUUID(),
                claim: claimPaymentAttempt,
                finish: finishPaymentInitialization,
                createUrl: createHypPaymentUrl,
            });
            return NextResponse.json(started);
        } catch (error) {
            if (error instanceof PaymentStartError) return startErrorResponse(error);
            if (error instanceof PaymentPersistenceError) {
                const status = error.code === 'P0002'
                    ? 404
                    : error.code === 'P0001' || error.code === '23505'
                        ? 409
                        : 503;
                console.error('[POST /api/payment/create] payment persistence error', {
                    operation: error.operation,
                    code: error.code,
                });
                return NextResponse.json({
                    error: status === 404 ? 'Order not found' : 'Payment could not be initialized',
                    code: 'PAYMENT_PERSISTENCE_ERROR',
                    retryWithNewKey: false,
                }, { status });
            }
            console.error('[POST /api/payment/create] unexpected Hyp initialization error', {
                name: error instanceof Error ? error.name : 'unknown',
            });
            return NextResponse.json({ error: 'Payment could not be initialized' }, { status: 503 });
        }
    }

    try {
        const origin = appOrigin(req);
        const successUrl = `${origin}/order/${orderId}?payment=success`;
        const failUrl = `${origin}/order/${orderId}?payment=failed`;
        const paymentUrl = provider === 'yaadpay'
            ? buildYaadPayUrl(order.order_num, order.total, successUrl, failUrl)
            : buildTranzilaUrl(order.order_num, order.total, successUrl, failUrl);

        await admin
            .from('orders')
            .update({ status: 'waiting', payment_status: 'pending' })
            .eq('id', orderId);

        return NextResponse.json({ paymentUrl });
    } catch (error) {
        console.error('[POST /api/payment/create] non-Hyp initialization error', {
            name: error instanceof Error ? error.name : 'unknown',
        });
        return NextResponse.json({ error: 'Payment could not be initialized' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/*
──────────────────────────────────────────────────────────────
  PAYMENT PROVIDER — set PAYMENT_PROVIDER in .env.local:

  PAYMENT_PROVIDER=tranzila   → Tranzila hosted page (most common in IL)
  PAYMENT_PROVIDER=yaadpay    → YaadPay
  PAYMENT_PROVIDER=hyp        → Hyp online clearing (ask Hyp support for API key)

  Each provider redirects the customer to their hosted payment page.
  After payment, they redirect back to /order/:id?payment=success|fail
──────────────────────────────────────────────────────────────
*/

const PROVIDER = process.env.PAYMENT_PROVIDER ?? 'tranzila';

// ─── Tranzila ────────────────────────────────────────────────────
// Docs: https://www.tranzila.com/developers
// Credentials in .env.local:
//   TRANZILA_TERMINAL=your_terminal_name
function buildTranzilaUrl(orderId: string, orderNum: string, total: number, successUrl: string, failUrl: string) {
    const terminal = process.env.TRANZILA_TERMINAL;
    if (!terminal) throw new Error('TRANZILA_TERMINAL not set');
    const params = new URLSearchParams({
        supplier: terminal,
        sum: String(total),
        currency: '1',              // 1 = ILS (₪)
        tranmode: 'A',              // authorize + capture
        orderId: orderNum,
        remarks: orderNum,
        success_url: successUrl,
        fail_url: failUrl,
        noorder: '1',               // don't show order form
        lang: 'il',
    });
    return `https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi?${params}`;
}

// ─── YaadPay ─────────────────────────────────────────────────────
// Docs: https://yaadpay.docs.apiary.io/
// Credentials: YAADPAY_MASOF, YAADPAY_PASSP
function buildYaadPayUrl(orderId: string, orderNum: string, total: number, successUrl: string, failUrl: string) {
    const masof = process.env.YAADPAY_MASOF;
    const passp = process.env.YAADPAY_PASSP;
    if (!masof || !passp) throw new Error('YAADPAY_MASOF / YAADPAY_PASSP not set');
    const params = new URLSearchParams({
        action: 'pay',
        Masof: masof,
        PassP: passp,
        Price: String(total * 100), // agorot
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

// ─── Hyp Online ──────────────────────────────────────────────────
// Ask Hyp support for your online API key — same account as physical terminal
// Credentials: HYP_API_KEY, HYP_TERMINAL_ID
function buildHypUrl(orderId: string, orderNum: string, total: number, successUrl: string, failUrl: string): string {
    const apiKey = process.env.HYP_API_KEY;
    const terminalId = process.env.HYP_TERMINAL_ID;
    if (!apiKey || !terminalId) throw new Error('HYP_API_KEY / HYP_TERMINAL_ID not set');
    // Hyp uses a server-side API call to get a payment token, then redirect
    // TODO: implement when Hyp credentials are available
    throw new Error('Hyp online payment not yet implemented — contact Hyp support for API credentials');
}

export async function POST(req: NextRequest) {
    try {
        const { orderId } = await req.json();
        if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

        // Never trust a client-submitted total/orderNum — look up the server-computed
        // values that were stored when the order was created.
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select('id, order_num, total, payment_status')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        if (order.payment_status === 'paid' || order.payment_status === 'paid_unverified') {
            return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
        }

        const { order_num: orderNum, total } = order;

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const successUrl = `${origin}/order/${orderId}?payment=success`;
        const failUrl    = `${origin}/order/${orderId}?payment=failed`;

        let paymentUrl: string;
        switch (PROVIDER) {
            case 'yaadpay': paymentUrl = buildYaadPayUrl(orderId, orderNum, total, successUrl, failUrl); break;
            case 'hyp':     paymentUrl = buildHypUrl(orderId, orderNum, total, successUrl, failUrl); break;
            default:        paymentUrl = buildTranzilaUrl(orderId, orderNum, total, successUrl, failUrl);
        }

        // Mark order as payment_pending
        await supabaseAdmin.from('orders').update({ status: 'waiting', payment_status: 'pending' }).eq('id', orderId);

        return NextResponse.json({ paymentUrl });
    } catch (err: any) {
        console.error('[POST /api/payment/create]', err);
        return NextResponse.json({ error: err.message || 'Payment init failed' }, { status: 500 });
    }
}

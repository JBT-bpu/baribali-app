import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { paymentProvider } from '@/lib/payment';
import { settleLegacyOrder } from '@/lib/paymentOrderState';
import { loadSupabaseAdmin, supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

/*
  Payment webhook — called by Tranzila/YaadPay after payment completes.
  Marks order payment_status = 'paid_unverified' (not 'paid').

  IMPORTANT — no cryptographic signature verification: Tranzila does not issue
  a shared secret/HMAC in this project's current setup, only a terminal name.
  That means the amount-match and pending-only checks below block replay
  against a DIFFERENT order, but do NOT prove this specific payment really
  happened — a customer could POST here themselves with their own real
  orderId/amount. Hence 'paid_unverified': kitchen/cashier must visually
  confirm payment at pickup for these, exactly like 'pay_at_pickup' orders.
  Request a real transaction-verification credential from Tranzila support to
  close this gap for good.

  Configure in your payment provider dashboard:
    Tranzila → Terminal settings → Notification URL
    YaadPay  → Masof settings → Server notification URL
    URL: https://yourdomain.com/api/payment/webhook
*/

export async function POST(req: NextRequest) {
    const provider = paymentProvider();
    if (provider === 'hyp') {
        // Hyp's legacy notification payload is not documented publicly. Do not
        // interpret it as Tranzila and settle an order on guessed fields.
        return NextResponse.json({
            ok: false,
            error: 'Hyp notifications require the dedicated verified endpoint',
        }, { status: 409 });
    }

    if (supabaseConfigurationState() !== 'configured') {
        return supabaseConfigurationErrorResponse();
    }

    let admin;
    try {
        admin = await loadSupabaseAdmin();
    } catch (error) {
        console.error('[POST /api/payment/webhook] Admin client unavailable:', error);
        return supabaseConfigurationErrorResponse();
    }

    const body = await req.text();
    const params = new URLSearchParams(body);

    // Tranzila sends: Response=000 (success), orderId=BB-XXXX, sum=<amount>
    // YaadPay sends:  CCode=000 (success), Order=BB-XXXX, Price=<amount in agorot>
    let orderNum: string | null = null;
    let success = false;
    let reportedAmount: number | null = null;

    if (provider === 'yaadpay') {
        orderNum = params.get('Order');
        success = params.get('CCode') === '000';
        const price = params.get('Price');
        reportedAmount = price ? Number(price) / 100 : null;
    } else {
        // Tranzila
        orderNum = params.get('orderId') || params.get('remarks');
        success = params.get('Response') === '000';
        const sum = params.get('sum');
        reportedAmount = sum ? Number(sum) : null;
    }

    if (!orderNum) return NextResponse.json({ ok: false, error: 'No order number in webhook' });

    const { data: order, error } = await admin
        .from('orders')
        .select('id, total, payment_status')
        .eq('order_num', orderNum)
        .maybeSingle();

    if (error) {
        console.error('[POST /api/payment/webhook] Order lookup failed:', error.message);
        return new NextResponse('RETRY', { status: 503 });
    }
    if (!order) {
        return NextResponse.json({ ok: false, error: 'Unknown order' });
    }

    // A decline may claim only pending. A success may also correct failed: if
    // both callbacks race, an actual charge must win. Verified/unverified paid
    // states and non-hosted orders remain absorbing.
    if (
        order.payment_status !== 'pending'
        && !(success && order.payment_status === 'failed')
    ) {
        return new NextResponse('OK', { status: 200 });
    }

    // The reported amount must match what this order actually costs — blocks
    // tampering against a DIFFERENT order (not self-forgery against one's own,
    // see the comment above).
    if (success && (reportedAmount === null || Math.round(reportedAmount) !== Math.round(order.total))) {
        console.error('[POST /api/payment/webhook] Amount mismatch for', orderNum, ':', reportedAmount, 'vs', order.total);
        success = false;
    }

    const transition = await settleLegacyOrder(admin, {
        orderId: order.id,
        success,
    });
    if (transition.kind === 'error') {
        console.error('[POST /api/payment/webhook] Settlement update failed:', transition.message);
        return new NextResponse('RETRY', { status: 503 });
    }

    // The SELECT above can become stale before this UPDATE obtains the row
    // lock. PostgreSQL re-checks both filters after a concurrent writer wins;
    // zero returned rows therefore means a terminal state already replaced
    // `pending`. ACK the replay without overwriting that newer truth.
    if (transition.kind === 'stale') {
        return new NextResponse('OK', { status: 200 });
    }

    // Providers expect a plain 200 OK
    return new NextResponse('OK', { status: 200 });
}

// Some providers do a GET ping first
export async function GET() {
    if (paymentProvider() === 'hyp') {
        return NextResponse.json({
            ok: false,
            error: 'Hyp notifications are not configured on this endpoint',
        }, { status: 409 });
    }
    if (supabaseConfigurationState() !== 'configured') {
        return supabaseConfigurationErrorResponse();
    }
    try {
        await loadSupabaseAdmin();
    } catch (error) {
        console.error('[GET /api/payment/webhook] Admin client unavailable:', error);
        return supabaseConfigurationErrorResponse();
    }
    return new NextResponse('OK', { status: 200 });
}

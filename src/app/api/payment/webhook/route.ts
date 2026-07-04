import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/*
  Payment webhook — called by Tranzila/YaadPay after payment completes.
  Marks order payment_status = 'paid_unverified' (not 'paid') and status =
  'waiting' (ready for kitchen).

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
    const body = await req.text();
    const params = new URLSearchParams(body);

    // Tranzila sends: Response=000 (success), orderId=BB-XXXX, sum=<amount>
    // YaadPay sends:  CCode=000 (success), Order=BB-XXXX, Price=<amount in agorot>
    const provider = process.env.PAYMENT_PROVIDER ?? 'tranzila';

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

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('id, total, payment_status')
        .eq('order_num', orderNum)
        .single();

    if (error || !order) {
        return NextResponse.json({ ok: false, error: 'Unknown order' });
    }

    // Only transition orders still pending — blocks replay against an order
    // that's already been settled (paid_unverified, paid, or failed).
    if (order.payment_status !== 'pending') {
        return new NextResponse('OK', { status: 200 });
    }

    // The reported amount must match what this order actually costs — blocks
    // tampering against a DIFFERENT order (not self-forgery against one's own,
    // see the comment above).
    if (success && (reportedAmount === null || Math.round(reportedAmount) !== Math.round(order.total))) {
        console.error('[POST /api/payment/webhook] Amount mismatch for', orderNum, ':', reportedAmount, 'vs', order.total);
        success = false;
    }

    await supabaseAdmin
        .from('orders')
        .update({ payment_status: success ? 'paid_unverified' : 'failed' })
        .eq('order_num', orderNum);

    // Providers expect a plain 200 OK
    return new NextResponse('OK', { status: 200 });
}

// Some providers do a GET ping first
export async function GET() {
    return new NextResponse('OK', { status: 200 });
}

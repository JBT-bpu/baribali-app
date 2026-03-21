import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/*
  Payment webhook — called by Tranzila/YaadPay after payment completes.
  Marks order payment_status = 'paid' and status = 'waiting' (ready for kitchen).

  Configure in your payment provider dashboard:
    Tranzila → Terminal settings → Notification URL
    YaadPay  → Masof settings → Server notification URL
    URL: https://yourdomain.com/api/payment/webhook
*/

export async function POST(req: NextRequest) {
    const body = await req.text();
    const params = new URLSearchParams(body);

    // Tranzila sends: Response=000 (success), orderId=BB-XXXX
    // YaadPay sends:  CCode=000 (success), Order=BB-XXXX
    const provider = process.env.PAYMENT_PROVIDER ?? 'tranzila';

    let orderNum: string | null = null;
    let success = false;

    if (provider === 'yaadpay') {
        orderNum = params.get('Order');
        success = params.get('CCode') === '000';
    } else {
        // Tranzila
        orderNum = params.get('orderId') || params.get('remarks');
        success = params.get('Response') === '000';
    }

    if (!orderNum) return NextResponse.json({ ok: false, error: 'No order number in webhook' });

    if (success) {
        await supabaseAdmin
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('order_num', orderNum);
    } else {
        await supabaseAdmin
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('order_num', orderNum);
    }

    // Providers expect a plain 200 OK
    return new NextResponse('OK', { status: 200 });
}

// Some providers do a GET ping first
export async function GET() {
    return new NextResponse('OK', { status: 200 });
}

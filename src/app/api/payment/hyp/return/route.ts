import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHypPayment } from '@/lib/hypPay';

/*
  Configure this URL as the "success page" (and, per Hyp's own recommendation,
  leave the error page on their default so codes like 700/800 for postponed/
  two-phase transactions aren't misread as failures) in the Hyp Pay portal:
  Settings -> "Payment Page and API" -> "Post-transaction address".

  Hyp redirects the customer's browser here with query params (Id, CCode,
  Amount, Order, Sign, ...) after a transaction completes. Those params alone
  aren't proof of anything — anyone could hit this URL with fabricated
  values — so before trusting it, we call Hyp's VERIFY endpoint server-side
  with the same params and only trust CCode=0 from *that* response.
*/
export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const orderNum = params.get('Order');
    const origin = req.nextUrl.origin;

    if (!orderNum) {
        return NextResponse.redirect(`${origin}/`);
    }

    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, payment_status')
        .eq('order_num', orderNum)
        .single();

    if (!order) {
        return NextResponse.redirect(`${origin}/`);
    }

    // Only transition orders still pending — don't let a repeat/replayed hit
    // flip an order that's already been settled one way or the other.
    if (order.payment_status === 'pending') {
        const { verified } = await verifyHypPayment(params).catch(() => ({ verified: false, ccode: null }));
        await supabaseAdmin
            .from('orders')
            .update({ payment_status: verified ? 'paid' : 'failed' })
            .eq('id', order.id);
    }

    return NextResponse.redirect(`${origin}/order/${order.id}`);
}

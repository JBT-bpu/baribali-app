import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { computeOrderTotal } from '@/lib/pricing';
import { createDemoOrder } from '@/lib/demoStore';
import { enforceRateLimit } from '@/lib/rateLimit';
import { isPaymentConfigured } from '@/lib/payment';
import { findDiscount, discountAmount } from '@/lib/discounts';
import { getCustomerDiscount } from '@/lib/customerTags';

/**
 * If the request carries a valid Supabase access token, returns the
 * authenticated user's id — otherwise null (guest order). The token is
 * verified server-side; a client can't just claim a user_id.
 */
async function verifiedUserId(req: NextRequest): Promise<string | null> {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
    if (error || !data.user) return null;
    return data.user.id;
}

export async function POST(req: NextRequest) {
    // Blunt order-spam from a single source.
    const limited = enforceRateLimit(req, 'orders', 12, 60_000);
    if (limited) return limited;
    // Parsed separately so a malformed body reports as a client error rather
    // than a 500 (which reads as "our fault" in logs and to the caller).
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
    }

    try {
        const { items, total, pickupTime, notes, size, paymentChoice, discountCode } = body;

        if (!items || !Array.isArray(items) || total == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Recompute the true total server-side — never trust the client-submitted value.
        const computed = computeOrderTotal(items, size);
        if (!computed.valid) {
            return NextResponse.json({ error: 'Invalid order items or size' }, { status: 400 });
        }

        // Resolve the signed-in user up front (guests → null, no network call).
        // Needed here because a customer's standing "tag" discount is keyed to it.
        const userId = await verifiedUserId(req);

        // Apply the best available discount server-side (the client preview is UX
        // only). Two sources, never stacked — the customer gets whichever is
        // larger: a promo code they typed, or a standing discount assigned to
        // their account ("tag", e.g. an approved municipal worker's 10%).
        const typedDiscount = findDiscount(discountCode);
        const assignedDiscount = await getCustomerDiscount(userId);
        const typedAmount = discountAmount(computed.total, typedDiscount);
        const assignedAmount = discountAmount(computed.total, assignedDiscount);
        const discount = assignedAmount >= typedAmount ? assignedDiscount : typedDiscount;
        const discAmount = Math.max(assignedAmount, typedAmount);
        const finalTotal = computed.total - discAmount;

        if (finalTotal !== total) {
            console.error('[POST /api/orders] Price mismatch: client sent', total, 'server computed', finalTotal);
            return NextResponse.json({ error: 'Price mismatch' }, { status: 400 });
        }

        if (!isSupabaseConfigured()) {
            // Demo mode: no real gateway to redirect to, so the client already
            // resolved a payment choice up front — bake it straight into the
            // order instead of going through payment/create + a webhook.
            const paymentStatus =
                paymentChoice === 'now' ? 'paid' :
                paymentChoice === 'fail' ? 'failed' :
                'pay_at_pickup';
            const order = createDemoOrder({
                items,
                total: finalTotal,
                pickupTime,
                notes,
                size,
                paymentStatus,
            });
            return NextResponse.json({ id: order.id, orderNum: order.order_num, createdAt: order.created_at, demo: true, paymentFailed: paymentStatus === 'failed' });
        }

        // Generate order number: BB-XXXX (4-digit, time-seeded)
        const orderNum = `BB-${((Date.now() % 9000) + 1000)}`;

        // (Guest-first: `userId` was resolved above — null for guests, set only
        // from a verified session token, never client-claimed.)

        // Without a configured payment gateway there's no way to pay online, so
        // the order is pay-at-pickup and goes straight to the kitchen. With a
        // gateway it starts `pending` and the payment/webhook flow marks it
        // paid — until then it's correctly hidden from the board.
        const payAtPickup = !isPaymentConfigured();

        const { data, error } = await supabaseAdmin
            .from('orders')
            .insert({
                order_num: orderNum,
                items,
                total: finalTotal,
                pickup_time: pickupTime ?? null,
                notes: notes ?? null,
                size: size ?? null,
                status: 'waiting',
                payment_status: payAtPickup ? 'pay_at_pickup' : 'pending',
                user_id: userId,
                // Only reference the discount columns when a code was applied, so
                // regular orders keep working even if the migration hasn't run.
                ...(discount ? { discount_code: discount.code, discount_amount: discAmount } : {}),
            })
            .select('id, order_num, created_at')
            .single();

        if (error) {
            console.error('[POST /api/orders] DB error:', error.message);
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }

        return NextResponse.json({ id: data.id, orderNum: data.order_num, createdAt: data.created_at, payAtPickup });
    } catch (err) {
        console.error('[POST /api/orders]', err);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

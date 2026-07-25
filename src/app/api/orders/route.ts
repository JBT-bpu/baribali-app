import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { computeOrderTotal } from '@/lib/pricing';
import { createDemoOrder } from '@/lib/demoStore';
import { enforceRateLimit } from '@/lib/rateLimit';
import { isPaymentConfigured } from '@/lib/payment';

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
    try {
        const body = await req.json();
        const { items, total, pickupTime, notes, size, paymentChoice } = body;

        if (!items || !Array.isArray(items) || total == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Recompute the true total server-side — never trust the client-submitted value.
        const computed = computeOrderTotal(items, size);
        if (!computed.valid) {
            return NextResponse.json({ error: 'Invalid order items or size' }, { status: 400 });
        }
        if (computed.total !== total) {
            console.error('[POST /api/orders] Price mismatch: client sent', total, 'server computed', computed.total);
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
                total: computed.total,
                pickupTime,
                notes,
                size,
                paymentStatus,
            });
            return NextResponse.json({ id: order.id, orderNum: order.order_num, createdAt: order.created_at, demo: true, paymentFailed: paymentStatus === 'failed' });
        }

        // Generate order number: BB-XXXX (4-digit, time-seeded)
        const orderNum = `BB-${((Date.now() % 9000) + 1000)}`;

        // Guest-first: user_id is simply null for guests, set only when a
        // verified session token accompanies the request.
        const userId = await verifiedUserId(req);

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
                total: computed.total,
                pickup_time: pickupTime ?? null,
                notes: notes ?? null,
                size: size ?? null,
                status: 'waiting',
                payment_status: payAtPickup ? 'pay_at_pickup' : 'pending',
                user_id: userId,
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

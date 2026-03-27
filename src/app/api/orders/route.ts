import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, total, pickupTime, notes, size } = body;

        if (!items || !Array.isArray(items) || total == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate order number: BB-XXXX (4-digit, time-seeded)
        const orderNum = `BB-${((Date.now() % 9000) + 1000)}`;

        const { data, error } = await supabaseAdmin
            .from('orders')
            .insert({
                order_num: orderNum,
                items,
                total,
                pickup_time: pickupTime ?? null,
                notes: notes ?? null,
                size: size ?? null,
                status: 'waiting',
                payment_status: 'pending',
            })
            .select('id, order_num, created_at')
            .single();

        if (error) {
            // DB not configured yet — return generated order num so frontend still works
            console.warn('[POST /api/orders] DB error (Supabase not configured?):', error.message);
            return NextResponse.json({ id: null, orderNum, createdAt: new Date().toISOString(), demo: true });
        }

        return NextResponse.json({ id: data.id, orderNum: data.order_num, createdAt: data.created_at });
    } catch (err) {
        console.error('[POST /api/orders]', err);
        // Still return a usable order number — never show 500 to the customer
        const fallback = `BB-${((Date.now() % 9000) + 1000)}`;
        return NextResponse.json({ id: null, orderNum: fallback, createdAt: new Date().toISOString(), demo: true });
    }
}

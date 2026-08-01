import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getDemoOrder } from '@/lib/demoStore';

// Customer order-status lookup. The order's UUID id acts as the sole
// capability token (unguessable) — no extra secret needed, consistent with
// the anon-RLS-read policy this route replaces.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
        const order = getDemoOrder(id);
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        return NextResponse.json(order);
    }

    const { data, error } = await supabaseAdmin
        .from('orders')
        // payment_status is included so the customer can see whether anything is
        // still owed — with no gateway configured every order is pay-at-pickup,
        // and nothing on the status page said so. `size` (the base price paid)
        // is what tells them which bowl this ticket is for.
        .select('id, order_num, items, total, size, pickup_time, notes, status, payment_status, created_at')
        .eq('id', id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

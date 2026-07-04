import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Customer order-status lookup. The order's UUID id acts as the sole
// capability token (unguessable) — no extra secret needed, consistent with
// the anon-RLS-read policy this route replaces.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_num, items, total, pickup_time, notes, status, created_at')
        .eq('id', params.id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

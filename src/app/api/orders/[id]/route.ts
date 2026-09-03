import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { getDemoOrder } from '@/lib/demoStore';
import { loadSupabaseAdmin, supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

// Customer order-status lookup. The order's UUID id acts as the sole
// capability token (unguessable) — no extra secret needed, consistent with
// the anon-RLS-read policy this route replaces.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const configuration = supabaseConfigurationState();
    if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();
    if (configuration === 'demo') {
        const order = getDemoOrder(id);
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        return NextResponse.json(order);
    }

    let admin;
    try {
        admin = await loadSupabaseAdmin();
    } catch (error) {
        console.error('[GET /api/orders/:id] Admin client unavailable:', error);
        return supabaseConfigurationErrorResponse();
    }

    const { data, error } = await admin
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

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';
import { customerMap } from '@/lib/customerNames';
import { listDemoOrders } from '@/lib/demoStore';

export async function GET(req: NextRequest) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
        const demoStatuses = new Set(['paid', 'pay_at_pickup', 'paid_unverified']);
        const orders = listDemoOrders()
            .filter(o => o.status !== 'collected' && demoStatuses.has(o.payment_status))
            .sort((a, b) => (a.pickup_time ?? '').localeCompare(b.pickup_time ?? ''));
        return NextResponse.json(orders);
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0); // today only

    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', since.toISOString())
        .neq('status', 'collected')
        .in('payment_status', ['paid', 'pay_at_pickup', 'paid_unverified'])
        .order('pickup_time', { ascending: true });

    if (error) {
        console.error('[GET /api/kitchen/orders]', error.message);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Name for signed-in customers so staff can call them by name at handover.
    // Cached per user id, so this costs nothing on the board's 4s poll; guests
    // simply have no user and stay null.
    const orders = data ?? [];
    const names = await customerMap(orders.map(o => o.user_id));
    return NextResponse.json(
        orders.map(o => ({ ...o, customer_name: o.user_id ? names[o.user_id]?.name ?? null : null })),
    );
}

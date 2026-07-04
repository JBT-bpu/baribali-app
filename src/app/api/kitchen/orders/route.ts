import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';

export async function GET(req: NextRequest) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json(data ?? []);
}

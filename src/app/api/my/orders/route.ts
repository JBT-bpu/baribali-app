import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Order history for the signed-in user — the tangible "account as a benefit."
 * Requires a valid Supabase access token; the token itself is the proof of
 * identity (verified server-side), so a user can only ever see their own
 * orders. Guests have no history by definition.
 */
export async function GET(req: NextRequest) {
    if (!isSupabaseConfigured()) {
        return NextResponse.json({ error: 'Not available in demo mode' }, { status: 503 });
    }

    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(auth.slice(7));
    if (userError || !userData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_num, items, total, pickup_time, status, payment_status, created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('[GET /api/my/orders]', error.message);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}

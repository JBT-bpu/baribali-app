import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';

const VALID_STATUSES = ['waiting', 'preparing', 'ready', 'collected'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const { status } = await req.json();

        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[PATCH /api/orders/:id/status]', err);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

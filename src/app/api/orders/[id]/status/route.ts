import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const VALID_STATUSES = ['waiting', 'preparing', 'ready', 'collected'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { status } = await req.json();

        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ status })
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[PATCH /api/orders/:id/status]', err);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

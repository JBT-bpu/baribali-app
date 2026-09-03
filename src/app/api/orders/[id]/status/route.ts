import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';
import { updateDemoOrderStatus, type OrderStatus } from '@/lib/demoStore';
import { loadSupabaseAdmin, supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

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

        const configuration = supabaseConfigurationState();
        if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();
        if (configuration === 'demo') {
            const order = updateDemoOrderStatus(id, status as OrderStatus);
            if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            return NextResponse.json({ ok: true });
        }

        let admin;
        try {
            admin = await loadSupabaseAdmin();
        } catch (error) {
            console.error('[PATCH /api/orders/:id/status] Admin client unavailable:', error);
            return supabaseConfigurationErrorResponse();
        }

        const { data, error } = await admin
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        // Supabase UPDATE is not an error when its filter matches zero rows.
        // Treat that the same as the demo store so the kitchen cannot keep a
        // locally restored/updated ticket that no longer exists on the server.
        if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[PATCH /api/orders/:id/status]', err);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

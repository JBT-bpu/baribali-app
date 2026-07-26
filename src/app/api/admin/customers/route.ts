import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { getCustomerTagMap } from '@/lib/customerTags';

// Read-only customer/orders view for the manager admin. Aggregates the orders
// table (live Supabase data — the one part that can't be config-in-code).
export async function GET(req: NextRequest) {
    if (!isAdminAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSupabaseConfigured()) {
        return NextResponse.json({ error: 'Not available in demo mode' }, { status: 503 });
    }

    const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('user_id, total, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);

    if (error) {
        console.error('[GET /api/admin/customers]', error.message);
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    interface Agg { userId: string; orders: number; total: number; last: string }
    const byUser = new Map<string, Agg>();
    let guestCount = 0, guestTotal = 0;
    for (const o of orders ?? []) {
        if (!o.user_id) { guestCount++; guestTotal += o.total || 0; continue; }
        const cur = byUser.get(o.user_id) ?? { userId: o.user_id, orders: 0, total: 0, last: o.created_at };
        cur.orders++;
        cur.total += o.total || 0;
        if (o.created_at > cur.last) cur.last = o.created_at;
        byUser.set(o.user_id, cur);
    }

    // Each customer's current standing-discount tag, if any (one query).
    const tagMap = await getCustomerTagMap([...byUser.keys()]);

    // Resolve names/emails for the (bounded) set of signed-in customers.
    const customers = [];
    for (const c of byUser.values()) {
        let email: string | null = null, name: string | null = null;
        try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(c.userId);
            email = data.user?.email ?? null;
            const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
            name = (meta.full_name as string) ?? (meta.name as string) ?? null;
        } catch { /* user may have been deleted — leave blank */ }
        customers.push({ ...c, email, name, discountCode: tagMap[c.userId] ?? null });
    }
    customers.sort((a, b) => b.total - a.total);

    return NextResponse.json({ customers, guests: { count: guestCount, total: guestTotal } });
}

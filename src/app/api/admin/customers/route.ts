import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { getCustomerTagMap } from '@/lib/customerTags';
import { customerMap } from '@/lib/customerNames';

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

    // Names/emails for the signed-in customers, through the shared cache (this
    // used to be an uncached getUserById per customer on every request).
    const people = await customerMap([...byUser.keys()]);
    const customers = [...byUser.values()].map(c => ({
        ...c,
        email: people[c.userId]?.email ?? null,
        name: people[c.userId]?.name ?? null,
        discountCode: tagMap[c.userId] ?? null,
    }));
    customers.sort((a, b) => b.total - a.total);

    return NextResponse.json({ customers, guests: { count: guestCount, total: guestTotal } });
}

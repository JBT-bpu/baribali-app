import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';
import { STEPS } from '@/data/salad-data.js';
import { effectiveItemPrice, effectiveSizePrice } from '@/lib/menuConfig';

/**
 * Test orders for rehearsing the kitchen board (the chime, a tab appearing, the
 * accept screen, the focus rule) without anyone actually ordering food.
 *
 * Every simulated order is numbered `SIM-####` instead of `BB-####`, so it is
 * unmistakable on the board and can be removed in one sweep — a test order that
 * looks exactly like a real one is worse than no test order at all.
 *
 * Staff-authorised like the rest of the kitchen API. The board only exposes the
 * button behind ?sim=1 so it can't be hit by accident mid-service.
 */

interface CatItem { id: string; he: string; icon: string; price: number }
interface CatSub { items: CatItem[] }
interface CatStep { id?: string; subgroups: CatSub[] }

const NOTES = [
    null,
    'בלי בצל',
    'אלרגיה לאגוזים',
    'להפריד את הרוטב',
    'לחתוך דק',
];

function itemsOfStep(stepId: string): CatItem[] {
    const step = (STEPS as CatStep[]).find(s => s.id === stepId);
    return step ? step.subgroups.flatMap(sg => sg.items) : [];
}

function pick<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length) {
        out.push(...copy.splice(Math.floor(Math.random() * copy.length), 1));
    }
    return out;
}

/** A plausible salad: a handful of veg, a protein, a sauce, sometimes a finish. */
function buildOrder() {
    const chosen = [
        ...pick(itemsOfStep('veggies'), 3 + Math.floor(Math.random() * 5)),
        ...pick(itemsOfStep('protein'), 1),
        ...pick(itemsOfStep('sauces'), 1 + Math.floor(Math.random() * 2)),
        ...(Math.random() < 0.5 ? pick(itemsOfStep('finish'), 1) : []),
    ];
    const items = chosen.map(i => ({
        id: i.id,
        he: i.he,
        icon: i.icon,
        price: effectiveItemPrice(i.id, i.price ?? 0),
    }));

    const ml = [750, 1000, 1500][Math.floor(Math.random() * 3)];
    const base = effectiveSizePrice(ml);
    const total = items.reduce((s, i) => s + i.price, base);

    // Pickup a few minutes out, on the 5-minute grid the app offers.
    const at = new Date(Date.now() + (5 + Math.floor(Math.random() * 6) * 5) * 60000);
    at.setMinutes(Math.round(at.getMinutes() / 5) * 5, 0, 0);
    const pickup = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;

    return {
        order_num: `SIM-${1000 + Math.floor(Math.random() * 9000)}`,
        items,
        total,
        pickup_time: pickup,
        notes: NOTES[Math.floor(Math.random() * NOTES.length)],
        size: String(base),
        status: 'waiting',
        payment_status: 'pay_at_pickup',
        user_id: null,
    };
}

export async function POST(req: NextRequest) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSupabaseConfigured()) {
        return NextResponse.json({ error: 'Simulation needs a real database' }, { status: 503 });
    }

    const { data, error } = await supabaseAdmin
        .from('orders')
        .insert(buildOrder())
        .select('id, order_num')
        .single();

    if (error) {
        console.error('[POST /api/kitchen/simulate]', error.message);
        return NextResponse.json({ error: 'Failed to create simulated order' }, { status: 500 });
    }
    return NextResponse.json({ id: data.id, orderNum: data.order_num });
}

/** Removes every simulated order — never touches a real `BB-` order. */
export async function DELETE(req: NextRequest) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSupabaseConfigured()) {
        return NextResponse.json({ error: 'Simulation needs a real database' }, { status: 503 });
    }

    const { data, error } = await supabaseAdmin
        .from('orders')
        .delete()
        .like('order_num', 'SIM-%')
        .select('id');

    if (error) {
        console.error('[DELETE /api/kitchen/simulate]', error.message);
        return NextResponse.json({ error: 'Failed to clear simulated orders' }, { status: 500 });
    }
    return NextResponse.json({ removed: data?.length ?? 0 });
}

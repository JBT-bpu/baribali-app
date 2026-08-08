import { NextRequest, NextResponse } from 'next/server';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';
import { readShopState, writeShopState } from '@/lib/shopState';
import { shopStatus, type ShopOverride } from '@/lib/shopHours';

/**
 * Is the shop open, and the staff control for saying otherwise.
 *
 * GET is public and unauthenticated on purpose — the landing page and the
 * builder both need it before anyone has identified themselves, and it reveals
 * nothing a customer could not learn by reading the door.
 *
 * PATCH is kitchen-authorised, like every other staff action.
 */

// Never cached: the whole point of the override is that it takes effect now.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const state = await readShopState();
    const status = shopStatus(new Date(), state.override, state.note);
    return NextResponse.json(
        { ...status, override: state.override, storeAvailable: state.available },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}

export async function PATCH(req: NextRequest) {
    if (!isKitchenAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

    const raw = (body as { override?: unknown })?.override;
    // Three valid values, and 'null' arrives as a real null from JSON.
    if (raw !== null && raw !== 'open' && raw !== 'closed') {
        return NextResponse.json({ error: "override must be 'open', 'closed' or null" }, { status: 400 });
    }
    const override = raw as ShopOverride;

    const rawNote = (body as { note?: unknown })?.note;
    const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim().slice(0, 120) : null;

    const written = await writeShopState(override, note);
    if (!written) {
        // Told plainly rather than silently ignored: staff who tap "closed" and
        // get no error will assume the shop is closed and walk away.
        return NextResponse.json(
            { error: 'shop_state is unavailable — run supabase/001_shop_state.sql' },
            { status: 503 },
        );
    }

    const status = shopStatus(new Date(), override, note);
    return NextResponse.json({ ...status, override }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextRequest, NextResponse } from 'next/server';
import { isKitchenAuthorized } from '@/lib/kitchenAuth';
import { readShopState, writeShopState } from '@/lib/shopState';
import { shopOverrideForTargetOpen, shopStatus, type ShopOverride } from '@/lib/shopHours';

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

    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const now = new Date();
    let override: ShopOverride;
    if (payload.targetOpen !== undefined) {
        if (typeof payload.targetOpen !== 'boolean') {
            return NextResponse.json({ error: 'targetOpen must be boolean' }, { status: 400 });
        }
        // Resolve the staff's desired visible state NOW, not from the board's
        // potentially stale poll just before an opening-hours boundary.
        override = shopOverrideForTargetOpen(shopStatus(now), payload.targetOpen);
    } else {
        const raw = payload.override;
        // Backward-compatible direct override for maintenance callers.
        if (raw !== null && raw !== 'open' && raw !== 'closed') {
            return NextResponse.json({ error: "override must be 'open', 'closed' or null" }, { status: 400 });
        }
        override = raw as ShopOverride;
    }

    const rawNote = payload.note;
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

    const status = shopStatus(now, override, note);
    return NextResponse.json({ ...status, override }, { headers: { 'Cache-Control': 'no-store' } });
}

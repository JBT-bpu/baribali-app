import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
    CustomerDiscountLookupError,
    getCustomerDiscount,
} from '@/lib/customerTags';
import type { Discount } from '@/lib/discounts';
import { enforceRateLimit } from '@/lib/rateLimit';

function discountUnavailable() {
    return NextResponse.json({
        error: 'Customer discount is temporarily unavailable',
        code: 'CUSTOMER_DISCOUNT_UNAVAILABLE',
    }, { status: 503 });
}

/**
 * A signed-in customer's own standing discount (their assigned "tag"), if any.
 * Keyed to the verified access token — a caller only ever sees their own tag,
 * never anyone else's. The checkout calls this to preview the auto-applied
 * discount so the shown total matches what the server will charge; the server
 * (/api/orders) re-derives and applies it independently regardless.
 *
 * Guests (no token) simply get { discount: null }.
 */
export async function GET(req: NextRequest) {
    const limited = enforceRateLimit(req, 'my-discount', 30, 60_000);
    if (limited) return limited;

    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ discount: null });
    if (!isSupabaseConfigured()) return NextResponse.json({ discount: null });

    let admin;
    try {
        // Never let this endpoint silently use the anon fallback: RLS would
        // turn an entitled customer's row into an indistinguishable no-tag.
        const { getSupabaseAdmin } = await import('@/lib/serverSupabase');
        admin = getSupabaseAdmin();
    } catch (error) {
        console.error('[GET /api/my/discount] Admin client unavailable:', error);
        return discountUnavailable();
    }

    const { data, error } = await admin.auth.getUser(auth.slice(7));
    if (error || !data.user) return NextResponse.json({ discount: null });

    let d: Discount | null;
    try {
        d = await getCustomerDiscount(data.user.id, admin);
    } catch (lookupError) {
        console.error(
            '[GET /api/my/discount] Customer discount lookup failed:',
            lookupError instanceof CustomerDiscountLookupError
                ? lookupError.code
                : 'unexpected error',
        );
        return discountUnavailable();
    }
    if (!d) return NextResponse.json({ discount: null });
    // Only what the client needs to render + mirror the calc — not internal fields.
    return NextResponse.json({ discount: { code: d.code, type: d.type, value: d.value, note: d.note ?? null } });
}

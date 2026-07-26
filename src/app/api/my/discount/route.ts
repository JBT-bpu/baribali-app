import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCustomerDiscount } from '@/lib/customerTags';
import { enforceRateLimit } from '@/lib/rateLimit';

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

    const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
    if (error || !data.user) return NextResponse.json({ discount: null });

    const d = await getCustomerDiscount(data.user.id);
    if (!d) return NextResponse.json({ discount: null });
    // Only what the client needs to render + mirror the calc — not internal fields.
    return NextResponse.json({ discount: { code: d.code, type: d.type, value: d.value, note: d.note ?? null } });
}

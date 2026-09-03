import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { listDemoPickupAllocations } from '@/lib/demoStore';
import { PICKUP_SLOT_CAPACITY } from '@/lib/pickupCapacity';
import { enforceRateLimit } from '@/lib/rateLimit';
import { pickupSlots, shopDateKey } from '@/lib/shopHours';
import { loadSupabaseAdmin, supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * This route used to carry its own opening hours — Saturday closed, Friday
 * until 16:00, everything bounded by a CLOSING_HOUR of 21:00 — none of which
 * matched the shop's actual schedule after it moved to five days, 9:00-16:00.
 * It went stale silently because the customer's slot list is built from
 * lib/shopHours and this endpoint only supplies the per-slot capacity counts,
 * merged by id: extra slots were ignored and missing ones defaulted to
 * available, so nothing looked wrong.
 *
 * That is precisely how the original mess happened — several copies of the
 * hours in different files, drifting apart, with no single one authoritative.
 * The times now come from pickupSlots, the same function the customer's picker
 * and POST /api/orders both use.
 */

export async function GET(req: NextRequest) {
    // Generous — this is polled during checkout — but still bounded.
    const limited = enforceRateLimit(req, 'slots', 40, 60_000);
    if (limited) return limited;

    const configuration = supabaseConfigurationState();
    if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();

    let admin = null;
    if (configuration === 'configured') {
        try {
            admin = await loadSupabaseAdmin();
        } catch (error) {
            console.error('[GET /api/slots] Admin client unavailable:', error);
            return supabaseConfigurationErrorResponse();
        }
    }

    const now = new Date();
    const offered = pickupSlots(now);
    const slotTimes = offered.map(s => s.id);
    const serviceDate = shopDateKey(now);

    if (slotTimes.length === 0) {
        return NextResponse.json({ slots: [], closed: true, serviceDate }, { headers: NO_STORE_HEADERS });
    }

    let existing: { pickup_time: string | null }[] = [];
    if (configuration === 'demo') {
        existing = listDemoPickupAllocations()
            .filter(allocation => (
                allocation.serviceDate === serviceDate
                && slotTimes.includes(allocation.pickupTime)
            ))
            .map(allocation => ({ pickup_time: allocation.pickupTime }));
    } else {
        const { data, error } = await admin!
            .from('order_pickup_allocations')
            .select('pickup_time')
            .eq('service_date', serviceDate)
            .in('pickup_time', slotTimes);
        if (error) {
            console.error('[GET /api/slots] Capacity query failed:', error.message);
            return NextResponse.json({
                error: 'Pickup capacity is temporarily unavailable',
                code: 'SLOT_CAPACITY_UNAVAILABLE',
            }, { status: 503, headers: NO_STORE_HEADERS });
        }
        existing = data ?? [];
    }

    // Count per slot
    const counts: Record<string, number> = {};
    existing.forEach(o => {
        if (o.pickup_time) counts[o.pickup_time] = (counts[o.pickup_time] || 0) + 1;
    });

    const slots = offered.map(({ id: time, isPeak }) => {
        const booked = counts[time] || 0;
        return {
            time,
            booked,
            available: Math.max(0, PICKUP_SLOT_CAPACITY - booked),
            full: booked >= PICKUP_SLOT_CAPACITY,
            isPeak,
        };
    });

    return NextResponse.json({ slots, closed: false, serviceDate }, { headers: NO_STORE_HEADERS });
}

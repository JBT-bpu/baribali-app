import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { listDemoOrders } from '@/lib/demoStore';
import { enforceRateLimit } from '@/lib/rateLimit';
import { pickupSlots, SHOP_TZ } from '@/lib/shopHours';

const SLOT_CAPACITY = 5;      // max orders per slot
const TIMEZONE = SHOP_TZ;

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Server runs in UTC on Vercel, but the shop's business hours are Israel-local —
// derive weekday/hour/minute via Intl instead of the server's own clock, so
// this stays correct (and DST-safe) regardless of deploy region.
function getIsraelDateParts(date: Date): { weekday: number; hour: number; minute: number; year: number; month: number; day: number } {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        weekday: 'short',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const map: Record<string, string> = {};
    for (const part of fmt.formatToParts(date)) map[part.type] = part.value;
    return {
        weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
        hour: Number(map.hour) % 24, // Intl can return "24" for midnight
        minute: Number(map.minute),
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
    };
}

// The UTC instant corresponding to 00:00:00 Israel-local time on the day `date` falls on.
function getIsraelMidnightUTC(date: Date): Date {
    const { year, month, day } = getIsraelDateParts(date);
    const guessUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const { hour, minute } = getIsraelDateParts(guessUTC); // Israel clock reading at UTC midnight (offset)
    return new Date(guessUTC.getTime() - (hour * 60 + minute) * 60000);
}

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

    const now = new Date();
    const offered = pickupSlots(now);
    const slotTimes = offered.map(s => s.id);

    if (slotTimes.length === 0) {
        return NextResponse.json({ slots: [], closed: true });
    }

    // Count existing orders per pickup_time slot for today (Israel-local "today").
    const today = getIsraelMidnightUTC(now);

    let existing: { pickup_time: string | null }[] = [];
    if (!isSupabaseConfigured()) {
        existing = listDemoOrders()
            .filter(o => o.status !== 'collected' && o.created_at >= today.toISOString() && o.pickup_time && slotTimes.includes(o.pickup_time))
            .map(o => ({ pickup_time: o.pickup_time }));
    } else {
        const { data } = await supabaseAdmin
            .from('orders')
            .select('pickup_time')
            .gte('created_at', today.toISOString())
            .neq('status', 'collected')
            .in('pickup_time', slotTimes);
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
            available: SLOT_CAPACITY - booked,
            full: booked >= SLOT_CAPACITY,
            isPeak,
        };
    });

    return NextResponse.json({ slots, closed: false });
}

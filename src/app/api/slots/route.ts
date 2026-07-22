import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { listDemoOrders } from '@/lib/demoStore';
import { enforceRateLimit } from '@/lib/rateLimit';

const SLOT_CAPACITY = 5;      // max orders per slot
const SLOT_MINUTES = 5;       // slot size in minutes
const LEAD_MINUTES_NORMAL = 15;
const LEAD_MINUTES_PEAK = 25;
const SLOTS_TO_SHOW = 12;
const CLOSING_HOUR = 21;
const TIMEZONE = 'Asia/Jerusalem';

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

function isPeakHour(h: number, m: number) {
    return (h === 11 && m >= 45) || h === 12 || h === 13 || (h === 14 && m <= 30);
}

function generateSlotTimes(fromDate: Date): string[] {
    const { weekday: day, hour: h, minute: m } = getIsraelDateParts(fromDate);

    if (day === 6) return [];
    if (day === 5 && h >= 16) return [];

    const lead = isPeakHour(h, m) ? LEAD_MINUTES_PEAK : LEAD_MINUTES_NORMAL;
    const firstMin = Math.ceil((h * 60 + m + lead) / SLOT_MINUTES) * SLOT_MINUTES;

    const slots: string[] = [];
    for (let i = 0; i < SLOTS_TO_SHOW; i++) {
        const totalMins = firstMin + i * SLOT_MINUTES;
        const sh = Math.floor(totalMins / 60);
        const sm = totalMins % 60;
        if (sh >= CLOSING_HOUR) break;
        if (day === 5 && sh >= 16) break;
        slots.push(`${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
    }
    return slots;
}

export async function GET(req: NextRequest) {
    // Generous — this is polled during checkout — but still bounded.
    const limited = enforceRateLimit(req, 'slots', 40, 60_000);
    if (limited) return limited;

    const now = new Date();
    const slotTimes = generateSlotTimes(now);

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

    const slots = slotTimes.map(time => {
        const booked = counts[time] || 0;
        const isPeak = (() => {
            const [sh, sm] = time.split(':').map(Number);
            return isPeakHour(sh, sm);
        })();
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

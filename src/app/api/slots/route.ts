import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SLOT_CAPACITY = 5;      // max orders per slot
const SLOT_MINUTES = 5;       // slot size in minutes
const LEAD_MINUTES_NORMAL = 15;
const LEAD_MINUTES_PEAK = 25;
const SLOTS_TO_SHOW = 12;
const CLOSING_HOUR = 21;

function isPeakHour(h: number, m: number) {
    return (h === 11 && m >= 45) || h === 12 || h === 13 || (h === 14 && m <= 30);
}

function generateSlotTimes(fromDate: Date): string[] {
    const day = fromDate.getDay();
    const h = fromDate.getHours();
    const m = fromDate.getMinutes();

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

export async function GET(_req: NextRequest) {
    const now = new Date();
    const slotTimes = generateSlotTimes(now);

    if (slotTimes.length === 0) {
        return NextResponse.json({ slots: [], closed: true });
    }

    // Count existing orders per pickup_time slot for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('pickup_time')
        .gte('created_at', today.toISOString())
        .neq('status', 'collected')
        .in('pickup_time', slotTimes);

    // Count per slot
    const counts: Record<string, number> = {};
    (existing ?? []).forEach(o => {
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

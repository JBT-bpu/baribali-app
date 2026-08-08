/**
 * When the shop is open, and whether it is open right now.
 *
 * TWO SEPARATE THINGS, deliberately:
 *
 *  - SCHEDULE — the regular week. Config in code, like menu prices: it changes
 *    rarely, and a deploy is an acceptable price for changing it.
 *  - OVERRIDE — "we are closed right now". A sick day, a delivery that did not
 *    arrive, closing early. This CANNOT be config in code: a shop that has run
 *    out of chicken at 11am needs the button to work at 11am, not after a build.
 *    It lives in a database row and is toggled from the kitchen board.
 *
 * The pure functions here are the single source of truth. They are used by the
 * pickup-slot generator on the customer side AND by the order endpoint on the
 * server, which is the part that matters: until now `pickup_time` went from the
 * request body straight into the database with no validation whatsoever, so an
 * order could be placed at 3am, for 4am, and would appear on the kitchen board.
 * Opening hours are worth nothing if only the UI believes in them.
 *
 * Plain .ts with no imports so both sides — and the assertion harness — can use
 * it. Times are local shop time, which is the server's timezone on Vercel and
 * the browser's on the client; the app has always assumed Israel for both.
 */

/** Minutes from midnight. 9:00 -> 540. */
export type Minutes = number;

export interface DayHours {
    /** null = closed all day. */
    open: Minutes | null;
    close: Minutes | null;
}

export const hm = (h: number, m = 0): Minutes => h * 60 + m;

/** "09:00" -> 540. Returns null for anything that is not HH:MM. */
export function parseHHMM(value: string | null | undefined): Minutes | null {
    if (!value) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return hm(h, m);
}

export const toHHMM = (mins: Minutes): string =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/**
 * The regular week. 0 = Sunday … 6 = Saturday.
 *
 * Default 9:00–16:00, which is what the owner asked for. Friday closes early
 * and Saturday is closed — the previous rules, which were buried as magic
 * numbers inside the pickup-slot generator in a view component (`day === 6`,
 * `h >= 16`, `sh >= 21`, three different constants that had to agree).
 */
export const WEEK: Record<number, DayHours> = {
    0: { open: hm(9), close: hm(16) },   // Sunday
    1: { open: hm(9), close: hm(16) },
    2: { open: hm(9), close: hm(16) },
    3: { open: hm(9), close: hm(16) },
    4: { open: hm(9), close: hm(16) },
    5: { open: hm(9), close: hm(14) },   // Friday — early close before Shabbat
    6: { open: null, close: null },      // Saturday — closed
};

/**
 * How long before a pickup slot the kitchen needs, in minutes. The last slot of
 * the day is this far before closing, so nobody orders food that cannot be made
 * before the shutters come down.
 */
export const LEAD_NORMAL = 15;
export const LEAD_PEAK = 25;

/** Lunch rush — longer lead time. */
export function isPeak(mins: Minutes): boolean {
    return mins >= hm(11, 45) && mins <= hm(14, 30);
}

export function hoursFor(day: number): DayHours {
    return WEEK[day] ?? { open: null, close: null };
}

/** Is `mins` inside the day's opening hours? */
export function withinHours(day: number, mins: Minutes): boolean {
    const { open, close } = hoursFor(day);
    if (open === null || close === null) return false;
    return mins >= open && mins <= close;
}

/**
 * Every pickup slot still orderable at `now`, on the 5-minute grid.
 *
 * Replaces the generator that lived inside SummaryView. Same shape of result,
 * but the hours come from WEEK instead of from four hard-coded comparisons, and
 * the last slot is bounded by CLOSING rather than by a separate 21:00 constant
 * that no longer had anything to do with the shop's actual hours.
 */
export function pickupSlots(now: Date): { id: string; label: string; isPeak: boolean }[] {
    const day = now.getDay();
    const { open, close } = hoursFor(day);
    if (open === null || close === null) return [];

    const nowMins = hm(now.getHours(), now.getMinutes());
    const lead = isPeak(nowMins) ? LEAD_PEAK : LEAD_NORMAL;
    // Round up to the next 5-minute mark, and never earlier than opening.
    const first = Math.max(open, Math.ceil((nowMins + lead) / 5) * 5);

    const slots: { id: string; label: string; isPeak: boolean }[] = [];
    for (let t = first; t <= close && slots.length < 12; t += 5) {
        const label = toHHMM(t);
        slots.push({ id: label, label, isPeak: isPeak(t) });
    }
    return slots;
}

// ─── The live override ───────────────────────────────────────

/**
 * `closed` and `open` both mean "ignore the schedule". `null` means follow it.
 *
 * `open` exists so staff can stay late or open early without a deploy — the
 * mirror of closing early, and the case people forget to build.
 */
export type ShopOverride = 'open' | 'closed' | null;

export interface ShopStatus {
    open: boolean;
    /** Why — so the UI can say something true rather than just "closed". */
    reason: 'open' | 'override_open' | 'override_closed' | 'closed_day' | 'before_open' | 'after_close';
    note: string | null;
    /** Today's scheduled window, for "we open at 9:00" messages. */
    opensAt: string | null;
    closesAt: string | null;
}

/** Schedule + override, resolved. Pure, so both sides and the harness agree. */
export function shopStatus(now: Date, override: ShopOverride = null, note: string | null = null): ShopStatus {
    const day = now.getDay();
    const { open, close } = hoursFor(day);
    const opensAt = open === null ? null : toHHMM(open);
    const closesAt = close === null ? null : toHHMM(close);

    // The override wins in both directions — that is the entire point of it.
    if (override === 'closed') return { open: false, reason: 'override_closed', note, opensAt, closesAt };
    if (override === 'open') return { open: true, reason: 'override_open', note, opensAt, closesAt };

    if (open === null || close === null) return { open: false, reason: 'closed_day', note, opensAt, closesAt };

    const nowMins = hm(now.getHours(), now.getMinutes());
    if (nowMins < open) return { open: false, reason: 'before_open', note, opensAt, closesAt };
    if (nowMins > close) return { open: false, reason: 'after_close', note, opensAt, closesAt };
    return { open: true, reason: 'open', note, opensAt, closesAt };
}

/**
 * When the shop next opens: how many days ahead, and at what time.
 *
 * Exists because the closed message used to be the fixed string "נפתח מחדש ביום
 * ראשון" — which is true on a Saturday and wrong every other time it appeared.
 * At 08:00 on a Monday the shop reopens in an hour, not in six days.
 *
 * Returns null only if no day of the week has hours at all.
 */
export function nextOpen(now: Date): { inDays: number; day: number; at: Minutes } | null {
    const today = now.getDay();
    const nowMins = hm(now.getHours(), now.getMinutes());

    for (let ahead = 0; ahead <= 7; ahead++) {
        const day = (today + ahead) % 7;
        const { open, close } = hoursFor(day);
        if (open === null || close === null) continue;
        // Today only counts if opening has not already passed.
        if (ahead === 0 && nowMins >= open) continue;
        return { inDays: ahead, day, at: open };
    }
    return null;
}

/**
 * Whether an order for `pickup` may be accepted at `now`.
 *
 * The server's check. Deliberately a little more permissive than the slot list:
 * a customer who loaded the page at 15:50 and pays at 15:56 should not have
 * their order rejected because the slot list moved on. What it will not accept
 * is a pickup outside opening hours, on a closed day, or in the past.
 */
export const LATE_SUBMIT_GRACE = 10;

export type PickupRejection = 'closed_day' | 'outside_hours' | 'in_the_past' | 'malformed';

export function checkPickup(pickup: string | null | undefined, now: Date): PickupRejection | null {
    // No pickup time is allowed — some flows leave it unset and the kitchen
    // shows "ללא שעת איסוף". This function is about times that ARE given.
    if (pickup === null || pickup === undefined || pickup === '') return null;

    const mins = parseHHMM(pickup);
    if (mins === null) return 'malformed';

    const day = now.getDay();
    const { open, close } = hoursFor(day);
    if (open === null || close === null) return 'closed_day';
    if (mins < open || mins > close) return 'outside_hours';

    const nowMins = hm(now.getHours(), now.getMinutes());
    if (mins < nowMins - LATE_SUBMIT_GRACE) return 'in_the_past';

    return null;
}

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
 * it.
 *
 * ALL TIMES ARE ISRAEL LOCAL, DERIVED EXPLICITLY — never read off whatever
 * clock the code happens to be running on. This file originally used
 * `now.getDay()` / `now.getHours()`, with a comment claiming that was Israel
 * time on both sides. It is not:
 *
 *   - On Vercel the server runs in UTC, three hours behind Israel in summer.
 *     The shop would have refused every order between 09:00 and 12:00 Israel
 *     (the server still reading "before 09:00") and accepted them until 19:00
 *     (the server still reading "before 16:00"). src/app/api/slots/route.ts had
 *     already hit this and converts via Intl — the warning was sitting in the
 *     next file over.
 *   - In the browser it is the customer's own timezone, so a phone set to
 *     London showed Israeli opening hours on a London clock.
 *
 * Deriving the shop's timezone on both sides also makes them agree by
 * construction, which is the property that matters: the slot list the customer
 * picks from and the check the server applies can no longer drift apart.
 */

export const SHOP_TZ = 'Asia/Jerusalem';

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * The weekday and minute-of-day it is *in the shop*, whatever clock the caller
 * is on. Intl carries the DST rules, so this stays right across the October and
 * March switches without a table to maintain.
 */
export function shopParts(date: Date): { day: number; mins: Minutes } {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: SHOP_TZ,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const map: Record<string, string> = {};
    for (const part of fmt.formatToParts(date)) map[part.type] = part.value;
    return {
        day: WEEKDAY_INDEX[map.weekday] ?? 0,
        // Intl can report midnight as "24" rather than "00".
        mins: hm(Number(map.hour) % 24, Number(map.minute)),
    };
}

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
    const { day, mins: nowMins } = shopParts(now);
    const { open, close } = hoursFor(day);
    if (open === null || close === null) return [];

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
    const { day, mins: nowMins } = shopParts(now);
    const { open, close } = hoursFor(day);
    const opensAt = open === null ? null : toHHMM(open);
    const closesAt = close === null ? null : toHHMM(close);

    // The override wins in both directions — that is the entire point of it.
    if (override === 'closed') return { open: false, reason: 'override_closed', note, opensAt, closesAt };
    if (override === 'open') return { open: true, reason: 'override_open', note, opensAt, closesAt };

    if (open === null || close === null) return { open: false, reason: 'closed_day', note, opensAt, closesAt };

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
    const { day: today, mins: nowMins } = shopParts(now);

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

// ─── Saying it in words ──────────────────────────────────────

/**
 * The closed message lives here, next to the state it describes, rather than in
 * whichever component happens to show it. It was previously a local function in
 * SummaryView, which meant the landing page had no way to say the same thing and
 * the harness had no way to check it. It is derived purely from the status and
 * the clock, so it can be asserted like anything else here.
 */
export const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** Just the "when we open again" half. Null when no day of the week has hours. */
export function reopenLine(now: Date): string | null {
    const next = nextOpen(now);
    if (!next) return null;
    if (next.inDays === 0) return `נפתח היום בשעה ${toHHMM(next.at)}`;
    if (next.inDays === 1) return `נפתח מחר בשעה ${toHHMM(next.at)}`;
    return `נפתח ביום ${DAY_HE[next.day]} בשעה ${toHHMM(next.at)}`;
}

/**
 * Why we are closed, in words that are true. Empty string when open.
 *
 * A manual "closed" override deliberately does NOT promise a reopening time.
 * `nextOpen` would happily answer — staff who close at 11:00 on a Monday would
 * have the app tell customers "נפתח מחר", because today's opening has passed —
 * but the override is lifted by hand, so nobody knows when it ends. Better to
 * say nothing than to name an hour we invented. If staff left a note, that note
 * is the most accurate thing available, so it is what shows.
 */
export function closedMessage(status: ShopStatus, now: Date): string {
    if (status.open) return '';
    if (status.reason === 'override_closed') {
        return status.note ? `סגור כרגע · ${status.note}` : 'סגור כרגע · נחזור בקרוב';
    }
    const when = reopenLine(now);
    return when ? `סגור כרגע · ${when}` : 'המסעדה סגורה כרגע';
}

/**
 * What to show where the pickup-slot chips would be, when there are none.
 *
 * Covers the case `closedMessage` cannot: the shop is genuinely OPEN, but it is
 * 15:55 and every remaining slot falls past closing once the kitchen's lead time
 * is added. "Closed" would be a lie, and an empty string — which is what
 * `closedMessage` correctly returns for an open shop — leaves the customer
 * staring at a heading with nothing under it.
 */
export function noPickupMessage(status: ShopStatus, now: Date): string {
    if (!status.open) return closedMessage(status, now);
    // Staff have forced the shop open outside its scheduled hours. The slot grid
    // is built from WEEK and so has nothing to offer, but the order still goes
    // through with no pickup time (checkPickup allows that; the kitchen shows
    // "ללא שעת איסוף"). Saying "we open tomorrow" over a live order button would
    // have the screen contradicting itself.
    if (status.reason === 'override_open') return 'פתוח כרגע · שעת האיסוף תתואם בקופה';
    const when = reopenLine(now);
    return when ? `אין שעות איסוף פנויות · ${when}` : 'אין שעות איסוף פנויות כרגע';
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

    const { day, mins: nowMins } = shopParts(now);
    const { open, close } = hoursFor(day);
    if (open === null || close === null) return 'closed_day';
    if (mins < open || mins > close) return 'outside_hours';

    if (mins < nowMins - LATE_SUBMIT_GRACE) return 'in_the_past';

    return null;
}

/**
 * Opening-hours assertions.
 *
 *   node --experimental-strip-types scripts/verify-hours.ts
 *
 * Separate from verify-plaque.ts because this is not geometry — it is the rule
 * that decides whether the shop takes an order at all, and it is now enforced
 * on the SERVER as well as in the UI. Before this, `pickup_time` went from the
 * request body straight into the database unread: an order could be placed at
 * 3am, for 4am, and would be sitting on the kitchen board when staff arrived.
 *
 * `scripts/` is excluded from tsconfig — see the note in verify-plaque.ts.
 */
import {
    WEEK, hm, toHHMM, parseHHMM, hoursFor, withinHours, isPeak,
    pickupSlots, checkPickup, shopStatus, nextOpen, LEAD_NORMAL, LEAD_PEAK, LATE_SUBMIT_GRACE,
} from '../src/lib/shopHours.ts';

let failed = 0;
const ok = (cond: boolean, msg: string) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${msg}`);
};
const head = (s: string) => console.log(`\n${s}`);

/** A local Date on a known weekday. 2026-08-09 is a Sunday. */
const SUNDAY = 9;
const at = (weekday: number, h: number, m = 0) => new Date(2026, 7, SUNDAY + weekday, h, m, 0, 0);
const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── 1. The schedule the owner asked for ─────────────────────────────────────
head('1. The week');
for (const d of [0, 1, 2, 3, 4]) {
    const { open, close } = hoursFor(d);
    ok(open === hm(9) && close === hm(16), `${DAY_NAME[d]}: 09:00–16:00`);
}
ok(hoursFor(5).open === hm(9) && hoursFor(5).close === hm(14), 'Fri: 09:00–14:00 (early close)');
ok(hoursFor(6).open === null, 'Sat: closed');
ok(at(0, 12).getDay() === 0 && at(6, 12).getDay() === 6, 'the fixture dates land on the weekdays they claim');

// ── 2. parse/format round-trip ──────────────────────────────────────────────
head('2. Time parsing');
ok(parseHHMM('09:00') === 540 && toHHMM(540) === '09:00', '09:00 <-> 540');
ok(parseHHMM('16:00') === 960, '16:00 -> 960');
for (const bad of ['', '9', '9:0', '24:00', '12:60', 'abc', '--:--', null, undefined]) {
    ok(parseHHMM(bad as string) === null, `rejects ${JSON.stringify(bad)}`);
}

// ── 3. Open / closed right now ──────────────────────────────────────────────
head('3. shopStatus');
ok(shopStatus(at(1, 12)).open, 'Monday noon: open');
ok(!shopStatus(at(1, 8, 59)).open, 'Monday 08:59: not yet');
ok(shopStatus(at(1, 8, 59)).reason === 'before_open', '  ...and it says so (before_open)');
ok(!shopStatus(at(1, 16, 1)).open, 'Monday 16:01: shut');
ok(shopStatus(at(1, 16, 1)).reason === 'after_close', '  ...and it says so (after_close)');
ok(!shopStatus(at(6, 12)).open, 'Saturday noon: closed');
ok(shopStatus(at(6, 12)).reason === 'closed_day', '  ...as a closed DAY, not as after-hours');
ok(shopStatus(at(1, 12)).opensAt === '09:00', 'reports the day window for "we open at…" copy');

// The override wins BOTH ways — closing early and staying late.
ok(!shopStatus(at(1, 12), 'closed').open, 'override closed beats an open schedule');
ok(shopStatus(at(1, 22), 'open').open, 'override open beats a closed schedule (staying late)');
ok(shopStatus(at(6, 12), 'open').open, 'override open works on a closed day too');
ok(shopStatus(at(1, 12), null).open, 'null override = follow the schedule');

// ── 4. Pickup slots ─────────────────────────────────────────────────────────
head('4. Pickup slots');
{
    const slots = pickupSlots(at(1, 10));
    ok(slots.length > 0, 'Monday 10:00 offers slots');
    ok(slots[0].id === toHHMM(hm(10) + LEAD_NORMAL), `first slot respects the ${LEAD_NORMAL}min lead (${slots[0].id})`);
    ok(slots.every(s => parseHHMM(s.id)! <= hm(16)), 'no slot past closing');
    ok(slots.every(s => parseHHMM(s.id)! % 5 === 0), 'every slot on the 5-minute grid');
}
{
    const peak = pickupSlots(at(1, 12));
    ok(peak[0].id === toHHMM(hm(12) + LEAD_PEAK), `lunch rush uses the ${LEAD_PEAK}min lead (${peak[0].id})`);
    ok(isPeak(hm(12, 30)) && !isPeak(hm(10)), 'peak window is the lunch rush');
}
ok(pickupSlots(at(6, 12)).length === 0, 'Saturday offers nothing');
ok(pickupSlots(at(1, 15, 55)).length === 0, 'too late for the 15min lead before a 16:00 close -> nothing');
ok(pickupSlots(at(5, 13, 50)).length === 0, 'Friday 13:50 is past the last workable slot');
{
    const early = pickupSlots(at(1, 7));
    ok(early.length > 0 && early[0].id === '09:00', 'ordering before opening offers slots from 09:00, not 07:15');
}

// ── 5. What the SERVER will accept ──────────────────────────────────────────
// This is the half that did not exist. Every case here was previously stored.
head('5. checkPickup — the server gate');
ok(checkPickup('12:00', at(1, 11)) === null, 'Monday, 12:00 pickup at 11:00: accepted');
ok(checkPickup(null, at(1, 11)) === null, 'no pickup time at all: accepted (kitchen shows "ללא שעת איסוף")');
ok(checkPickup('04:00', at(1, 3)) === 'closed_day' || checkPickup('04:00', at(1, 3)) === 'outside_hours',
    '3am order for 4am: REJECTED (this used to be stored)');
ok(checkPickup('08:30', at(1, 8)) === 'outside_hours', 'before opening: rejected');
ok(checkPickup('16:30', at(1, 12)) === 'outside_hours', 'after closing: rejected');
ok(checkPickup('12:00', at(6, 11)) === 'closed_day', 'Saturday: rejected as a closed day');
ok(checkPickup('15:00', at(5, 12)) === 'outside_hours', 'Friday 15:00 is past the early close: rejected');
ok(checkPickup('nonsense', at(1, 12)) === 'malformed', 'malformed pickup time: rejected');
ok(checkPickup('11:00', at(1, 14)) === 'in_the_past', 'three hours in the past: rejected');

// The grace window: someone who loaded the page at 15:50 and pays at 15:56 must
// not be rejected because the slot list moved on while they were typing a note.
ok(checkPickup('11:55', at(1, 12)) === null,
    `${LATE_SUBMIT_GRACE}min grace: a slot that just passed is still accepted`);
ok(checkPickup('11:45', at(1, 12)) === 'in_the_past', 'but not one well past');

// ── 5b. When do we open again? ──────────────────────────────────────────────
// The closed message used to be a fixed "reopens Sunday", which is true one day
// a week and wrong the rest.
head('5b. nextOpen');
{
    const monMorning = nextOpen(at(1, 8));
    ok(monMorning?.inDays === 0 && monMorning.at === hm(9), 'Monday 08:00 -> opens today at 09:00 (not "Sunday")');
    const monEvening = nextOpen(at(1, 18));
    ok(monEvening?.inDays === 1 && monEvening.day === 2, 'Monday 18:00 -> opens tomorrow (Tuesday)');
    const friEvening = nextOpen(at(5, 18));
    ok(friEvening?.inDays === 2 && friEvening.day === 0, 'Friday evening -> skips Saturday, opens Sunday');
    const satNoon = nextOpen(at(6, 12));
    ok(satNoon?.inDays === 1 && satNoon.day === 0, 'Saturday -> opens tomorrow (Sunday)');
    ok(nextOpen(at(1, 9))?.inDays === 1, 'once open, "next" is the following day, not now');
}

// ── 6. The UI and the server cannot disagree ────────────────────────────────
// The slot list is what the customer can pick; checkPickup is what the server
// will take. If the first ever offers something the second refuses, a customer
// gets a 409 on a choice the app itself gave them.
head('6. Every offered slot is an acceptable slot');
for (const day of [0, 1, 2, 3, 4, 5]) {
    for (const hour of [7, 9, 10, 11, 12, 13, 14, 15, 16, 20]) {
        const now = at(day, hour, 20);
        for (const slot of pickupSlots(now)) {
            const verdict = checkPickup(slot.id, now);
            ok(verdict === null, `${DAY_NAME[day]} ${toHHMM(hm(hour, 20))} -> slot ${slot.id} accepted${verdict ? ` (got ${verdict})` : ''}`);
        }
    }
}

console.log(`\n  week: ${Object.entries(WEEK).map(([d, h]) =>
    `${DAY_NAME[Number(d)]} ${h.open === null ? 'closed' : `${toHHMM(h.open)}-${toHHMM(h.close!)}`}`).join(' · ')}`);
console.log(failed === 0 ? '\nAll assertions passed.\n' : `\n${failed} FAILED\n`);
process.exit(failed === 0 ? 0 : 1);

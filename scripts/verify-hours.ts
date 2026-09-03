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
    closedMessage, reopenLine, noPickupMessage, shopParts, SHOP_TZ,
} from '../src/lib/shopHours.ts';

let failed = 0;
const ok = (cond: boolean, msg: string) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${msg}`);
};
const head = (s: string) => console.log(`\n${s}`);

/**
 * An instant that reads as the given ISRAEL wall-clock time, whatever timezone
 * this process is in. 2026-08-09 is a Sunday.
 *
 * It used to be `new Date(2026, 7, ...)` — the HOST's local time. That passed
 * on the developer's Israel machine and would have passed just as happily on a
 * UTC one while testing the wrong three hours of the day, which is exactly the
 * bug this file exists to catch. Section 8 checks this helper itself.
 */
const SUNDAY = 9;
function at(weekday: number, h: number, m = 0): Date {
    const guess = new Date(Date.UTC(2026, 7, SUNDAY + weekday, h, m, 0, 0));
    let diff = shopParts(guess).mins - hm(h, m);
    if (diff > 720) diff -= 1440;   // the guess landed on the previous day
    if (diff < -720) diff += 1440;  // ...or the next one
    return new Date(guess.getTime() - diff * 60000);
}
const DAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── 1. The schedule the owner asked for ─────────────────────────────────────
head('1. The week');
for (const d of [0, 1, 2, 3, 4]) {
    const { open, close } = hoursFor(d);
    ok(open === hm(9) && close === hm(16), `${DAY_NAME[d]}: 09:00–16:00`);
}
// Five trading days — owner's decision 2026-08-11. Friday used to trade until
// 14:00; it is now shut with Saturday.
ok(hoursFor(5).open === null, 'Fri: closed');
ok(hoursFor(6).open === null, 'Sat: closed');
ok([0, 1, 2, 3, 4, 5, 6].filter(d => hoursFor(d).open !== null).length === 5, 'exactly five trading days');
ok(shopParts(at(0, 12)).day === 0 && shopParts(at(6, 12)).day === 6, 'the fixture dates land on the weekdays they claim');

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
ok(pickupSlots(at(5, 12)).length === 0, 'Friday offers nothing');
{
    // The clamp is a boundary guard, not a pre-order route — see section 9.
    const early = pickupSlots(at(1, 7));
    ok(early.length > 0 && early[0].id === '09:00', 'the 09:00 slot is never skipped by the lead time');
}

// ── 5. What the SERVER will accept ──────────────────────────────────────────
// This is the half that did not exist. Every case here was previously stored.
head('5. checkPickup — the server gate');
ok(checkPickup('12:00', at(1, 11)) === null, 'Monday, 12:00 pickup at 11:00: accepted');
ok(checkPickup(null, at(1, 11)) === null, 'the validator permits no pickup; POST owns the forced-open-only exception');
ok(checkPickup('04:00', at(1, 3)) === 'closed_day' || checkPickup('04:00', at(1, 3)) === 'outside_hours',
    '3am order for 4am: REJECTED (this used to be stored)');
ok(checkPickup('08:30', at(1, 8)) === 'outside_hours', 'before opening: rejected');
ok(checkPickup('16:30', at(1, 12)) === 'outside_hours', 'after closing: rejected');
ok(checkPickup('12:00', at(6, 11)) === 'closed_day', 'Saturday: rejected as a closed day');
ok(checkPickup('12:00', at(5, 11)) === 'closed_day', 'Friday: rejected as a closed day');
ok(checkPickup('nonsense', at(1, 12)) === 'malformed', 'malformed pickup time: rejected');
ok(checkPickup('12:31', at(1, 12)) === 'malformed', 'off-grid pickup time: rejected');
ok(checkPickup('9:15', at(1, 9)) === 'malformed', 'non-canonical pickup time: rejected');
ok(checkPickup('15:55', at(1, 9)) === 'unavailable', 'a time beyond the visible 12-slot horizon: rejected');
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
    // The weekend is now two days, so Thursday evening has to count over both.
    const thuEvening = nextOpen(at(4, 18));
    ok(thuEvening?.inDays === 3 && thuEvening.day === 0, 'Thursday evening -> skips Fri AND Sat, opens Sunday');
    const friNoon = nextOpen(at(5, 12));
    ok(friNoon?.inDays === 2 && friNoon.day === 0, 'Friday -> opens Sunday');
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
        if (!shopStatus(now).open) continue;
        for (const slot of pickupSlots(now)) {
            const verdict = checkPickup(slot.id, now);
            ok(verdict === null, `${DAY_NAME[day]} ${toHHMM(hm(hour, 20))} -> slot ${slot.id} accepted${verdict ? ` (got ${verdict})` : ''}`);
        }
    }
}

// ── 7. The words the customer reads ─────────────────────────────────────────
// Copy is derived from the same state as the rules, so it can be wrong in the
// same measurable ways. The message this replaces was the fixed string "נפתח
// מחדש ביום ראשון" — right on a Saturday, wrong every other time it appeared.
head('7. The closed message says something true');
{
    const closed = (now: Date) => closedMessage(shopStatus(now), now);

    // Never silent when there is nothing to sell.
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
        for (const hour of [3, 7, 8, 12, 17, 22]) {
            const now = at(day, hour);
            const status = shopStatus(now);
            const msg = noPickupMessage(status, now);
            ok(msg.length > 0, `${DAY_NAME[day]} ${hour}:00 -> a message exists ("${msg}")`);
            if (status.open) {
                ok(closed(now) === '', `${DAY_NAME[day]} ${hour}:00 open -> closedMessage is empty`);
            }
        }
    }

    // The specific bug: do not send a Monday-morning customer away for six days.
    const monEarly = closed(at(1, 8));
    ok(monEarly.includes('היום') && monEarly.includes('09:00'), `Mon 08:00 -> "today at 09:00" ("${monEarly}")`);
    ok(!monEarly.includes('ראשון'), 'Mon 08:00 -> does not name Sunday');

    const monLate = closed(at(1, 18));
    ok(monLate.includes('מחר'), `Mon 18:00 -> "tomorrow" ("${monLate}")`);

    // The two-day weekend: Thursday evening and all of Friday must name Sunday,
    // never "tomorrow". Getting this wrong sends someone to a shut shop.
    const thuLate = closed(at(4, 18));
    ok(thuLate.includes('ראשון'), `Thu 18:00 -> names Sunday ("${thuLate}")`);
    const friNoonMsg = closed(at(5, 12));
    ok(friNoonMsg.includes('ראשון'), `Fri 12:00 -> names Sunday ("${friNoonMsg}")`);
    ok(!friNoonMsg.includes('מחר'), 'Fri 12:00 -> does not say "tomorrow" (that is Saturday)');
    ok(reopenLine(at(6, 12))?.includes('מחר') === true, 'Sat noon -> "tomorrow"');

    // A manual override must not invent a reopening time — nobody knows one.
    const overNote = closedMessage(shopStatus(at(1, 11), 'closed', 'נגמר העוף'), at(1, 11));
    ok(overNote.includes('נגמר העוף'), `override with a note shows the note ("${overNote}")`);
    ok(!overNote.includes('מחר') && !overNote.includes('היום'), 'override does not promise a time');
    const overBare = closedMessage(shopStatus(at(1, 11), 'closed'), at(1, 11));
    ok(overBare.length > 0 && !overBare.includes('09:00'), `bare override stays vague ("${overBare}")`);

    // Open-but-no-slots: "closed" would be a lie, silence would be worse.
    const lateOpen = at(1, 15, 55);
    ok(shopStatus(lateOpen).open, 'Mon 15:55 is still open');
    ok(pickupSlots(lateOpen).length === 0, 'Mon 15:55 has no offerable slots');
    const lateMsg = noPickupMessage(shopStatus(lateOpen), lateOpen);
    ok(lateMsg.includes('אין שעות איסוף'), `Mon 15:55 -> "no slots", not "closed" ("${lateMsg}")`);
    ok(!lateMsg.startsWith('סגור'), 'Mon 15:55 -> does not claim the shop is closed');

    // Forced open outside hours: the order button is live (shopStatus says open,
    // and checkPickup accepts an unset pickup time) while the slot grid, built
    // from WEEK, has nothing. The screen must not argue with itself.
    const forced = at(6, 12); // Saturday — closed on every schedule
    const forcedStatus = shopStatus(forced, 'open');
    ok(forcedStatus.open, 'Sat noon with override "open" -> open');
    ok(pickupSlots(forced).length === 0, 'Sat noon has no schedule slots to offer');
    ok(checkPickup(null, forced) === null, 'an unset pickup time is still acceptable');
    const forcedMsg = noPickupMessage(forcedStatus, forced);
    ok(forcedMsg.includes('פתוח'), `forced open -> says open ("${forcedMsg}")`);
    ok(!forcedMsg.includes('נפתח מחר'), 'forced open -> does not tell them to come back tomorrow');

    const earlyForced = at(1, 8, 30);
    ok(pickupSlots(earlyForced)[0]?.id === '09:00', 'early override shows the first scheduled slot');
    ok(checkPickup('09:00', earlyForced, 'open') === null, 'server accepts the early-override slot the UI showed');
}

// ── 8. The shop's clock, not the server's ───────────────────────────────────
// THE REGRESSION. shopHours read now.getDay()/getHours() — the clock of
// whatever process it ran in — with a comment asserting that was Israel time on
// both sides. On Vercel the server runs in UTC, three hours behind Israel in
// summer: the shop would have refused every order from 09:00 to 12:00 Israel
// (server still reading "before 09:00") and taken them until 19:00 (server
// still reading "before 16:00"). Fixed instants below, so these assertions mean
// the same thing on any machine.
head('8. Hours are Israel time wherever the code runs');
{
    ok(SHOP_TZ === 'Asia/Jerusalem', `shop timezone is ${SHOP_TZ}`);
    console.log(`  (this process is running in ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);

    // Summer, UTC+3.
    const summerMorning = new Date('2026-08-11T07:00:00Z'); // Tue 10:00 Israel
    const p1 = shopParts(summerMorning);
    ok(p1.day === 2 && p1.mins === hm(10), `07:00Z in August -> Tue 10:00 Israel (got ${DAY_NAME[p1.day]} ${toHHMM(p1.mins)})`);
    ok(shopStatus(summerMorning).open, '10:00 Israel on a Tuesday -> OPEN (was refused: server read 07:00)');

    const summerEvening = new Date('2026-08-11T14:30:00Z'); // Tue 17:30 Israel
    ok(shopStatus(summerEvening).reason === 'after_close', '17:30 Israel -> closed (was accepted: server read 14:30)');

    // Winter, UTC+2 — the same code must not need a different constant.
    const winterMorning = new Date('2026-01-13T07:00:00Z'); // Tue 09:00 Israel
    const p2 = shopParts(winterMorning);
    ok(p2.day === 2 && p2.mins === hm(9), `07:00Z in January -> Tue 09:00 Israel (got ${DAY_NAME[p2.day]} ${toHHMM(p2.mins)})`);
    ok(shopStatus(winterMorning).open, 'DST handled: 09:00 Israel in winter is open too');

    // The closed day is Israel's Saturday, not UTC's.
    const israeliSaturday = new Date('2026-08-15T09:00:00Z'); // Sat 12:00 Israel
    ok(shopParts(israeliSaturday).day === 6, 'Sat 12:00 Israel reads as Saturday');
    ok(shopStatus(israeliSaturday).reason === 'closed_day', 'Israeli Saturday is the closed day');

    // The weekend is Israel's Friday and Saturday, on the shop's clock.
    const israeliFriday = new Date('2026-08-14T09:00:00Z'); // Fri 12:00 Israel
    ok(shopParts(israeliFriday).day === 5, 'Fri 12:00 Israel reads as Friday');
    ok(shopStatus(israeliFriday).reason === 'closed_day', 'Israeli Friday is a closed day');

    // The offered slots and the server's check must still agree — now across
    // timezones rather than only within one process.
    for (const iso of ['2026-08-11T06:30:00Z', '2026-08-11T09:15:00Z', '2026-01-13T08:00:00Z']) {
        const now = new Date(iso);
        for (const slot of pickupSlots(now)) {
            ok(checkPickup(slot.id, now) === null, `${iso} -> offered slot ${slot.id} is acceptable`);
        }
    }

    // The helper this whole file leans on: every constructed time really is the
    // Israel wall clock it claims to be.
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
        for (const [h, m] of [[0, 0], [9, 0], [13, 45], [23, 55]] as [number, number][]) {
            const p = shopParts(at(day, h, m));
            ok(p.day === day && p.mins === hm(h, m),
                `at(${DAY_NAME[day]} ${toHHMM(hm(h, m))}) is that time in Israel (got ${DAY_NAME[p.day]} ${toHHMM(p.mins)})`);
        }
    }
}

// ── 9. No pre-ordering ──────────────────────────────────────────────────────
// Owner's decision, 2026-08-11: orders are taken during trading hours only.
//
// Worth pinning rather than leaving implicit, because the code LOOKS like it
// supports pre-orders — pickupSlots clamps its first slot to opening time. The
// regular schedule still blocks checkout before opening; only an explicit staff
// override can expose that list early, and POST /api/orders receives the same
// override when validating the selected slot.
head('9. Orders are taken during trading hours only');
{
    // Outside hours the shop is shut, whatever the slot list would compute.
    for (const [day, h, label] of [
        [1, 7, 'two hours before opening'],
        [1, 8, 'an hour before opening'],
        [1, 17, 'an hour after closing'],
        [1, 3, 'the middle of the night'],
        [5, 12, 'Friday'],
        [6, 12, 'Saturday'],
    ] as [number, number, string][]) {
        const now = at(day, h);
        ok(!shopStatus(now).open, `${DAY_NAME[day]} ${toHHMM(hm(h))} (${label}) -> shop is shut, no order taken`);
    }

    // ...and open, it is genuinely open.
    for (const h of [9, 12, 15, 16]) {
        ok(shopStatus(at(1, h)).open, `Mon ${toHHMM(hm(h))} -> open`);
    }

    // Once trading starts it is the LEAD TIME that sets the first slot, not the
    // clamp — the kitchen still needs its 15 minutes.
    ok(!shopStatus(at(1, 8, 59)).open, 'Mon 08:59 -> still shut');
    ok(pickupSlots(at(1, 9))[0]?.id === '09:15', 'Mon 09:00 -> first pickup is 09:15 (the 15min lead)');

    // The clamp's invariant: pickupSlots must never name a time before opening.
    // Regular callers hide the list outside trading hours; an explicit early
    // staff override may expose the opening-time slot, but nothing earlier.
    for (const day of [0, 1, 2, 3, 4]) {
        const openMins = hoursFor(day).open!;
        for (const hour of [0, 3, 7, 8, 9, 12, 15, 20, 23]) {
            for (const slot of pickupSlots(at(day, hour, 30))) {
                ok(parseHHMM(slot.id)! >= openMins,
                    `${DAY_NAME[day]} ${toHHMM(hm(hour, 30))} -> slot ${slot.id} is not before opening`);
            }
        }
    }
}

console.log(`\n  week: ${Object.entries(WEEK).map(([d, h]) =>
    `${DAY_NAME[Number(d)]} ${h.open === null ? 'closed' : `${toHHMM(h.open)}-${toHHMM(h.close!)}`}`).join(' · ')}`);
console.log(failed === 0 ? '\nAll assertions passed.\n' : `\n${failed} FAILED\n`);
process.exit(failed === 0 ? 0 : 1);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { handoffActionLabel, paymentLabel } from '../../src/app/kitchen/types';
import {
    checkPickup,
    mergePickupCapacity,
    PICKUP_SELECTION_INVALIDATED_MESSAGE,
    reconcilePickupChoice,
    resolvePickupSelection,
    shopOverrideForTargetOpen,
    shopStatus,
} from '../../src/lib/shopHours';

const kitchenOrdersRoute = readFileSync(new URL(
    '../../src/app/api/kitchen/orders/route.ts',
    import.meta.url,
), 'utf8');
const kitchenBoard = readFileSync(new URL(
    '../../src/app/kitchen/KitchenBoard.tsx',
    import.meta.url,
), 'utf8');

test('shop target clears an override when the live schedule can take over', () => {
    assert.equal(shopOverrideForTargetOpen({ scheduledOpen: true }, true), null);
    assert.equal(shopOverrideForTargetOpen({ scheduledOpen: true }, false), 'closed');
    assert.equal(shopOverrideForTargetOpen({ scheduledOpen: false }, true), 'open');
    assert.equal(shopOverrideForTargetOpen({ scheduledOpen: false }, false), null);
});

test('shop status retains the underlying schedule while a manual override is active', () => {
    const duringHours = shopStatus(new Date('2026-09-03T07:00:00Z'), 'closed');
    assert.equal(duringHours.open, false);
    assert.equal(duringHours.scheduledOpen, true);
    assert.equal(shopOverrideForTargetOpen(duringHours, true), null);

    const afterHours = shopStatus(new Date('2026-09-03T16:00:00Z'), 'closed');
    assert.equal(afterHours.open, false);
    assert.equal(afterHours.scheduledOpen, false);
    assert.equal(shopOverrideForTargetOpen(afterHours, true), 'open');
});

test('server pickup validation accepts only canonical slots the checkout could have offered', () => {
    const opening = new Date('2026-09-03T06:00:00Z'); // 09:00 Israel, Thursday
    assert.equal(checkPickup('09:15', opening), null);
    assert.equal(checkPickup('09:00', opening), 'unavailable');
    assert.equal(checkPickup('15:55', opening), 'unavailable');
    assert.equal(checkPickup('09:16', opening), 'malformed');
    assert.equal(checkPickup('9:15', opening), 'malformed');

    const earlyOverride = new Date('2026-09-03T05:30:00Z'); // 08:30 Israel
    assert.equal(checkPickup('09:00', earlyOverride), 'unavailable');
    assert.equal(
        checkPickup('09:00', earlyOverride, 'open'),
        null,
        'an early staff opening preserves the slot shown by the forced-open checkout',
    );

    const noon = new Date('2026-09-03T09:00:00Z');
    assert.equal(checkPickup('11:50', noon), null, 'a slot ten minutes past keeps the submit grace');
    assert.equal(checkPickup('11:45', noon), 'in_the_past', 'the grace never exceeds ten minutes');

    const justAfterPeak = new Date('2026-09-03T11:31:00Z'); // 14:31 Israel
    assert.equal(
        checkPickup('15:50', justAfterPeak),
        null,
        'a horizon slot offered immediately before the peak lead changed remains valid',
    );
});

test('an explicit pickup selection never moves when a long-open checkout becomes stale', () => {
    const slots = [
        { id: '12:15', full: true },
        { id: '12:20', full: false },
        { id: '12:25', full: false },
    ];

    assert.equal(resolvePickupSelection('12:20', slots, true), '12:20');
    assert.equal(resolvePickupSelection('12:15', slots, true), null);
    assert.equal(resolvePickupSelection('12:10', slots, true), null);
    assert.equal(resolvePickupSelection('12:55', slots, true), null,
        'a later requested time must never jump to an earlier available slot');
    assert.equal(resolvePickupSelection(null, slots, true), null,
        'checkout must require an explicit pickup choice');
    assert.equal(resolvePickupSelection(undefined, slots, true), null);
    assert.equal(resolvePickupSelection('', slots, true), null);
    assert.equal(resolvePickupSelection('12:20', slots.map(slot => ({ ...slot, full: true })), true), null);
    assert.equal(resolvePickupSelection('12:20', slots, false), null);
    assert.equal(resolvePickupSelection('12:20', null, true), null);
    assert.equal(resolvePickupSelection('12:20', [], true), null);

    assert.deepEqual(
        reconcilePickupChoice('12:15', '', slots, true),
        { value: null, notice: PICKUP_SELECTION_INVALIDATED_MESSAGE },
        'a full explicit choice must be cleared and explained even before alternatives appear',
    );
    assert.deepEqual(
        reconcilePickupChoice(null, PICKUP_SELECTION_INVALIDATED_MESSAGE, slots, true),
        { value: null, notice: PICKUP_SELECTION_INVALIDATED_MESSAGE },
        'the explanation must survive a later capacity refresh until the customer chooses',
    );
    assert.deepEqual(
        reconcilePickupChoice(null, PICKUP_SELECTION_INVALIDATED_MESSAGE, slots, false),
        { value: null, notice: '' },
        'closing the shop must clear a stale invalidation explanation',
    );
    assert.deepEqual(
        reconcilePickupChoice('12:20', PICKUP_SELECTION_INVALIDATED_MESSAGE, slots, true),
        { value: '12:20', notice: '' },
        'a new valid choice clears the explanation',
    );
    assert.deepEqual(
        reconcilePickupChoice('12:20', '', null, true),
        { value: '12:20', notice: '' },
        'capacity loading alone must not erase a valid stored choice',
    );

    const local = [
        { id: '12:20', label: '12:20', isPeak: true },
        { id: '12:25', label: '12:25', isPeak: true },
    ];
    const measured = [
        { time: '12:20', full: false, available: 4 },
        { time: '12:25', full: true, available: 0 },
    ];
    assert.equal(mergePickupCapacity(local, measured, '2026-09-02', '2026-09-03'), null,
        'the same HH:MM values from yesterday must remain blocked today');
    const merged = mergePickupCapacity(local, measured, '2026-09-03', '2026-09-03');
    assert.equal(merged?.[0].full, false);
    assert.equal(merged?.[1].full, true);
    const partial = mergePickupCapacity(local, measured.slice(0, 1), '2026-09-03', '2026-09-03');
    assert.equal(partial?.[1].full, true);
    assert.equal(partial?.[1].capacityPending, true,
        'a newly-visible time stays blocked until the server measures it');
});

test('handoff action makes every unresolved payment step explicit', () => {
    assert.equal(handoffActionLabel('paid'), 'נמסר ללקוח ✓');
    assert.deepEqual(paymentLabel('no_payment_required'), {
        text: 'ללא חיוב',
        tone: 'settled',
        owed: false,
    });
    assert.equal(handoffActionLabel('no_payment_required'), 'נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('paid_unverified'), 'וידאתי בקופה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('pay_at_pickup'), 'התשלום נגבה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('failed'), 'התשלום נגבה — נמסר ללקוח ✓');
});

test('zero-charge orders remain visible on both kitchen data paths', () => {
    assert.equal(
        kitchenOrdersRoute.match(/'no_payment_required'/g)?.length,
        2,
        'demo and Supabase filters must both admit the truthful no-charge state',
    );
});

test('the ready confirmation does not promise a notification channel that does not exist', () => {
    assert.match(kitchenBoard, /סומנה כמוכנה — סטטוס הלקוח עודכן/);
    assert.doesNotMatch(kitchenBoard, /הלקוח קיבל הודעה/);
});

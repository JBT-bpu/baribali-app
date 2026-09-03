import assert from 'node:assert/strict';
import test from 'node:test';

import { handoffActionLabel } from '../../src/app/kitchen/types';
import {
    mergePickupCapacity,
    resolvePickupSelection,
    shopOverrideForTargetOpen,
    shopStatus,
} from '../../src/lib/shopHours';

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

test('pickup selection advances when a long-open checkout becomes stale', () => {
    const slots = [
        { id: '12:15', full: true },
        { id: '12:20', full: false },
        { id: '12:25', full: false },
    ];

    assert.equal(resolvePickupSelection('12:20', slots, true), '12:20');
    assert.equal(resolvePickupSelection('12:15', slots, true), '12:20');
    assert.equal(resolvePickupSelection('12:10', slots, true), '12:20');
    assert.equal(resolvePickupSelection(null, slots, true), '12:20');
    assert.equal(resolvePickupSelection('12:20', slots.map(slot => ({ ...slot, full: true })), true), null);
    assert.equal(resolvePickupSelection('12:20', slots, false), null);
    assert.equal(resolvePickupSelection('12:20', null, true), null);

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
    assert.equal(handoffActionLabel('paid_unverified'), 'וידאתי בקופה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('pay_at_pickup'), 'התשלום נגבה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('failed'), 'התשלום נגבה — נמסר ללקוח ✓');
});

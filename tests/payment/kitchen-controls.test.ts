import assert from 'node:assert/strict';
import test from 'node:test';

import { handoffActionLabel } from '../../src/app/kitchen/types';
import { shopOverrideForTargetOpen, shopStatus } from '../../src/lib/shopHours';

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

test('handoff action makes every unresolved payment step explicit', () => {
    assert.equal(handoffActionLabel('paid'), 'נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('paid_unverified'), 'וידאתי בקופה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('pay_at_pickup'), 'התשלום נגבה — נמסר ללקוח ✓');
    assert.equal(handoffActionLabel('failed'), 'התשלום נגבה — נמסר ללקוח ✓');
});

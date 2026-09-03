import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NextRequest } from 'next/server';

import { GET as getKitchenOrders } from '../../src/app/api/kitchen/orders/route';
import { orderTabTargetIndex } from '../../src/app/kitchen/OrderTabs';
import { handoffActionLabel, paymentLabel } from '../../src/app/kitchen/types';
import { createDemoOrder, resetDemoStore } from '../../src/lib/demoStore';
import {
    checkPickup,
    mergePickupCapacity,
    PICKUP_SELECTION_INVALIDATED_MESSAGE,
    reconcilePickupChoice,
    resolvePickupSelection,
    shopDayBounds,
    shopOverrideForTargetOpen,
    shopStatus,
} from '../../src/lib/shopHours';
import { isolateSupabaseTestEnvironment } from './testEnvironment';

const kitchenOrdersRoute = readFileSync(new URL(
    '../../src/app/api/kitchen/orders/route.ts',
    import.meta.url,
), 'utf8');
const kitchenBoard = readFileSync(new URL(
    '../../src/app/kitchen/KitchenBoard.tsx',
    import.meta.url,
), 'utf8');
const kitchenLogin = readFileSync(new URL(
    '../../src/app/kitchen/KitchenLogin.tsx',
    import.meta.url,
), 'utf8');
const orderTabs = readFileSync(new URL(
    '../../src/app/kitchen/OrderTabs.tsx',
    import.meta.url,
), 'utf8');

test('kitchen login exposes a labelled password field and announces linked errors', () => {
    assert.match(kitchenLogin, /<label htmlFor="kitchen-password"/);
    assert.match(kitchenLogin, /id="kitchen-password"[\s\S]*?autoComplete="current-password"/);
    assert.match(kitchenLogin, /aria-invalid=\{Boolean\(error\)\}/);
    assert.match(kitchenLogin, /aria-describedby=\{error \? 'kitchen-login-error' : undefined\}/);
    assert.match(kitchenLogin, /id="kitchen-login-error" role="alert" aria-live="assertive"/);
});

test('kitchen order tabs use an RTL roving focus model', () => {
    assert.equal(orderTabTargetIndex(1, 'ArrowLeft', 3), 2);
    assert.equal(orderTabTargetIndex(1, 'ArrowRight', 3), 0);
    assert.equal(orderTabTargetIndex(2, 'ArrowLeft', 3), 0, 'left wraps to the first tab');
    assert.equal(orderTabTargetIndex(0, 'ArrowRight', 3), 2, 'right wraps to the last tab');
    assert.equal(orderTabTargetIndex(2, 'Home', 3), 0);
    assert.equal(orderTabTargetIndex(0, 'End', 3), 2);
    assert.equal(orderTabTargetIndex(1, 'Enter', 3), null);
    assert.equal(orderTabTargetIndex(0, 'ArrowLeft', 0), null);

    assert.match(orderTabs, /role="tablist"[\s\S]*?aria-orientation="horizontal"/);
    assert.match(orderTabs, /role="tab"[\s\S]*?aria-selected=\{active\}[\s\S]*?aria-controls=\{active \? kitchenOrderPanelId\(o\.id\) : undefined\}/,
        'only the active tab may reference the one mounted tabpanel');
    assert.match(orderTabs, /tabIndex=\{active \? 0 : -1\}/);
    assert.match(orderTabs, /onKeyDown=\{event => selectFromKeyboard\(event, index\)\}/);
    assert.match(kitchenBoard, /id=\{kitchenOrderPanelId\(active\.id\)\}[\s\S]*?role="tabpanel"[\s\S]*?aria-labelledby=\{kitchenOrderTabId\(active\.id\)\}/);
});

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

test('kitchen today is bounded by Israel midnights in demo and Supabase modes', () => {
    assert.match(kitchenOrdersRoute, /const \{ startMs, endMs \} = shopDayBounds\(\)/);
    assert.doesNotMatch(kitchenOrdersRoute, /\.setHours\(/,
        'server-local midnight must not define the kitchen business day');
    assert.match(kitchenOrdersRoute, /createdAt >= startMs[\s\S]*?createdAt < endMs/,
        'demo orders must use the same Israel day as production');
    assert.match(kitchenOrdersRoute, /\.gte\('created_at', since\)[\s\S]*?\.lt\('created_at', until\)/,
        'the database query must use an inclusive start and exclusive next midnight');
});

test('demo kitchen includes the Israel-day start and excludes the next midnight', { concurrency: false }, async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-03T09:00:00Z') });
    const restoreEnvironment = isolateSupabaseTestEnvironment({
        NEXT_PUBLIC_BARIBALI_DEMO_MODE: 'true',
    });
    try {
        resetDemoStore();
        const { startMs, endMs } = shopDayBounds();
        const atStart = createDemoOrder({ items: [], total: 72, size: '1500', paymentStatus: 'pay_at_pickup' });
        const beforeStart = createDemoOrder({ items: [], total: 72, size: '1500', paymentStatus: 'paid' });
        const atEnd = createDemoOrder({ items: [], total: 72, size: '1500', paymentStatus: 'paid' });
        atStart.created_at = new Date(startMs).toISOString();
        beforeStart.created_at = new Date(startMs - 1).toISOString();
        atEnd.created_at = new Date(endMs).toISOString();

        const response = await getKitchenOrders(new NextRequest('http://localhost/api/kitchen/orders'));
        assert.equal(response.status, 200);
        const ids = (await response.json() as { id: string }[]).map(order => order.id);
        assert.deepEqual(ids, [atStart.id], 'the kitchen day must be a half-open [start, end) interval');
    } finally {
        resetDemoStore();
        restoreEnvironment();
    }
});

test('the ready confirmation does not promise a notification channel that does not exist', () => {
    assert.match(kitchenBoard, /סומנה כמוכנה — סטטוס הלקוח עודכן/);
    assert.doesNotMatch(kitchenBoard, /הלקוח קיבל הודעה/);
});

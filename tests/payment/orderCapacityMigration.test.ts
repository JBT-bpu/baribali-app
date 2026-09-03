import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    createDemoOrder,
    createDemoOrderOnce,
    listDemoOrders,
    listDemoPickupAllocations,
    resetDemoStore,
    updateDemoOrderStatus,
} from '../../src/lib/demoStore';
import { PICKUP_SLOT_CAPACITY } from '../../src/lib/pickupCapacity';

const migration = readFileSync(new URL(
    '../../supabase/migrations/20260903200310_order_capacity_and_numbering.sql',
    import.meta.url,
), 'utf8');
const orderRoute = readFileSync(new URL(
    '../../src/app/api/orders/route.ts',
    import.meta.url,
), 'utf8');
const slotsRoute = readFileSync(new URL(
    '../../src/app/api/slots/route.ts',
    import.meta.url,
), 'utf8');
const summary = readFileSync(new URL(
    '../../src/components/builder/SummaryView.jsx',
    import.meta.url,
), 'utf8');
const normalized = migration.replace(/\s+/g, ' ').toLowerCase();

function demoAttempt(index: number, pickupTime: string | null = '12:30') {
    return createDemoOrderOnce({
        submissionKey: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        submissionFingerprint: String(index).padStart(64, '0'),
        serviceDate: '2030-01-02',
        items: [],
        total: 54,
        pickupTime,
        notes: null,
        size: '54',
        paymentStatus: 'pay_at_pickup',
    });
}

test('database numbering has one durable generator and a uniqueness backstop', () => {
    assert.match(normalized, /create sequence public\.orders_order_num_seq/);
    assert.match(normalized, /start with 1000/);
    assert.match(normalized, /no cycle/);
    assert.match(normalized, /alter sequence public\.orders_order_num_seq owned by public\.orders\.order_num/);
    assert.match(normalized, /alter column order_num set default \( 'bb-' \|\| pg_catalog\.nextval/);
    assert.match(normalized, /add constraint orders_order_num_key unique \(order_num\)/);
    assert.match(normalized, /public\.orders contains duplicate order_num values/);
    assert.match(normalized, /grant usage on sequence public\.orders_order_num_seq to service_role/);

    const replacementStart = normalized.indexOf('create function public.create_order_idempotent');
    const replacementEnd = normalized.indexOf('revoke execute on function public.create_order_idempotent', replacementStart);
    assert.ok(replacementStart >= 0 && replacementEnd > replacementStart);
    const replacement = normalized.slice(replacementStart, replacementEnd);
    assert.doesNotMatch(replacement, /p_order_num/);
    assert.doesNotMatch(replacement, /insert into public\.orders \( id, order_num/);
});

test('five immutable allocation positions arbitrate slot capacity inside order creation', () => {
    assert.match(normalized, /create table public\.order_pickup_allocations/);
    assert.match(normalized, /unique \(service_date, pickup_time, capacity_position\)/);
    assert.match(normalized, /check \(capacity_position between 1 and 5\)/);
    assert.match(normalized, /foreign key \(order_id\)[\s\S]*?deferrable initially deferred/);
    assert.match(normalized, /alter table public\.order_pickup_allocations enable row level security/);
    assert.match(
        normalized,
        /revoke all privileges on table public\.order_pickup_allocations from public, anon, authenticated, service_role/,
    );
    assert.match(normalized, /grant select, insert on table public\.order_pickup_allocations to service_role/);

    const functionStart = normalized.indexOf('create function public.create_order_idempotent');
    const functionEnd = normalized.indexOf('revoke execute on function public.create_order_idempotent', functionStart);
    const body = normalized.slice(functionStart, functionEnd);
    const allocation = body.indexOf('insert into public.order_pickup_allocations');
    const order = body.indexOf('insert into public.orders');
    assert.ok(allocation >= 0 && allocation < order, 'capacity must be won before consuming an order number');
    assert.match(body, /for v_capacity_position in 1\.\.5 loop/);
    assert.match(body, /on conflict on constraint order_pickup_allocations_slot_position_key do nothing/);
    assert.match(body, /raise exception 'pickup_slot_full' using errcode = 'p0001'/);
    assert.match(body, /pg_catalog\.timezone\('asia\/jerusalem', pg_catalog\.transaction_timestamp\(\)\)/);
});

test('migration backfills safely and prevents future unallocated real orders', () => {
    assert.match(normalized, /row_number\(\) over \( partition by [\s\S]*?service_date/);
    assert.match(normalized, /where ranked\.capacity_position > 5/);
    assert.match(normalized, /public\.orders contains an overbooked historical pickup slot/);
    assert.match(normalized, /create constraint trigger orders_require_pickup_allocation/);
    assert.match(normalized, /deferrable initially deferred/);
    assert.match(normalized, /order_pickup_allocation_required/);
    assert.match(normalized, /new\.pickup_time is null or new\.order_num like 'sim-%'/);
});

test('API reads the allocation ledger and handles a last-millisecond full slot', () => {
    assert.match(slotsRoute, /\.from\('order_pickup_allocations'\)/);
    assert.match(slotsRoute, /\.eq\('service_date', serviceDate\)/);
    assert.doesNotMatch(slotsRoute, /\.neq\('status', 'collected'\)/);
    assert.match(orderRoute, /error\.code === 'P0001' && error\.message === 'PICKUP_SLOT_FULL'/);
    assert.match(orderRoute, /code: 'PICKUP_SLOT_FULL'/);
    assert.match(orderRoute, /shop\.reason === 'override_open' && pickupSlots\(now\)\.length === 0/);
    assert.match(orderRoute, /!intent\.pickupTime && !canCoordinatePickupAtCounter/);
    assert.match(orderRoute, /code: 'PICKUP_TIME_REQUIRED'/);
    assert.doesNotMatch(orderRoute, /const orderNum = `BB-/);
    assert.doesNotMatch(orderRoute, /p_order_num:/);
    assert.match(summary, /data\?\.code === 'PICKUP_SLOT_FULL'/);
    assert.match(summary, /setPickupTime\(null\)/);
    assert.match(summary, /pickupAvailability\.markFull\(pickupForSubmit\)/);
    assert.match(summary, /pickupAvailability\.refresh\(\)/);
});

test('demo allocation mirrors the immutable five-order database rule', () => {
    resetDemoStore();
    try {
        const accepted = Array.from({ length: PICKUP_SLOT_CAPACITY }, (_, index) => demoAttempt(index + 1));
        assert.ok(accepted.every(result => result.result === 'created'));
        assert.equal(listDemoOrders().length, PICKUP_SLOT_CAPACITY);
        assert.equal(listDemoPickupAllocations().length, PICKUP_SLOT_CAPACITY);
        assert.equal(new Set(listDemoOrders().map(order => order.order_num)).size, PICKUP_SLOT_CAPACITY);
        assert.deepEqual(listDemoOrders().map(order => order.order_num), [
            'BB-1000',
            'BB-1001',
            'BB-1002',
            'BB-1003',
            'BB-1004',
        ]);

        assert.equal(demoAttempt(6).result, 'slot_full');
        assert.equal(listDemoOrders().length, PICKUP_SLOT_CAPACITY);

        const replay = demoAttempt(1);
        assert.equal(replay.result, 'replayed');
        assert.equal(listDemoOrders().length, PICKUP_SLOT_CAPACITY);

        const first = listDemoOrders()[0];
        updateDemoOrderStatus(first.id, 'collected');
        assert.equal(demoAttempt(7).result, 'slot_full', 'collection must not release throughput capacity');

        assert.equal(demoAttempt(8, '12:35').result, 'created');
        assert.equal(demoAttempt(9, null).result, 'created');

        createDemoOrder({
            items: [],
            total: 54,
            pickupTime: '12:30',
            size: '54',
            paymentStatus: 'pay_at_pickup',
            orderNum: 'SIM-000000000001',
        });
        assert.equal(
            listDemoPickupAllocations().filter(allocation => allocation.pickupTime === '12:30').length,
            PICKUP_SLOT_CAPACITY,
            'rehearsal orders must not consume customer capacity',
        );
    } finally {
        resetDemoStore();
    }
});

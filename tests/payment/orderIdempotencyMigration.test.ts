import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    orderSubmissionFingerprint,
    parseOrderSubmissionIntent,
} from '../../src/lib/orderSubmissionServer';

const migration = readFileSync(new URL(
    '../../supabase/migrations/20260903120000_order_submission_idempotency.sql',
    import.meta.url,
), 'utf8');
const route = readFileSync(new URL(
    '../../src/app/api/orders/route.ts',
    import.meta.url,
), 'utf8');
const sql = migration.replace(/\s+/g, ' ').toLowerCase();

test('order idempotency secrets live in a separate server-only ledger', () => {
    assert.match(sql, /create table public\.order_creation_requests/);
    assert.match(sql, /idempotency_key uuid primary key/);
    assert.match(sql, /intent_hash text not null/);
    assert.match(sql, /alter table public\.order_creation_requests enable row level security/);
    assert.match(
        sql,
        /revoke all privileges on table public\.order_creation_requests from public, anon, authenticated, service_role/,
    );
    assert.match(sql, /grant select, insert on table public\.order_creation_requests to service_role/);
    assert.doesNotMatch(sql, /alter table public\.orders add column[^;]*idempotency_key/);
});

test('ledger claim and order creation are one rollback-safe transaction', () => {
    assert.match(sql, /foreign key \(order_id\).*?on delete restrict.*?deferrable initially deferred/);

    const functionStart = sql.indexOf('create or replace function public.create_order_idempotent');
    const functionEnd = sql.indexOf('revoke execute on function public.create_order_idempotent', functionStart);
    assert.ok(functionStart >= 0 && functionEnd > functionStart);
    const body = sql.slice(functionStart, functionEnd);

    const ledgerInsert = body.indexOf('insert into public.order_creation_requests');
    const conflictClaim = body.indexOf('on conflict (idempotency_key) do nothing', ledgerInsert);
    const orderInsert = body.indexOf('insert into public.orders', conflictClaim);
    const loserRead = body.indexOf('from public.order_creation_requests request', orderInsert);
    assert.ok(ledgerInsert >= 0 && ledgerInsert < conflictClaim);
    assert.ok(conflictClaim < orderInsert && orderInsert < loserRead);
    assert.match(body, /security invoker set search_path = ''/);
    assert.match(body, /'created'::text/);
    assert.match(body, /'replayed'::text/);
    assert.match(body, /'conflict'::text/);
});

test('atomic create preserves discount provenance without treating final total as subtotal', () => {
    assert.match(sql, /discount_code.*?udt_name not in \('text', 'varchar'\)/);
    assert.match(sql, /discount_amount.*?udt_name not in \('int2', 'int4', 'int8'\)/);
    assert.match(
        sql,
        /alter table public\.orders add column if not exists discount_code text, add column if not exists discount_amount integer/,
    );
    assert.match(sql, /p_discount_amount is null or p_discount_amount < 0/);
    assert.match(sql, /p_discount_code is null and p_discount_amount <> 0/);
    assert.doesNotMatch(sql, /p_discount_amount > p_total/);
    assert.match(
        sql,
        /p_payment_status is null/,
    );
    assert.match(
        sql,
        /p_payment_status not in \('pending', 'pay_at_pickup', 'no_payment_required'\)/,
    );
    assert.match(sql, /p_total = 0 and p_payment_status <> 'no_payment_required'/);
    assert.match(sql, /p_total > 0 and p_payment_status = 'no_payment_required'/);
});

test('orders preflight verifies omitted columns can be populated safely', () => {
    assert.match(
        sql,
        /lock table public\.orders in share update exclusive mode/,
    );
    assert.match(
        sql,
        /actual\.column_name = 'created_at'.*?lower\(actual\.column_default\).*?current_timestamp/,
    );
    assert.match(sql, /public\.orders\.created_at must default to the current timestamp/);
    assert.match(sql, /from public\.orders where created_at is null/);
    assert.match(
        sql,
        /public\.orders insert columns have incompatible nullability or generation/,
    );
    assert.match(sql, /public\.orders discount columns must be nullable and writable/);
    assert.match(
        sql,
        /alter table public\.orders alter column created_at set default now\(\), alter column created_at set not null/,
    );

    const requiredColumnGuard = sql.slice(
        sql.indexOf('select string_agg(actual.column_name'),
        sql.indexOf("raise exception 'public.orders.discount_code", sql.indexOf('select string_agg(actual.column_name')),
    );
    assert.match(requiredColumnGuard, /actual\.column_name not in \( 'id', 'order_num', 'items', 'total', 'pickup_time', 'notes', 'size', 'status', 'payment_status', 'discount_code', 'discount_amount', 'user_id' \)/);
    assert.match(requiredColumnGuard, /actual\.is_nullable = 'no'/);
    assert.match(requiredColumnGuard, /actual\.column_default is null/);
    assert.match(requiredColumnGuard, /domain_type\.domain_default is null/);
    assert.match(requiredColumnGuard, /actual\.is_identity = 'no'/);
    assert.match(requiredColumnGuard, /actual\.is_generated = 'never'/);
    assert.match(requiredColumnGuard, /public\.orders has required columns not populated by create_order_idempotent/);
});

test('route recovers before mutable checks and never falls back to direct insert', () => {
    const ledgerLookup = route.indexOf(".from('order_creation_requests')");
    const menuValidation = route.indexOf('computeOrderTotal(');
    const hoursValidation = route.indexOf('shopStatus(');
    const rpc = route.indexOf(".rpc('create_order_idempotent'");
    assert.ok(ledgerLookup >= 0 && ledgerLookup < menuValidation);
    assert.ok(ledgerLookup < hoursValidation && hoursValidation < rpc);
    assert.doesNotMatch(route, /\.from\('orders'\)\s*\.insert\(/);
    assert.match(route, /ORDER_IDEMPOTENCY_NOT_READY/);
});

test('server fingerprint tracks semantic intent, not forged metadata or client price', () => {
    const first = parseOrderSubmissionIntent({
        items: [{ id: 'lettuce', he: 'חסה', price: 0 }],
        total: 54,
        pickupTime: ' 12:30 ',
        notes: '  בלי בצל\r\n ',
        size: 54,
        productType: 'salad',
        discountCode: ' bari10 ',
    }, false);
    const metadataChanged = parseOrderSubmissionIntent({
        items: [{ id: 'lettuce', he: 'forged', icon: 'tracker', price: 999 }],
        total: 9_999,
        pickupTime: '12:30',
        notes: 'בלי בצל',
        size: 54,
        productType: 'salad',
        discountCode: 'BARI10',
    }, false);
    assert.equal(first.valid, true);
    assert.equal(metadataChanged.valid, true);
    if (!first.valid || !metadataChanged.valid) return;
    assert.equal(
        orderSubmissionFingerprint(first.intent),
        orderSubmissionFingerprint(metadataChanged.intent),
    );

    const changedNotes = {
        ...metadataChanged.intent,
        notes: 'בלי עגבנייה',
    };
    assert.notEqual(
        orderSubmissionFingerprint(first.intent),
        orderSubmissionFingerprint(changedNotes),
    );
});

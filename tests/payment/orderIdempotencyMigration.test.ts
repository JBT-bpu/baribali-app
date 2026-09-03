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

test('atomic create preserves discount provenance with guarded schema types', () => {
    assert.match(sql, /discount_code.*?udt_name not in \('text', 'varchar'\)/);
    assert.match(sql, /discount_amount.*?udt_name not in \('int2', 'int4', 'int8'\)/);
    assert.match(
        sql,
        /alter table public\.orders add column if not exists discount_code text, add column if not exists discount_amount integer/,
    );
    assert.match(sql, /p_discount_amount > p_total/);
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

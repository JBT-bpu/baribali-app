import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationsUrl = new URL('../../supabase/migrations/', import.meta.url);
const files = readdirSync(migrationsUrl).sort();

function compact(name: string): string {
    return readFileSync(new URL(name, migrationsUrl), 'utf8')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

test('migration history contains the production baseline and both recorded live versions', () => {
    assert.deepEqual(files.slice(0, 3), [
        '20260808100000_base_schema.sql',
        '20260808120932_shop_state.sql',
        '20260808121915_orders_rls_remove_public_insert.sql',
    ]);
    assert.ok(files.includes('20260902184747_payment_foundation.sql'));
    assert.ok(files.includes('20260903120000_order_submission_idempotency.sql'));
    assert.ok(files.includes('20260903130000_server_only_table_privileges.sql'));
});

test('baseline can build the exact pre-payment application tables on a blank database', () => {
    const sql = compact('20260808100000_base_schema.sql');

    assert.match(sql, /create table if not exists public\.orders/);
    assert.match(sql, /id uuid primary key default gen_random_uuid\(\)/);
    assert.match(sql, /items jsonb not null/);
    assert.match(sql, /total integer not null/);
    assert.match(sql, /status text not null default 'waiting'/);
    assert.match(sql, /payment_status text not null default 'pending'/);
    assert.match(sql, /user_id uuid references auth\.users\(id\) on delete set null/);
    assert.match(sql, /create table if not exists public\.customer_tags/);
    assert.match(sql, /user_id uuid primary key references auth\.users\(id\) on delete cascade/);
    assert.match(sql, /alter table public\.orders enable row level security/);
    assert.match(sql, /alter table public\.customer_tags enable row level security/);
    assert.match(sql, /is incompatible with the baribali baseline/);
});

test('historical live migrations are represented by their recorded versions', () => {
    const shop = compact('20260808120932_shop_state.sql');
    const rls = compact('20260808121915_orders_rls_remove_public_insert.sql');

    assert.match(shop, /create table if not exists public\.shop_state/);
    assert.match(shop, /insert into public\.shop_state \(id\) values \(1\) on conflict \(id\) do nothing/);
    assert.match(shop, /alter table public\.shop_state enable row level security/);
    assert.match(rls, /drop policy if exists "insert orders" on public\.orders/);
});

test('forward hardening removes browser table privileges and covers the user foreign key', () => {
    const sql = compact('20260903130000_server_only_table_privileges.sql');
    const serverOnlyTables = [
        'orders',
        'customer_tags',
        'shop_state',
        'payment_attempts',
        'payment_events',
        'order_creation_requests',
    ];

    for (const table of serverOnlyTables) {
        assert.match(sql, new RegExp(
            `revoke all privileges on table public\\.${table} from public, anon, authenticated, service_role`,
        ));
        assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    }

    assert.match(sql, /grant select, insert, update, delete on table public\.orders to service_role/);
    assert.match(sql, /grant select, insert on table public\.order_creation_requests to service_role/);
    assert.match(sql, /revoke all privileges on sequence public\.payment_events_id_seq from public, anon, authenticated, service_role/);
    assert.match(sql, /grant usage on sequence public\.payment_events_id_seq to service_role/);
    assert.doesNotMatch(sql, /grant usage, select on sequence public\.payment_events_id_seq/);
    assert.match(sql, /create index if not exists orders_user_id_idx on public\.orders \(user_id\) where user_id is not null/);
});

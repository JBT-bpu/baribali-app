import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER = 'https://placeholder.supabase.co';

const url      = process.env.NEXT_PUBLIC_SUPABASE_URL      || PLACEHOLDER;
const anonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safe to call client-side too — only reads the NEXT_PUBLIC_ url, same as
// the anon client above. Centralizes the check that used to live inline
// in kitchen/page.tsx; API routes use this to fall back to the in-memory
// demo store (see src/lib/demoStore.ts) instead of hitting Supabase.
export function isSupabaseConfigured(): boolean {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(u && !u.includes('your-project'));
}

// Browser / client-side client (uses anon key, respects RLS)
export const supabase = createClient(url, anonKey);

// Server-side client (uses service role, bypasses RLS — API routes only)
export const supabaseAdmin = serviceKey
    ? createClient(url, serviceKey)
    : supabase; // fallback to anon if service key not set

/*
──────────────────────────────────────────────────────────────
  SUPABASE TABLE SETUP — run this SQL in your Supabase SQL editor
──────────────────────────────────────────────────────────────

create table orders (
  id           uuid primary key default gen_random_uuid(),
  order_num    text not null,           -- "BB-2847"
  items        jsonb not null,          -- [{id, he, icon, price}, ...]
  total        integer not null,        -- 72
  pickup_time  text,                    -- "12:30"
  notes        text,
  size         text,                    -- "S" | "M" | "L"
  status         text not null default 'waiting',
    -- waiting | preparing | ready | collected
  payment_status text not null default 'pending',
    -- pending | paid | paid_unverified | failed | pay_at_pickup
    -- paid_unverified = webhook reported success but has no cryptographic
    -- verification (no Tranzila signing secret configured) — kitchen must
    -- confirm payment at pickup, same as pay_at_pickup.
  user_id        uuid references auth.users(id) on delete set null,
    -- null for guest orders (guest-first: an account is never required);
    -- set server-side from a verified access token, never client-claimed.
  created_at     timestamptz default now()
);

-- If the table already exists without user_id (created pre-auth), run:
--   alter table orders add column if not exists user_id
--     uuid references auth.users(id) on delete set null;

-- Enable Row Level Security
alter table orders enable row level security;

-- Allow anyone to insert (customers submitting an order) — the row's total
-- is re-validated server-side in /api/orders before this ever runs, this
-- policy just lets the insert itself through.
create policy "insert orders" on orders for insert with check (true);

-- Deliberately NO public "read"/"update" policies. All reads (customer
-- order-status lookup, kitchen board) and writes (status updates) go through
-- API routes using supabaseAdmin (service-role, bypasses RLS) instead —
-- see src/app/api/orders/[id]/route.ts, src/app/api/kitchen/orders/route.ts,
-- src/app/api/orders/[id]/status/route.ts. The anon key can insert and
-- nothing else.
-- (Realtime isn't used either — the app polls the API routes instead, since
-- anon-client Realtime would need the same open read policy this avoids.)

*/

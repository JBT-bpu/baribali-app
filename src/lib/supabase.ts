import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER = 'https://placeholder.supabase.co';

const url      = process.env.NEXT_PUBLIC_SUPABASE_URL      || PLACEHOLDER;
const anonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    -- pending | paid | failed | pay_at_pickup
  created_at     timestamptz default now()
);

-- Enable Row Level Security
alter table orders enable row level security;

-- Allow anyone to insert (customers)
create policy "insert orders" on orders for insert with check (true);

-- Allow anyone to read (kitchen display)
create policy "read orders" on orders for select using (true);

-- Allow anyone to update status (kitchen display)
create policy "update status" on orders for update using (true);

-- Enable Realtime on this table
-- Go to Supabase Dashboard → Database → Replication → enable "orders" table

*/

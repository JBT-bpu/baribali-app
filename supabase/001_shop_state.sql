-- Live open/closed override for the shop.
--
-- The regular week (9:00-16:00, Friday early, Saturday closed) is config in
-- code — src/lib/shopHours.ts — because it changes rarely and a deploy is an
-- acceptable price. THIS table is the other half: "we are closed right now",
-- for a sick day, a delivery that did not arrive, or closing early. That cannot
-- be config in code, because a shop that ran out of chicken at 11am needs the
-- button to work at 11am.
--
-- One row, id = 1. `override` null means "follow the schedule".
--
-- Safe to run more than once. The app works WITHOUT this table — every read
-- falls back to the schedule — so applying it is not urgent and cannot break a
-- running deployment.

create table if not exists public.shop_state (
    id         smallint primary key default 1 check (id = 1),
    override   text check (override in ('open', 'closed')),
    note       text,
    updated_at timestamptz not null default now()
);

insert into public.shop_state (id) values (1) on conflict (id) do nothing;

-- Only the service role touches this. The board reads and writes it through
-- /api/shop, which is kitchen-authorised for writes; nothing goes direct from a
-- browser, so no policy is granted to anon or authenticated.
alter table public.shop_state enable row level security;

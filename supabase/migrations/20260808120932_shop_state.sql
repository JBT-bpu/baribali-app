-- Historical migration already recorded in the linked Supabase project.
-- Keeping the exact version in source makes a fresh database reproducible.

create table if not exists public.shop_state (
  id smallint primary key default 1 check (id = 1),
  override text check (override in ('open', 'closed')),
  note text,
  updated_at timestamptz not null default now()
);

insert into public.shop_state (id)
values (1)
on conflict (id) do nothing;

alter table public.shop_state enable row level security;

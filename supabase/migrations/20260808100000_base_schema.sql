-- Reproducible baseline for the application tables that pre-date the tracked
-- Supabase migration history.
--
-- This migration intentionally matches the schema inspected in production on
-- 2026-09-03. It is safe to include in an existing linked project: CREATE
-- TABLE IF NOT EXISTS leaves existing data untouched and the guard aborts if
-- an existing table is incompatible instead of trying to coerce it.

begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_num text not null,
  items jsonb not null,
  total integer not null,
  pickup_time text,
  notes text,
  size text,
  status text not null default 'waiting',
  payment_status text not null default 'pending',
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete set null,
  discount_code text,
  discount_amount integer
);

create table if not exists public.customer_tags (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discount_code text not null,
  updated_at timestamptz not null default now()
);

do $guard$
declare
  v_problem text;
begin
  select string_agg(
    expected.column_name || ' expected ' || expected.udt_name || ' nullable=' || expected.is_nullable,
    ', ' order by expected.ordinal_position
  )
    into v_problem
  from (
    values
      (1, 'id', 'uuid', 'NO'),
      (2, 'order_num', 'text', 'NO'),
      (3, 'items', 'jsonb', 'NO'),
      (4, 'total', 'int4', 'NO'),
      (5, 'pickup_time', 'text', 'YES'),
      (6, 'notes', 'text', 'YES'),
      (7, 'size', 'text', 'YES'),
      (8, 'status', 'text', 'NO'),
      (9, 'payment_status', 'text', 'NO'),
      (10, 'created_at', 'timestamptz', 'YES'),
      (11, 'user_id', 'uuid', 'YES'),
      (12, 'discount_code', 'text', 'YES'),
      (13, 'discount_amount', 'int4', 'YES')
  ) as expected(ordinal_position, column_name, udt_name, is_nullable)
  where not exists (
    select 1
    from information_schema.columns actual
    where actual.table_schema = 'public'
      and actual.table_name = 'orders'
      and actual.column_name = expected.column_name
      and actual.udt_name = expected.udt_name
      and actual.is_nullable = expected.is_nullable
  );

  if v_problem is not null then
    raise exception 'public.orders is incompatible with the BariBali baseline: %', v_problem;
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.orders'::regclass
      and constraint_record.contype = 'p'
      and pg_get_constraintdef(constraint_record.oid) = 'PRIMARY KEY (id)'
  ) then
    raise exception 'public.orders must have PRIMARY KEY (id)';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.orders'::regclass
      and constraint_record.contype = 'f'
      and pg_get_constraintdef(constraint_record.oid)
        = 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'
  ) then
    raise exception 'public.orders.user_id must reference auth.users(id) ON DELETE SET NULL';
  end if;

  select string_agg(
    expected.column_name || ' expected ' || expected.udt_name || ' nullable=' || expected.is_nullable,
    ', ' order by expected.ordinal_position
  )
    into v_problem
  from (
    values
      (1, 'user_id', 'uuid', 'NO'),
      (2, 'discount_code', 'text', 'NO'),
      (3, 'updated_at', 'timestamptz', 'NO')
  ) as expected(ordinal_position, column_name, udt_name, is_nullable)
  where not exists (
    select 1
    from information_schema.columns actual
    where actual.table_schema = 'public'
      and actual.table_name = 'customer_tags'
      and actual.column_name = expected.column_name
      and actual.udt_name = expected.udt_name
      and actual.is_nullable = expected.is_nullable
  );

  if v_problem is not null then
    raise exception 'public.customer_tags is incompatible with the BariBali baseline: %', v_problem;
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.customer_tags'::regclass
      and constraint_record.contype = 'p'
      and pg_get_constraintdef(constraint_record.oid) = 'PRIMARY KEY (user_id)'
  ) then
    raise exception 'public.customer_tags must have PRIMARY KEY (user_id)';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.customer_tags'::regclass
      and constraint_record.contype = 'f'
      and pg_get_constraintdef(constraint_record.oid)
        = 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'public.customer_tags.user_id must reference auth.users(id) ON DELETE CASCADE';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'id'
      and column_default is not null
  ) then
    raise exception 'public.orders.id must have a generated default';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name in ('status', 'payment_status', 'created_at')
      and column_default is not null
    group by table_schema, table_name
    having count(*) = 3
  ) then
    raise exception 'public.orders status, payment_status and created_at must have defaults';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customer_tags'
      and column_name = 'updated_at'
      and column_default is not null
  ) then
    raise exception 'public.customer_tags.updated_at must have a default';
  end if;
end
$guard$;

alter table public.orders enable row level security;
alter table public.customer_tags enable row level security;

commit;

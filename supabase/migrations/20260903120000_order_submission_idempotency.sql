-- Durable, server-only idempotency for order creation.
--
-- Keep this migration local until the live orders schema has been inspected.
-- It also captures the currently unversioned discount_code/discount_amount
-- fields defensively, so the atomic RPC preserves the route's current audit
-- data. Their live types still need inspection before this file is applied.

begin;

do $guard$
begin
  if to_regclass('public.orders') is null then
    raise exception 'order submission idempotency requires public.orders';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception 'public.orders.id must be uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'items'
      and udt_name = 'jsonb'
  ) then
    raise exception 'public.orders.items must be jsonb';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'total'
      and udt_name in ('int2', 'int4', 'int8')
  ) then
    raise exception 'public.orders.total must be an integer';
  end if;

  if exists (
    select 1
    from (
      values
        ('order_num', array['text', 'varchar']::text[]),
        ('pickup_time', array['text', 'varchar']::text[]),
        ('notes', array['text', 'varchar']::text[]),
        ('size', array['text', 'varchar']::text[]),
        ('status', array['text', 'varchar']::text[]),
        ('payment_status', array['text', 'varchar']::text[]),
        ('user_id', array['uuid']::text[]),
        ('created_at', array['timestamptz']::text[])
    ) as expected(column_name, allowed_types)
    where not exists (
      select 1
      from information_schema.columns actual
      where actual.table_schema = 'public'
        and actual.table_name = 'orders'
        and actual.column_name = expected.column_name
        and actual.udt_name = any(expected.allowed_types)
    )
  ) then
    raise exception 'public.orders base columns do not match the documented schema';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'discount_code'
      and (
        udt_name not in ('text', 'varchar')
        or (udt_name = 'varchar' and character_maximum_length < 64)
      )
  ) then
    raise exception 'public.orders.discount_code must be text when present';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'discount_amount'
      and udt_name not in ('int2', 'int4', 'int8')
  ) then
    raise exception 'public.orders.discount_amount must be an integer when present';
  end if;
end
$guard$;

-- The route already records these fields when a discount wins, but their
-- schema had never been captured in source control. Nullable additions keep
-- legacy rows untouched; the guard above refuses incompatible live types.
alter table public.orders
  add column if not exists discount_code text,
  add column if not exists discount_amount integer;

-- Keep request secrets out of orders: several existing kitchen/customer reads
-- intentionally select the complete order row. This ledger has no client RLS
-- policy and is reachable only through service-role server code.
create table public.order_creation_requests (
  idempotency_key uuid primary key,
  intent_version smallint not null,
  intent_hash text not null,
  order_id uuid not null unique,
  created_at timestamptz not null default now(),

  constraint order_creation_requests_version_check
    check (intent_version > 0),
  constraint order_creation_requests_hash_check
    check (intent_hash ~ '^[0-9a-f]{64}$'),
  constraint order_creation_requests_order_fkey
    foreign key (order_id)
    references public.orders(id)
    on delete restrict
    deferrable initially deferred
);

alter table public.order_creation_requests enable row level security;

revoke all privileges on table public.order_creation_requests
  from public, anon, authenticated, service_role;
grant select, insert on table public.order_creation_requests to service_role;

-- Claim the request key before creating the order. The deferred FK lets the
-- winner insert the ledger row first and the order second in one transaction.
-- A concurrent loser waits on the primary key; after the winner commits, its
-- next statement can safely read and replay that winner's order. If the winner
-- rolls back, the loser claims the key and creates the only order instead.
create or replace function public.create_order_idempotent(
  p_idempotency_key uuid,
  p_intent_version smallint,
  p_intent_hash text,
  p_order_num text,
  p_items jsonb,
  p_total integer,
  p_pickup_time text,
  p_notes text,
  p_size text,
  p_payment_status text,
  p_discount_code text,
  p_discount_amount integer,
  p_user_id uuid
)
returns table (
  result text,
  result_order_id uuid,
  result_order_num text,
  result_created_at timestamptz,
  result_payment_status text
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_order_id uuid := gen_random_uuid();
  v_claimed boolean := false;
  v_request public.order_creation_requests%rowtype;
  v_order public.orders%rowtype;
begin
  if p_idempotency_key is null
     or p_intent_version is null
     or p_intent_version <= 0
     or p_intent_hash is null
     or p_intent_hash !~ '^[0-9a-f]{64}$'
     or p_order_num is null
     or btrim(p_order_num) = ''
     or char_length(p_order_num) > 32
     or p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) > 100
     or p_total is null
     or p_total < 0
     or (p_pickup_time is not null and char_length(p_pickup_time) > 32)
     or (p_notes is not null and char_length(p_notes) > 200)
     or p_size is null
     or btrim(p_size) = ''
     or char_length(p_size) > 32
     or p_payment_status not in ('pending', 'pay_at_pickup')
     or p_discount_amount is null
     or p_discount_amount < 0
     or p_discount_amount > p_total
     or (p_discount_code is null and p_discount_amount <> 0)
     or (
       p_discount_code is not null
       and (
         btrim(p_discount_code) = ''
         or char_length(p_discount_code) > 64
       )
     ) then
    raise exception 'invalid idempotent order arguments' using errcode = '22023';
  end if;

  insert into public.order_creation_requests (
    idempotency_key,
    intent_version,
    intent_hash,
    order_id
  ) values (
    p_idempotency_key,
    p_intent_version,
    p_intent_hash,
    v_order_id
  )
  on conflict (idempotency_key) do nothing
  returning true into v_claimed;

  if v_claimed then
    insert into public.orders (
      id,
      order_num,
      items,
      total,
      pickup_time,
      notes,
      size,
      status,
      payment_status,
      discount_code,
      discount_amount,
      user_id
    ) values (
      v_order_id,
      p_order_num,
      p_items,
      p_total,
      p_pickup_time,
      p_notes,
      p_size,
      'waiting',
      p_payment_status,
      p_discount_code,
      p_discount_amount,
      p_user_id
    )
    returning * into v_order;

    return query select
      'created'::text,
      v_order.id,
      v_order.order_num,
      v_order.created_at,
      v_order.payment_status;
    return;
  end if;

  select request.*
    into v_request
  from public.order_creation_requests request
  where request.idempotency_key = p_idempotency_key;

  if not found then
    -- Under READ COMMITTED the conflict wait above makes the committed row
    -- visible to this new statement. Treat any contrary state as unavailable,
    -- never as permission to create an untracked second order.
    raise exception 'ORDER_IDEMPOTENCY_CLAIM_MISSING' using errcode = 'P0001';
  end if;

  if v_request.intent_version <> p_intent_version
     or v_request.intent_hash <> p_intent_hash then
    return query select
      'conflict'::text,
      null::uuid,
      null::text,
      null::timestamptz,
      null::text;
    return;
  end if;

  select orders.*
    into v_order
  from public.orders orders
  where orders.id = v_request.order_id;

  if not found then
    raise exception 'ORDER_IDEMPOTENCY_ORDER_MISSING' using errcode = 'P0001';
  end if;

  return query select
    'replayed'::text,
    v_order.id,
    v_order.order_num,
    v_order.created_at,
    v_order.payment_status;
end
$function$;

revoke execute on function public.create_order_idempotent(
  uuid, smallint, text, text, jsonb, integer, text, text, text, text, text, integer, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.create_order_idempotent(
  uuid, smallint, text, text, jsonb, integer, text, text, text, text, text, integer, uuid
) to service_role;

commit;

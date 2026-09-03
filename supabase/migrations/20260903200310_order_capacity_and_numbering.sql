-- Make human order numbers durable and pickup capacity atomic.
--
-- A pickup allocation is deliberately immutable for the service day. Pending
-- Hyp pages cannot be expired safely yet, failed payments can be retried, and
-- a collected kitchen ticket can be undone. Releasing any of those rows would
-- therefore allow a later payment/status transition to overbook the kitchen.

begin;

lock table public.orders in access exclusive mode;

do $preflight$
declare
  v_max_numeric numeric;
begin
  if to_regclass('public.order_creation_requests') is null then
    raise exception 'order capacity requires public.order_creation_requests';
  end if;

  if exists (
    select 1
    from public.orders
    group by order_num
    having count(*) > 1
  ) then
    raise exception 'public.orders contains duplicate order_num values';
  end if;

  if exists (
    select 1
    from public.orders
    where pickup_time is not null
      and order_num not like 'SIM-%'
      and pickup_time !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][05]$'
  ) then
    raise exception 'public.orders contains an invalid pickup_time';
  end if;

  select max((substring(order_num from '^BB-([0-9]+)$'))::numeric)
    into v_max_numeric
  from public.orders
  where order_num ~ '^BB-[0-9]+$';

  if v_max_numeric >= 9223372036854775807::numeric then
    raise exception 'public.orders numeric order number space is exhausted';
  end if;
end
$preflight$;

create sequence public.orders_order_num_seq
  as bigint
  increment by 1
  minvalue 1
  start with 1000
  no cycle;

do $seed_order_numbers$
declare
  v_max_existing numeric;
  v_next bigint;
begin
  select max((substring(order_num from '^BB-([0-9]+)$'))::numeric)
    into v_max_existing
  from public.orders
  where order_num ~ '^BB-[0-9]+$';

  v_next := greatest(1000, coalesce(v_max_existing::bigint + 1, 1000));
  perform pg_catalog.setval('public.orders_order_num_seq'::regclass, v_next, false);
end
$seed_order_numbers$;

alter sequence public.orders_order_num_seq
  owned by public.orders.order_num;

alter table public.orders
  alter column order_num set default (
    'BB-' || pg_catalog.nextval('public.orders_order_num_seq'::regclass)::text
  ),
  add constraint orders_order_num_key unique (order_num);

revoke all privileges on sequence public.orders_order_num_seq
  from public, anon, authenticated, service_role;
grant usage on sequence public.orders_order_num_seq to service_role;

create table public.order_pickup_allocations (
  order_id uuid primary key,
  service_date date not null,
  pickup_time text not null,
  capacity_position smallint not null,
  created_at timestamptz not null default now(),

  constraint order_pickup_allocations_order_fkey
    foreign key (order_id)
    references public.orders(id)
    on delete restrict
    deferrable initially deferred,
  constraint order_pickup_allocations_slot_position_key
    unique (service_date, pickup_time, capacity_position),
  constraint order_pickup_allocations_position_check
    check (capacity_position between 1 and 5),
  constraint order_pickup_allocations_time_check
    check (pickup_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][05]$')
);

alter table public.order_pickup_allocations enable row level security;

revoke all privileges on table public.order_pickup_allocations
  from public, anon, authenticated, service_role;
grant select, insert on table public.order_pickup_allocations to service_role;

-- Preserve every historical real timed order in the audit ledger. This has no
-- effect on today's availability, but proves the migration can account for the
-- existing table without silently hiding an already-overbooked slot.
do $backfill_guard$
begin
  if exists (
    select 1
    from (
      select row_number() over (
        partition by
          (pg_catalog.timezone('Asia/Jerusalem', created_at))::date,
          pickup_time
        order by created_at, id
      ) as capacity_position
      from public.orders
      where pickup_time is not null
        and order_num not like 'SIM-%'
    ) ranked
    where ranked.capacity_position > 5
  ) then
    raise exception 'public.orders contains an overbooked historical pickup slot';
  end if;
end
$backfill_guard$;

insert into public.order_pickup_allocations (
  order_id,
  service_date,
  pickup_time,
  capacity_position,
  created_at
)
select
  ranked.id,
  ranked.service_date,
  ranked.pickup_time,
  ranked.capacity_position::smallint,
  ranked.created_at
from (
  select
    id,
    (pg_catalog.timezone('Asia/Jerusalem', created_at))::date as service_date,
    pickup_time,
    row_number() over (
      partition by
        (pg_catalog.timezone('Asia/Jerusalem', created_at))::date,
        pickup_time
      order by created_at, id
    ) as capacity_position,
    created_at
  from public.orders
  where pickup_time is not null
    and order_num not like 'SIM-%'
) ranked;

-- Defense in depth: every future real timed order must have a matching durable
-- allocation at commit. Rehearsal SIM-* rows and manual-override orders without
-- a time are intentionally exempt.
create function public.assert_order_pickup_allocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.pickup_time is null or new.order_num like 'SIM-%' then
    return new;
  end if;

  if not exists (
    select 1
    from public.order_pickup_allocations allocation
    where allocation.order_id = new.id
      and allocation.service_date =
        (pg_catalog.timezone('Asia/Jerusalem', new.created_at))::date
      and allocation.pickup_time = new.pickup_time
  ) then
    raise exception 'ORDER_PICKUP_ALLOCATION_REQUIRED' using errcode = '23514';
  end if;

  return new;
end
$function$;

revoke execute on function public.assert_order_pickup_allocation()
  from public, anon, authenticated, service_role;
grant execute on function public.assert_order_pickup_allocation()
  to service_role;

create constraint trigger orders_require_pickup_allocation
after insert or update of order_num, pickup_time, created_at
on public.orders
deferrable initially deferred
for each row
execute function public.assert_order_pickup_allocation();

-- Replace the pre-capacity RPC. Removing the obsolete p_order_num parameter is
-- intentional: PostgREST should expose one unambiguous signature, and the
-- database default is now the sole source of human order numbers.
drop function if exists public.create_order_idempotent(
  uuid, smallint, text, text, jsonb, integer, text, text, text, text, text, integer, uuid
);

create function public.create_order_idempotent(
  p_idempotency_key uuid,
  p_intent_version smallint,
  p_intent_hash text,
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
  v_allocated boolean := false;
  v_capacity_position smallint;
  v_service_date date := (
    pg_catalog.timezone('Asia/Jerusalem', pg_catalog.transaction_timestamp())
  )::date;
  v_request public.order_creation_requests%rowtype;
  v_order public.orders%rowtype;
begin
  if p_idempotency_key is null
     or p_intent_version is null
     or p_intent_version <= 0
     or p_intent_hash is null
     or p_intent_hash !~ '^[0-9a-f]{64}$'
     or p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) > 100
     or p_total is null
     or p_total < 0
     or (
       p_pickup_time is not null
       and p_pickup_time !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][05]$'
     )
     or (p_notes is not null and char_length(p_notes) > 200)
     or p_size is null
     or btrim(p_size) = ''
     or char_length(p_size) > 32
     or p_payment_status is null
     or p_payment_status not in ('pending', 'pay_at_pickup', 'no_payment_required')
     or (p_total = 0 and p_payment_status <> 'no_payment_required')
     or (p_total > 0 and p_payment_status = 'no_payment_required')
     or p_discount_amount is null
     or p_discount_amount < 0
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
    if p_pickup_time is not null then
      for v_capacity_position in 1..5 loop
        v_allocated := false;

        insert into public.order_pickup_allocations (
          order_id,
          service_date,
          pickup_time,
          capacity_position
        ) values (
          v_order_id,
          v_service_date,
          p_pickup_time,
          v_capacity_position
        )
        on conflict on constraint order_pickup_allocations_slot_position_key
          do nothing
        returning true into v_allocated;

        exit when coalesce(v_allocated, false);
      end loop;

      if not coalesce(v_allocated, false) then
        raise exception 'PICKUP_SLOT_FULL' using errcode = 'P0001';
      end if;
    end if;

    insert into public.orders (
      id,
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
  uuid, smallint, text, jsonb, integer, text, text, text, text, text, integer, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.create_order_idempotent(
  uuid, smallint, text, jsonb, integer, text, text, text, text, text, integer, uuid
) to service_role;

commit;

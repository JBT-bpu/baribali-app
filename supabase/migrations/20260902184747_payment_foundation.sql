-- Durable, idempotent payment attempts for the hosted Hyp flow.
--
-- Keep this migration local until the dormant Supabase project is restored
-- and its live `orders` schema has been inspected. Existing orders are not
-- rewritten, and the human-facing order_num is no longer used as the payment
-- correlation key.

begin;

do $guard$
begin
  if to_regclass('public.orders') is null then
    raise exception 'payment foundation requires public.orders';
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
      and column_name = 'total'
      and udt_name in ('int2', 'int4', 'int8')
  ) then
    raise exception 'public.orders.total must be a whole-shekel integer';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'payment_status'
      and udt_name in ('text', 'varchar')
  ) then
    raise exception 'public.orders.payment_status must be text';
  end if;
end
$guard$;

create table public.payment_attempts (
  id                         uuid primary key default gen_random_uuid(),
  order_id                   uuid not null
                               references public.orders(id) on delete restrict,
  attempt_no                 smallint not null,
  provider                   text not null,
  idempotency_key            uuid not null,
  merchant_reference         text not null,
  amount_agorot              bigint not null,
  currency_code              text not null default 'ILS',
  status                     text not null default 'initializing',
  checkout_url               text,
  lease_token                uuid,
  lease_expires_at           timestamptz,
  provider_transaction_id    text,
  provider_code              text,
  verification_method        text,
  last_error_code            text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  settled_at                 timestamptz,

  constraint payment_attempts_attempt_no_check
    check (attempt_no > 0),
  constraint payment_attempts_provider_check
    check (
      provider = lower(btrim(provider))
      and provider <> ''
      and char_length(provider) <= 40
    ),
  constraint payment_attempts_reference_check
    check (
      btrim(merchant_reference) <> ''
      and char_length(merchant_reference) <= 128
    ),
  constraint payment_attempts_amount_check
    check (amount_agorot > 0),
  constraint payment_attempts_currency_check
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint payment_attempts_checkout_url_check
    check (
      checkout_url is null
      or (
        checkout_url ~ '^https://'
        and char_length(checkout_url) <= 8192
      )
    ),
  constraint payment_attempts_provider_transaction_check
    check (
      provider_transaction_id is null
      or (
        btrim(provider_transaction_id) <> ''
        and char_length(provider_transaction_id) <= 256
      )
    ),
  constraint payment_attempts_codes_check
    check (
      (provider_code is null or char_length(provider_code) <= 120)
      and (verification_method is null or char_length(verification_method) <= 120)
      and (last_error_code is null or char_length(last_error_code) <= 120)
    ),
  constraint payment_attempts_status_check
    check (status in (
      'initializing',
      'checkout_ready',
      'verification_pending',
      'paid',
      'declined',
      'init_failed',
      'needs_review',
      'duplicate_paid',
      'superseded',
      'cancelled',
      'expired'
    )),
  constraint payment_attempts_paid_shape_check
    check (
      status not in ('paid', 'duplicate_paid')
      or (
        provider_transaction_id is not null
        and settled_at is not null
      )
    ),
  constraint payment_attempts_order_attempt_unique
    unique (order_id, attempt_no),
  constraint payment_attempts_provider_idempotency_unique
    unique (provider, idempotency_key),
  constraint payment_attempts_provider_reference_unique
    unique (provider, merchant_reference)
);

create unique index payment_attempts_provider_transaction_uidx
  on public.payment_attempts (provider, provider_transaction_id)
  where provider_transaction_id is not null;

create unique index payment_attempts_one_active_per_order_uidx
  on public.payment_attempts (order_id)
  where status in (
    'initializing',
    'checkout_ready',
    'verification_pending',
    'needs_review'
  );

create index payment_attempts_order_created_idx
  on public.payment_attempts (order_id, created_at desc);

create index payment_attempts_reconciliation_idx
  on public.payment_attempts (updated_at)
  where status in ('verification_pending', 'needs_review');

create table public.payment_events (
  id                         bigint generated always as identity primary key,
  attempt_id                 uuid
                               references public.payment_attempts(id)
                               on delete restrict,
  provider                   text not null,
  merchant_reference         text not null,
  event_key                  text not null,
  event_source               text not null,
  event_type                 text not null,
  provider_transaction_id    text,
  provider_code              text,
  amount_agorot              bigint,
  currency_code              text,
  verified                   boolean not null default false,
  outcome                    text not null default 'received',
  error_code                 text,
  payload_safe               jsonb not null default '{}'::jsonb,
  received_at                timestamptz not null default now(),
  processed_at               timestamptz,

  constraint payment_events_provider_check
    check (
      provider = lower(btrim(provider))
      and provider <> ''
      and char_length(provider) <= 40
    ),
  constraint payment_events_reference_check
    check (
      btrim(merchant_reference) <> ''
      and char_length(merchant_reference) <= 128
    ),
  constraint payment_events_event_key_check
    check (btrim(event_key) <> '' and char_length(event_key) <= 128),
  constraint payment_events_source_check
    check (
      event_source in (
        'application',
        'browser_return',
        'server_notification',
        'reconciliation'
      )
    ),
  constraint payment_events_type_check
    check (btrim(event_type) <> '' and char_length(event_type) <= 64),
  constraint payment_events_provider_transaction_check
    check (
      provider_transaction_id is null
      or (
        btrim(provider_transaction_id) <> ''
        and char_length(provider_transaction_id) <= 256
      )
    ),
  constraint payment_events_values_check
    check (
      (provider_code is null or char_length(provider_code) <= 120)
      and (amount_agorot is null or amount_agorot > 0)
      and (currency_code is null or currency_code ~ '^[A-Z]{3}$')
      and (error_code is null or char_length(error_code) <= 120)
    ),
  constraint payment_events_payload_check
    check (
      jsonb_typeof(payload_safe) = 'object'
      and octet_length(payload_safe::text) <= 8192
    )
);

create unique index payment_events_provider_event_key_uidx
  on public.payment_events (provider, event_key);

create index payment_events_attempt_received_idx
  on public.payment_events (attempt_id, received_at desc);

create index payment_events_provider_transaction_idx
  on public.payment_events (provider, provider_transaction_id)
  where provider_transaction_id is not null;

alter table public.orders
  add column if not exists current_payment_attempt_id uuid,
  add column if not exists payment_status_updated_at timestamptz;

do $constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_current_payment_attempt_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_current_payment_attempt_fkey
      foreign key (current_payment_attempt_id)
      references public.payment_attempts(id)
      on delete set null;
  end if;
end
$constraint$;

create index if not exists orders_current_payment_attempt_idx
  on public.orders (current_payment_attempt_id)
  where current_payment_attempt_id is not null;

alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;

-- Server-only tables. RLS is defense in depth; grants are explicit because
-- Data API exposure and Postgres privileges are separate controls.
revoke all privileges on table public.payment_attempts
  from public, anon, authenticated, service_role;
revoke all privileges on table public.payment_events
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.payment_attempts to service_role;
grant select, insert, update
  on table public.payment_events to service_role;

revoke all privileges on sequence public.payment_events_id_seq
  from public, anon, authenticated;
grant usage, select on sequence public.payment_events_id_seq to service_role;

-- Claim exactly one active payment attempt. The order row is the concurrency
-- lock, so the Hyp network call always happens after this short transaction.
create or replace function public.claim_payment_attempt(
  p_order_id uuid,
  p_provider text,
  p_idempotency_key uuid,
  p_lease_token uuid
)
returns table (
  attempt_id uuid,
  attempt_order_id uuid,
  attempt_provider text,
  merchant_reference text,
  amount_agorot bigint,
  currency_code text,
  attempt_status text,
  checkout_url text,
  created_new boolean,
  lease_owned boolean
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_provider text := lower(btrim(p_provider));
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_attempt_id uuid;
  v_attempt_no smallint;
begin
  if p_order_id is null
     or p_idempotency_key is null
     or p_lease_token is null
     or v_provider is null
     or v_provider = ''
     or char_length(v_provider) > 40 then
    raise exception 'order, provider, idempotency key and lease token are required'
      using errcode = '22023';
  end if;

  select o.*
    into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'PAYMENT_ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.payment_status in ('paid', 'paid_unverified', 'pay_at_pickup') then
    raise exception 'PAYMENT_ORDER_NOT_PAYABLE' using errcode = 'P0001';
  end if;

  -- An abandoned initializer can be replaced after its short lease. A hosted
  -- checkout page is never expired automatically because Hyp may still accept
  -- it in another browser tab; replacing it could create a second live page.
  -- Verification-pending attempts likewise require reconciliation.
  update public.payment_attempts a
  set status = 'expired',
      lease_token = null,
      lease_expires_at = null,
      updated_at = now()
  where a.order_id = p_order_id
    and a.status = 'initializing'
    and a.lease_expires_at is not null
    and a.lease_expires_at <= now();

  select a.*
    into v_attempt
  from public.payment_attempts a
  where a.provider = v_provider
    and a.idempotency_key = p_idempotency_key;

  if found then
    if v_attempt.order_id <> p_order_id then
      raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;

    return query select
      v_attempt.id,
      v_attempt.order_id,
      v_attempt.provider,
      v_attempt.merchant_reference,
      v_attempt.amount_agorot,
      v_attempt.currency_code,
      v_attempt.status,
      v_attempt.checkout_url,
      false,
      v_attempt.status = 'initializing'
        and v_attempt.lease_token = p_lease_token
        and v_attempt.lease_expires_at > now();
    return;
  end if;

  select a.*
    into v_attempt
  from public.payment_attempts a
  where a.order_id = p_order_id
    and a.status in (
      'initializing',
      'checkout_ready',
      'verification_pending',
      'needs_review'
    )
  order by a.created_at desc
  limit 1;

  if found then
    return query select
      v_attempt.id,
      v_attempt.order_id,
      v_attempt.provider,
      v_attempt.merchant_reference,
      v_attempt.amount_agorot,
      v_attempt.currency_code,
      v_attempt.status,
      v_attempt.checkout_url,
      false,
      false;
    return;
  end if;

  select (coalesce(max(a.attempt_no), 0) + 1)::smallint
    into v_attempt_no
  from public.payment_attempts a
  where a.order_id = p_order_id;

  v_attempt_id := gen_random_uuid();

  insert into public.payment_attempts (
    id,
    order_id,
    attempt_no,
    provider,
    idempotency_key,
    merchant_reference,
    amount_agorot,
    currency_code,
    status,
    lease_token,
    lease_expires_at
  ) values (
    v_attempt_id,
    p_order_id,
    v_attempt_no,
    v_provider,
    p_idempotency_key,
    'BBP-' || replace(v_attempt_id::text, '-', ''),
    round(v_order.total::numeric * 100)::bigint,
    'ILS',
    'initializing',
    p_lease_token,
    now() + interval '2 minutes'
  )
  returning * into v_attempt;

  update public.orders
  set current_payment_attempt_id = v_attempt.id,
      payment_status = 'pending',
      payment_status_updated_at = now()
  where id = p_order_id;

  insert into public.payment_events (
    attempt_id,
    provider,
    merchant_reference,
    event_key,
    event_source,
    event_type,
    outcome,
    processed_at
  ) values (
    v_attempt.id,
    v_attempt.provider,
    v_attempt.merchant_reference,
    'attempt:' || v_attempt.id::text,
    'application',
    'attempt_created',
    'created',
    now()
  );

  return query select
    v_attempt.id,
    v_attempt.order_id,
    v_attempt.provider,
    v_attempt.merchant_reference,
    v_attempt.amount_agorot,
    v_attempt.currency_code,
    v_attempt.status,
    v_attempt.checkout_url,
    true,
    true;
end
$function$;

-- Persist the hosted checkout URL before it is returned to the browser. Only
-- the caller holding the short initialization lease can finalize it.
create or replace function public.finish_payment_initialization(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_checkout_url text,
  p_error_code text default null
)
returns table (
  attempt_id uuid,
  attempt_order_id uuid,
  attempt_status text,
  checkout_url text
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_order_id uuid;
  v_attempt public.payment_attempts%rowtype;
  v_success boolean := p_checkout_url is not null;
begin
  select a.order_id
    into v_order_id
  from public.payment_attempts a
  where a.id = p_attempt_id;

  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform 1 from public.orders o where o.id = v_order_id for update;
  select a.* into v_attempt
  from public.payment_attempts a
  where a.id = p_attempt_id
  for update;

  if v_attempt.status = 'checkout_ready' and v_attempt.checkout_url is not null then
    return query select
      v_attempt.id, v_attempt.order_id, v_attempt.status, v_attempt.checkout_url;
    return;
  end if;

  if v_attempt.status <> 'initializing'
     or v_attempt.lease_token is distinct from p_lease_token
     or v_attempt.lease_expires_at <= now() then
    raise exception 'PAYMENT_INITIALIZATION_LEASE_LOST' using errcode = 'P0001';
  end if;

  if v_success and (
    btrim(p_checkout_url) = ''
    or char_length(p_checkout_url) > 8192
  ) then
    raise exception 'PAYMENT_CHECKOUT_URL_INVALID' using errcode = '22023';
  end if;

  update public.payment_attempts
  set status = case when v_success then 'checkout_ready' else 'init_failed' end,
      checkout_url = case when v_success then p_checkout_url else null end,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = case
        when v_success then null
        else left(coalesce(p_error_code, 'gateway_initialization_failed'), 120)
      end,
      updated_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  if not v_success then
    update public.orders
    set current_payment_attempt_id = null,
        payment_status_updated_at = now()
    where id = v_attempt.order_id
      and current_payment_attempt_id = v_attempt.id;
  end if;

  insert into public.payment_events (
    attempt_id,
    provider,
    merchant_reference,
    event_key,
    event_source,
    event_type,
    outcome,
    error_code,
    processed_at
  ) values (
    v_attempt.id,
    v_attempt.provider,
    v_attempt.merchant_reference,
    'initialization:' || v_attempt.id::text,
    'application',
    'initialization_finished',
    case when v_success then 'checkout_ready' else 'init_failed' end,
    case when v_success then null else v_attempt.last_error_code end,
    now()
  )
  on conflict (provider, event_key) do nothing;

  return query select
    v_attempt.id, v_attempt.order_id, v_attempt.status, v_attempt.checkout_url;
end
$function$;

-- Durably record a callback before the application contacts Hyp VERIFY. This
-- transaction never performs network work and therefore holds locks briefly.
create or replace function public.record_payment_callback(
  p_provider text,
  p_merchant_reference text,
  p_event_key text,
  p_event_source text,
  p_provider_transaction_id text,
  p_payload_safe jsonb default '{}'::jsonb
)
returns table (
  event_id bigint,
  attempt_id uuid,
  attempt_order_id uuid,
  amount_agorot bigint,
  currency_code text,
  attempt_status text,
  duplicate_event boolean
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_provider text := lower(btrim(p_provider));
  v_reference text := btrim(p_merchant_reference);
  v_event_key text := btrim(p_event_key);
  v_transaction_id text := nullif(btrim(p_provider_transaction_id), '');
  v_order_id uuid;
  v_attempt public.payment_attempts%rowtype;
  v_event public.payment_events%rowtype;
  v_duplicate boolean := false;
begin
  if v_provider is null
     or v_provider = ''
     or char_length(v_provider) > 40
     or v_reference is null
     or v_reference = ''
     or char_length(v_reference) > 128
     or v_event_key is null
     or v_event_key = ''
     or char_length(v_event_key) > 128
     or p_event_source not in (
       'browser_return',
       'server_notification',
       'reconciliation'
     )
     or (v_transaction_id is not null and char_length(v_transaction_id) > 256) then
    raise exception 'provider, merchant reference and event key are required'
      using errcode = '22023';
  end if;

  if p_payload_safe is null
     or jsonb_typeof(p_payload_safe) <> 'object'
     or octet_length(p_payload_safe::text) > 8192 then
    raise exception 'payload_safe must be an object no larger than 8 KiB'
      using errcode = '22023';
  end if;

  select a.order_id
    into v_order_id
  from public.payment_attempts a
  where a.provider = v_provider
    and a.merchant_reference = v_reference;

  if not found then
    insert into public.payment_events (
      attempt_id,
      provider,
      merchant_reference,
      event_key,
      event_source,
      event_type,
      provider_transaction_id,
      outcome,
      payload_safe,
      processed_at
    ) values (
      null,
      v_provider,
      v_reference,
      v_event_key,
      p_event_source,
      'callback_received',
      v_transaction_id,
      'unknown_reference',
      p_payload_safe,
      now()
    )
    on conflict (provider, event_key) do nothing
    returning * into v_event;

    if not found then
      select e.* into v_event
      from public.payment_events e
      where e.provider = v_provider and e.event_key = v_event_key;
      v_duplicate := true;
    end if;

    return query select
      v_event.id,
      null::uuid,
      null::uuid,
      null::bigint,
      null::text,
      'unknown_reference'::text,
      v_duplicate;
    return;
  end if;

  perform 1 from public.orders o where o.id = v_order_id for update;
  select a.* into v_attempt
  from public.payment_attempts a
  where a.provider = v_provider
    and a.merchant_reference = v_reference
  for update;

  insert into public.payment_events (
    attempt_id,
    provider,
    merchant_reference,
    event_key,
    event_source,
    event_type,
    provider_transaction_id,
    outcome,
    payload_safe
  ) values (
    v_attempt.id,
    v_provider,
    v_reference,
    v_event_key,
    p_event_source,
    'callback_received',
    v_transaction_id,
    'received',
    p_payload_safe
  )
  on conflict (provider, event_key) do nothing
  returning * into v_event;

  if not found then
    select e.* into v_event
    from public.payment_events e
    where e.provider = v_provider and e.event_key = v_event_key;
    v_duplicate := true;
  end if;

  if v_attempt.status not in ('paid', 'duplicate_paid') then
    update public.payment_attempts
    set status = 'verification_pending',
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.orders
    set current_payment_attempt_id = v_attempt.id,
        payment_status = case
          when payment_status in ('paid', 'paid_unverified') then payment_status
          else 'pending'
        end,
        payment_status_updated_at = now()
    where id = v_attempt.order_id;
  end if;

  return query select
    v_event.id,
    v_attempt.id,
    v_attempt.order_id,
    v_attempt.amount_agorot,
    v_attempt.currency_code,
    v_attempt.status,
    v_duplicate;
end
$function$;

-- Apply the result of server-side VERIFY. `approved` is the only outcome that
-- can make an order paid. Unknown/non-terminal codes stay pending until the
-- legacy Hyp payload contract is confirmed from the test terminal.
create or replace function public.apply_payment_verification(
  p_event_id bigint,
  p_outcome text,
  p_provider_transaction_id text,
  p_reported_amount_agorot bigint,
  p_currency_code text,
  p_provider_code text,
  p_verification_method text,
  p_payload_safe jsonb default '{}'::jsonb
)
returns table (
  result text,
  result_order_id uuid,
  result_attempt_id uuid,
  order_payment_status text
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_outcome text := lower(btrim(p_outcome));
  v_transaction_id text := nullif(btrim(p_provider_transaction_id), '');
  v_currency text := upper(btrim(p_currency_code));
  v_order_id uuid;
  v_event public.payment_events%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_conflicting_attempt uuid;
  v_result text;
begin
  if p_event_id is null
     or v_outcome is null
     or v_outcome not in ('approved', 'verification_pending') then
    raise exception 'event id and a supported verification outcome are required'
      using errcode = '22023';
  end if;

  if v_transaction_id is not null and char_length(v_transaction_id) > 256 then
    raise exception 'provider transaction id is too long'
      using errcode = '22023';
  end if;

  if p_payload_safe is null
     or jsonb_typeof(p_payload_safe) <> 'object'
     or octet_length(p_payload_safe::text) > 8192 then
    raise exception 'payload_safe must be an object no larger than 8 KiB'
      using errcode = '22023';
  end if;

  select e.* into v_event
  from public.payment_events e
  where e.id = p_event_id;

  if not found or v_event.attempt_id is null then
    return query select
      'unknown_reference'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  select a.order_id into v_order_id
  from public.payment_attempts a
  where a.id = v_event.attempt_id;

  select o.* into v_order
  from public.orders o
  where o.id = v_order_id
  for update;

  select a.* into v_attempt
  from public.payment_attempts a
  where a.id = v_event.attempt_id
  for update;

  select e.* into v_event
  from public.payment_events e
  where e.id = p_event_id
  for update;

  if v_event.processed_at is not null then
    return query select
      'duplicate_event'::text,
      v_order.id,
      v_attempt.id,
      v_order.payment_status;
    return;
  end if;

  if v_outcome = 'verification_pending' then
    if v_attempt.status not in ('paid', 'duplicate_paid') then
      update public.payment_attempts
      set status = 'verification_pending',
          provider_code = left(p_provider_code, 120),
          verification_method = left(p_verification_method, 120),
          last_error_code = 'verification_pending',
          updated_at = now()
      where id = v_attempt.id
      returning * into v_attempt;
    end if;

    update public.payment_events
    set provider_transaction_id = v_transaction_id,
        provider_code = left(p_provider_code, 120),
        amount_agorot = p_reported_amount_agorot,
        currency_code = nullif(v_currency, ''),
        verified = false,
        outcome = 'verification_pending',
        error_code = 'verification_pending',
        payload_safe = v_event.payload_safe || p_payload_safe
    where id = v_event.id;

    return query select
      'verification_pending'::text,
      v_order.id,
      v_attempt.id,
      v_order.payment_status;
    return;
  end if;

  if v_transaction_id is null then
    v_result := 'missing_transaction_id';
  else
    select a.id into v_conflicting_attempt
    from public.payment_attempts a
    where a.provider = v_attempt.provider
      and a.provider_transaction_id = v_transaction_id
      and a.id <> v_attempt.id
    limit 1;

    if found then
      v_result := 'transaction_id_conflict';
    elsif p_reported_amount_agorot is null
          or p_reported_amount_agorot <> v_attempt.amount_agorot
          or v_attempt.amount_agorot <> round(v_order.total::numeric * 100)::bigint
          or v_currency is null
          or v_currency <> v_attempt.currency_code then
      v_result := 'amount_or_currency_mismatch';
    elsif v_order.payment_status in ('paid', 'paid_unverified') then
      v_result := case
        when v_attempt.status = 'paid'
          and v_attempt.provider_transaction_id = v_transaction_id
          then 'duplicate_success'
        else 'duplicate_charge'
      end;
    else
      v_result := 'settled';
    end if;
  end if;

  if v_result = 'settled' then
    update public.payment_attempts
    set status = 'superseded',
        lease_token = null,
        lease_expires_at = null,
        updated_at = now()
    where order_id = v_order.id
      and id <> v_attempt.id
      and status in (
        'initializing',
        'checkout_ready',
        'verification_pending',
        'needs_review'
      );

    update public.payment_attempts
    set status = 'paid',
        provider_transaction_id = v_transaction_id,
        provider_code = left(p_provider_code, 120),
        verification_method = left(p_verification_method, 120),
        last_error_code = null,
        lease_token = null,
        lease_expires_at = null,
        updated_at = now(),
        settled_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.orders
    set current_payment_attempt_id = v_attempt.id,
        payment_status = 'paid',
        payment_status_updated_at = now()
    where id = v_order.id
    returning * into v_order;

  elsif v_result = 'duplicate_charge' then
    update public.payment_attempts
    set status = 'duplicate_paid',
        provider_transaction_id = v_transaction_id,
        provider_code = left(p_provider_code, 120),
        verification_method = left(p_verification_method, 120),
        last_error_code = 'duplicate_charge',
        updated_at = now(),
        settled_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

  elsif v_result <> 'duplicate_success' then
    update public.payment_attempts
    set status = 'needs_review',
        provider_transaction_id = case
          when v_result = 'transaction_id_conflict'
            then provider_transaction_id
          else coalesce(v_transaction_id, provider_transaction_id)
        end,
        provider_code = left(p_provider_code, 120),
        verification_method = left(p_verification_method, 120),
        last_error_code = v_result,
        updated_at = now()
    where id = v_attempt.id
      and status not in ('paid', 'duplicate_paid')
    returning * into v_attempt;
  end if;

  update public.payment_events
  set provider_transaction_id = v_transaction_id,
      provider_code = left(p_provider_code, 120),
      amount_agorot = p_reported_amount_agorot,
      currency_code = nullif(v_currency, ''),
      verified = true,
      outcome = v_result,
      error_code = case
        when v_result in ('settled', 'duplicate_success') then null
        else v_result
      end,
      payload_safe = v_event.payload_safe || p_payload_safe,
      processed_at = now()
  where id = v_event.id;

  return query select
    v_result,
    v_order.id,
    v_attempt.id,
    v_order.payment_status;
end
$function$;

revoke execute on function public.claim_payment_attempt(uuid, text, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.finish_payment_initialization(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke execute on function public.record_payment_callback(text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.apply_payment_verification(bigint, text, text, bigint, text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.claim_payment_attempt(uuid, text, uuid, uuid)
  to service_role;
grant execute on function public.finish_payment_initialization(uuid, uuid, text, text)
  to service_role;
grant execute on function public.record_payment_callback(text, text, text, text, text, jsonb)
  to service_role;
grant execute on function public.apply_payment_verification(bigint, text, text, bigint, text, text, text, jsonb)
  to service_role;

commit;

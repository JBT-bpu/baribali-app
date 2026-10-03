-- Preserve the complete ordered Hyp VERIFY envelope, encrypted by the server.
-- Version aligned with the test project's recorded migration (Management API).
-- No existing orders, attempts or events are rewritten.
begin;

create table public.hyp_callback_evidence (
  event_id bigint primary key references public.payment_events(id) on delete cascade,
  encrypted_query text not null check (
    encrypted_query like 'v1.%' and octet_length(encrypted_query) <= 12000
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  retry_count smallint not null default 0 check (retry_count between 0 and 12),
  last_retry_at timestamptz
);
alter table public.hyp_callback_evidence enable row level security;
revoke all privileges on table public.hyp_callback_evidence from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.hyp_callback_evidence to service_role;

-- The callback Id and its complete envelope commit together before network I/O.
create function public.record_hyp_callback(
  p_merchant_reference text,
  p_event_key text,
  p_event_source text,
  p_provider_transaction_id text,
  p_payload_safe jsonb,
  p_encrypted_query text,
  p_record_unknown_reference boolean default true
)
returns table (
  event_id bigint, attempt_id uuid, attempt_order_id uuid, amount_agorot bigint,
  currency_code text, attempt_status text, duplicate_event boolean
)
language plpgsql security invoker set search_path = ''
as $function$
declare v_record record;
begin
  if p_encrypted_query is null or p_encrypted_query not like 'v1.%'
     or octet_length(p_encrypted_query) > 12000 then
    raise exception 'bounded encrypted callback evidence is required' using errcode = '22023';
  end if;
  select * into v_record from public.record_payment_callback(
    'hyp', p_merchant_reference, p_event_key, p_event_source,
    p_provider_transaction_id, p_payload_safe, p_record_unknown_reference
  );
  if v_record.event_id is not null and v_record.attempt_id is not null then
    insert into public.hyp_callback_evidence (event_id, encrypted_query)
    values (v_record.event_id, p_encrypted_query)
    on conflict (event_id) do nothing;
  end if;
  return query select v_record.event_id, v_record.attempt_id, v_record.attempt_order_id,
    v_record.amount_agorot, v_record.currency_code, v_record.attempt_status, v_record.duplicate_event;
end
$function$;

-- Claim one unprocessed event. A durable cooldown bounds VERIFY across instances.
-- No checkout is created, and an expired/processed event cannot be replayed.
create function public.claim_hyp_callback_replay(p_order_id uuid)
returns table (
  event_id bigint, encrypted_query text, merchant_reference text,
  attempt_id uuid, attempt_order_id uuid, amount_agorot bigint,
  currency_code text, attempt_status text
)
language sql security invoker set search_path = ''
as $function$
  with candidate as (
    select evidence.event_id
    from public.hyp_callback_evidence evidence
    join public.payment_events event on event.id = evidence.event_id
    join public.payment_attempts attempt on attempt.id = event.attempt_id
    where attempt.order_id = p_order_id and attempt.provider = 'hyp'
      and attempt.status not in ('paid', 'duplicate_paid')
      and event.processed_at is null
      and evidence.expires_at > now() and evidence.retry_count < 12
      and (evidence.last_retry_at is null or evidence.last_retry_at < now() - interval '60 seconds')
    order by evidence.created_at desc, evidence.event_id desc
    limit 1 for update of evidence skip locked
  ), claimed as (
    update public.hyp_callback_evidence evidence
    set retry_count = evidence.retry_count + 1, last_retry_at = now()
    from candidate where evidence.event_id = candidate.event_id
    returning evidence.event_id, evidence.encrypted_query
  )
  select claimed.event_id, claimed.encrypted_query, attempt.merchant_reference,
    attempt.id, attempt.order_id, attempt.amount_agorot, attempt.currency_code, attempt.status
  from claimed
  join public.payment_events event on event.id = claimed.event_id
  join public.payment_attempts attempt on attempt.id = event.attempt_id;
$function$;

revoke all on function public.record_hyp_callback(text, text, text, text, jsonb, text, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_hyp_callback_replay(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.record_hyp_callback(text, text, text, text, jsonb, text, boolean) to service_role;
grant execute on function public.claim_hyp_callback_replay(uuid) to service_role;
comment on table public.hyp_callback_evidence is
  'Server-only AES-256-GCM envelopes. Replay window 7 days; purge processed/expired evidence through the approved retention procedure.';

commit;

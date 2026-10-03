-- Forward-only repair: RETURNS TABLE event_id is a PL/pgSQL variable, so name
-- Version aligned with the test project's recorded migration.
-- the primary-key constraint instead of the ambiguous ON CONFLICT(event_id).
begin;
create or replace function public.record_hyp_callback(
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
    on conflict on constraint hyp_callback_evidence_pkey do nothing;
  end if;
  return query select v_record.event_id, v_record.attempt_id, v_record.attempt_order_id,
    v_record.amount_agorot, v_record.currency_code, v_record.attempt_status, v_record.duplicate_event;
end
$function$;
revoke all on function public.record_hyp_callback(text, text, text, text, jsonb, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.record_hyp_callback(text, text, text, text, jsonb, text, boolean) to service_role;
commit;

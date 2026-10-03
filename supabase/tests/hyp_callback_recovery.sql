-- Integration assertions against an existing PRE-LAUNCH TEST attempt.
-- Every synthetic callback and payment decision is rolled back. No HYP call.
begin;
set local statement_timeout = '15s';

do $test$
declare
  attempt public.payment_attempts%rowtype;
  first_record record;
  duplicate_record record;
  verification record;
  resumed_checkout record;
  key text := 'recovery-regression:' || gen_random_uuid()::text;
  transaction_id text := 'regression-tx:' || gen_random_uuid()::text;
  count_rows integer;
begin
  select * into attempt from public.payment_attempts
  where provider = 'hyp' and status = 'checkout_ready' limit 1;
  if not found then raise exception 'requires an existing checkout_ready TEST attempt'; end if;

  -- A tracking link opened in another tab has no original browser key. The
  -- ledger must still reuse the existing hosted page rather than create one.
  select * into resumed_checkout from public.claim_payment_attempt(
    attempt.order_id, 'hyp', gen_random_uuid(), gen_random_uuid()
  );
  if resumed_checkout.attempt_id <> attempt.id or resumed_checkout.created_new
     or resumed_checkout.lease_owned or resumed_checkout.checkout_url <> attempt.checkout_url then
    raise exception 'tracking retry created a second hosted payment attempt';
  end if;

  if has_table_privilege('anon', 'public.hyp_callback_evidence', 'SELECT')
     or has_table_privilege('authenticated', 'public.hyp_callback_evidence', 'SELECT')
     or has_function_privilege('anon', 'public.record_hyp_callback(text,text,text,text,jsonb,text,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.claim_hyp_callback_replay(uuid)', 'EXECUTE') then
    raise exception 'browser role can access private replay evidence';
  end if;
  if not has_function_privilege('service_role', 'public.claim_hyp_callback_replay(uuid)', 'EXECUTE') then
    raise exception 'service role cannot claim replay';
  end if;

  select * into first_record from public.record_hyp_callback(
    attempt.merchant_reference, key, 'browser_return', transaction_id,
    jsonb_build_object('Id', transaction_id), 'v1.integration-ciphertext-only', false
  );
  if first_record.attempt_id <> attempt.id or first_record.event_id is null then
    raise exception 'known callback was not recorded';
  end if;
  if not exists (select 1 from public.payment_events where id = first_record.event_id
      and provider_transaction_id = transaction_id and processed_at is null)
     or not exists (select 1 from public.hyp_callback_evidence where event_id = first_record.event_id) then
    raise exception 'refund Id and envelope were not persisted together';
  end if;
  select * into duplicate_record from public.record_hyp_callback(
    attempt.merchant_reference, key, 'browser_return', transaction_id,
    '{}'::jsonb, 'v1.must-not-replace-original', false
  );
  if duplicate_record.event_id <> first_record.event_id or not duplicate_record.duplicate_event then
    raise exception 'duplicate callback did not reuse its event';
  end if;
  if (select encrypted_query from public.hyp_callback_evidence where event_id = first_record.event_id)
     <> 'v1.integration-ciphertext-only' then raise exception 'original envelope was overwritten'; end if;

  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 1 then raise exception 'initial replay not claimed'; end if;
  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 0 then raise exception 'cross-request replay cooldown failed'; end if;
  update public.hyp_callback_evidence set last_retry_at = now() - interval '61 seconds', retry_count = 12
  where event_id = first_record.event_id;
  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 0 then raise exception 'bounded retry cap failed'; end if;
  update public.hyp_callback_evidence set retry_count = 1, expires_at = now() - interval '1 second'
  where event_id = first_record.event_id;
  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 0 then raise exception 'expired evidence replayed'; end if;
  update public.hyp_callback_evidence set expires_at = now() + interval '7 days'
  where event_id = first_record.event_id;

  select * into verification from public.apply_payment_verification(
    first_record.event_id, 'verification_pending', transaction_id, null, null,
    'HYP_VERIFY_TRANSPORT', 'regression_test_only', '{}'::jsonb
  );
  if verification.order_payment_status <> 'pending'
     or (select processed_at from public.payment_events where id = first_record.event_id) is not null then
    raise exception 'transport loss destroyed replayability';
  end if;
  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 1 then raise exception 'timeout event cannot be replayed later'; end if;

  select * into verification from public.apply_payment_verification(
    first_record.event_id, 'approved', transaction_id, attempt.amount_agorot,
    attempt.currency_code, '0', 'regression_test_only', '{}'::jsonb
  );
  if verification.order_payment_status <> 'paid' or verification.result <> 'settled' then
    raise exception 'matching verified callback failed to settle';
  end if;
  select count(*) into count_rows from public.claim_hyp_callback_replay(attempt.order_id);
  if count_rows <> 0 then raise exception 'processed/paid event was replayed'; end if;
  select * into verification from public.apply_payment_verification(
    first_record.event_id, 'verification_pending', transaction_id, null, null,
    'HYP_VERIFY_TRANSPORT', 'regression_test_only', '{}'::jsonb
  );
  if verification.order_payment_status <> 'paid' then raise exception 'paid state regressed'; end if;

  select * into duplicate_record from public.record_hyp_callback(
    'BBP-unknown-regression', key || ':unknown', 'browser_return', transaction_id,
    '{}'::jsonb, 'v1.unknown', false
  );
  if duplicate_record.event_id is not null then raise exception 'unknown callback exceeded ingress policy'; end if;
end
$test$;

rollback;

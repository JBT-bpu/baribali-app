import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL(
    '../../supabase/migrations/20260902184747_payment_foundation.sql',
    import.meta.url,
), 'utf8');
const normalized = migration.replace(/\s+/g, ' ');

// These checks lock critical source-level invariants while Supabase is
// intentionally disconnected. They do not compile or execute PL/pgSQL; the
// migration still requires staging execution and state assertions before use.

function functionBody(name: string, nextMarker: string): string {
    const start = normalized.indexOf(`create or replace function public.${name}`);
    const end = normalized.indexOf(nextMarker, start);
    assert.notEqual(start, -1, `${name} must exist in the migration`);
    assert.notEqual(end, -1, `${name} must have a stable end marker`);
    return normalized.slice(start, end);
}

const recordCallback = functionBody(
    'record_payment_callback',
    'create or replace function public.apply_payment_verification',
);
const claimAttempt = functionBody(
    'claim_payment_attempt',
    'create or replace function public.finish_payment_initialization',
);
const applyVerification = functionBody(
    'apply_payment_verification',
    'revoke execute on function public.claim_payment_attempt',
);

test('receiving or retrying a callback cannot downgrade needs_review', () => {
    assert.match(
        recordCallback,
        /status not in \('paid', 'duplicate_paid', 'needs_review'\)/,
    );
    assert.match(
        applyVerification,
        /status not in \('paid', 'duplicate_paid', 'needs_review'\)/,
    );
});

test('legacy paid_unverified orders fail closed without transaction provenance', () => {
    assert.match(
        applyVerification,
        /elsif v_order\.payment_status = 'paid_unverified' then v_result := 'unverified_payment_conflict'/,
    );
    assert.match(applyVerification, /elsif v_order\.payment_status = 'paid' then/);
    assert.doesNotMatch(
        applyVerification,
        /v_order\.payment_status in \('paid', 'paid_unverified'\)/,
    );
});

test('settlement rejects a missing or mismatched Hyp Amount', () => {
    assert.match(
        applyVerification,
        /v_reported_amount_agorot is null or v_reported_amount_agorot <> v_attempt\.amount_agorot/,
    );
    assert.match(applyVerification, /v_result := 'amount_or_currency_mismatch'/);
});

test('settlement never overwrites a reviewed attempt with a different transaction id', () => {
    assert.match(
        applyVerification,
        /v_event_transaction_mismatch := v_event\.provider_transaction_id is not null.*?v_transaction_id := coalesce\( v_event\.provider_transaction_id, v_transaction_id \)/,
    );
    assert.match(
        applyVerification,
        /v_attempt\.provider_transaction_id is not null and v_attempt\.provider_transaction_id <> v_transaction_id then/,
    );
    assert.match(applyVerification, /v_result := 'transaction_id_mismatch'/);
    assert.match(
        applyVerification,
        /v_result in \('transaction_id_conflict', 'transaction_id_mismatch'\) then provider_transaction_id/,
    );
});

test('zero-total and no-charge orders fail closed before a payment attempt is inserted', () => {
    const nonPayableGuard = claimAttempt.indexOf('if v_order.total <= 0');
    const attemptInsert = claimAttempt.indexOf('insert into public.payment_attempts');
    assert.ok(nonPayableGuard >= 0 && nonPayableGuard < attemptInsert);
    assert.match(claimAttempt, /'no_payment_required'/);
    assert.match(normalized, /constraint payment_attempts_amount_check check \(amount_agorot > 0\)/);
});

test('orders encode zero charge without pretending it was paid or is owed', () => {
    assert.match(normalized, /constraint orders_payment_requirement_shape_check check \( \( total = 0 and payment_status = 'no_payment_required' and current_payment_attempt_id is null \) or \( total > 0 and payment_status <> 'no_payment_required' \) \)/);
    assert.match(normalized, /validate constraint orders_payment_requirement_shape_check/);
});

test('paid remains absorbing while every discrepancy gets an indexed review signal', () => {
    assert.match(normalized, /review_required boolean not null default false/);
    assert.match(normalized, /review_reason text/);
    assert.match(normalized, /review_required_at timestamptz/);
    assert.match(
        normalized,
        /where status in \('verification_pending', 'needs_review'\) or review_required/,
    );
    assert.match(
        applyVerification,
        /when status in \('paid', 'duplicate_paid'\) then status.*?review_required = true.*?review_reason = v_result/,
    );
    assert.doesNotMatch(
        applyVerification,
        /where id = v_attempt\.id and status not in \('paid', 'duplicate_paid'\)/,
    );
});

test('provider transaction conflicts are serialized before the conflict lookup', () => {
    const lock = applyVerification.indexOf('pg_catalog.pg_advisory_xact_lock');
    const conflictLookup = applyVerification.indexOf(
        'where a.provider = v_attempt.provider and a.provider_transaction_id = v_transaction_id',
    );
    const oversizedPayloadResult = applyVerification.lastIndexOf(
        "elsif v_payload_merge_omitted then",
    );
    const malformedValuesResult = applyVerification.lastIndexOf(
        "elsif v_provider_values_malformed then",
    );
    assert.ok(lock >= 0 && lock < conflictLookup);
    assert.ok(conflictLookup < oversizedPayloadResult);
    assert.ok(conflictLookup < malformedValuesResult);
    assert.match(normalized, /payment_attempts_provider_transaction_uidx/);
});

test('duplicate-charge replays preserve their original settlement timestamp', () => {
    assert.match(
        applyVerification,
        /when v_attempt\.provider_transaction_id = v_transaction_id then case when v_attempt\.status = 'paid' then 'duplicate_success' else 'duplicate_charge' end/,
    );
    assert.match(
        applyVerification,
        /elsif v_result = 'duplicate_charge' then.*?settled_at = coalesce\(settled_at, now\(\)\)/,
    );
});

test('late callbacks are durable without promoting an old attempt into the active index', () => {
    assert.match(
        recordCallback,
        /other_attempt\.id <> v_attempt\.id.*?v_other_active_attempt_id is not null.*?review_required = true/,
    );
    assert.match(
        recordCallback,
        /elsif v_attempt\.status not in \('paid', 'duplicate_paid', 'needs_review'\) then update public\.payment_attempts set status = 'verification_pending', lease_token = null, lease_expires_at = null/,
    );
    assert.match(
        applyVerification,
        /when v_other_active_attempt_id is not null then status/,
    );
    assert.match(normalized, /payment_events_unprocessed_idx/);
});

test('attempt state constraints require a real lease or a persisted checkout URL', () => {
    assert.match(
        normalized,
        /constraint payment_attempts_operational_shape_check check \( \( status = 'initializing' and checkout_url is null and lease_token is not null and lease_expires_at is not null and lease_expires_at > created_at \) or \( status = 'checkout_ready' and checkout_url is not null and lease_token is null and lease_expires_at is null \)/,
    );
    assert.match(
        normalized,
        /status not in \('needs_review', 'duplicate_paid'\) or review_required/,
    );
    assert.match(
        normalized,
        /status not in \('paid', 'duplicate_paid'\) and settled_at is null/,
    );
});

test('malformed provider values and oversized merged payloads become durable review data', () => {
    assert.match(
        applyVerification,
        /p_reported_amount_agorot > 0.*?else v_provider_values_malformed := true/,
    );
    assert.match(
        applyVerification,
        /v_currency_input ~ '\^\[A-Z\]\{3\}\$'.*?else v_provider_values_malformed := true/,
    );
    assert.match(
        applyVerification,
        /octet_length\(v_merged_payload::text\) > 8192.*?v_merged_payload := v_event\.payload_safe.*?v_payload_merge_omitted := true/,
    );
    assert.match(applyVerification, /'verification_values_malformed'/);
    assert.match(applyVerification, /'verification_payload_too_large'/);
    assert.doesNotMatch(
        applyVerification,
        /amount_agorot = p_reported_amount_agorot/,
    );
});

test('an exact settled key is recovered before the new-payment payability gate', () => {
    const exactKeyLookup = claimAttempt.indexOf(
        'where a.provider = v_provider and a.idempotency_key = p_idempotency_key',
    );
    const newPaymentGuard = claimAttempt.lastIndexOf('if v_order.total <= 0');
    const attemptInsert = claimAttempt.indexOf('insert into public.payment_attempts');
    assert.ok(exactKeyLookup >= 0 && exactKeyLookup < newPaymentGuard);
    assert.ok(newPaymentGuard < attemptInsert);
    assert.match(
        claimAttempt,
        /v_attempt\.status not in \('paid', 'duplicate_paid'\) then raise exception 'PAYMENT_ORDER_NOT_PAYABLE'/,
    );
});

test('orders compatibility guards validate payment columns and the exact FK shape', () => {
    assert.match(normalized, /lock table public\.orders in share update exclusive mode/);
    assert.match(normalized, /public\.orders\.id must be a primary or unique key/);
    assert.match(normalized, /current_payment_attempt_id must be a nullable writable uuid/);
    assert.match(normalized, /payment_status_updated_at must be a nullable writable timestamptz/);
    assert.match(
        normalized,
        /orders_current_payment_attempt_fkey has an incompatible definition/,
    );
});

test('payment event sequence is reduced to the one service-role privilege required', () => {
    assert.match(
        normalized,
        /revoke all privileges on sequence public\.payment_events_id_seq from public, anon, authenticated, service_role; grant usage on sequence public\.payment_events_id_seq to service_role/,
    );
});

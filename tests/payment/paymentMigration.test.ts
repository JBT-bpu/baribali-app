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
        /p_reported_amount_agorot is null or p_reported_amount_agorot <> v_attempt\.amount_agorot/,
    );
    assert.match(applyVerification, /v_result := 'amount_or_currency_mismatch'/);
});

test('settlement never overwrites a reviewed attempt with a different transaction id', () => {
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

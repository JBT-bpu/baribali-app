import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { decryptHypCallback, encryptHypCallback, HypCallbackEnvelopeError } from '../../src/lib/hypCallbackEnvelope';
import { createHypClient } from '../../src/lib/hypPay';
import { settleHypCallback, settleRecordedHypCallback, type HypSettlementDependencies } from '../../src/lib/hypSettlement';

const key = '19'.repeat(32);
const reference = 'BBP-test';
const query = 'Id=tx-1&CCode=0&Amount=72&ACode=approved&Order=BBP-test&Fild1=Jane+Doe&Fild2=test%40example.invalid&Fild3=&Sign=return-signature';
const callback = {
    eventId: 7, attemptId: 'attempt-1', orderId: 'order-1', amountAgorot: 7200,
    currencyCode: 'ILS', attemptStatus: 'verification_pending' as const, duplicateEvent: false,
};

function dependencies(overrides: Partial<HypSettlementDependencies> = {}): HypSettlementDependencies {
    return {
        record: async () => callback,
        verify: createHypClient({ masof: 'test', key: 'fake', passp: 'fake' }, async () => new Response('CCode=0')).verifyPayment,
        apply: async () => ({ result: 'settled', orderId: 'order-1', attemptId: 'attempt-1', orderPaymentStatus: 'paid' }),
        ...overrides,
    };
}

test('encrypted callback keeps all fields and their original order without readable personal data', () => {
    const envelope = encryptHypCallback(query, reference, key);
    assert.equal(decryptHypCallback(envelope, reference, key).toString(), query);
    for (const sensitive of ['Jane', 'example.invalid', 'return-signature', 'tx-1']) assert.equal(envelope.includes(sensitive), false);
    assert.notEqual(encryptHypCallback(query, reference, key), envelope, 'nonces must be fresh');
});

test('wrong key, reference, tampering and malformed envelopes fail closed without disclosing content', () => {
    const envelope = encryptHypCallback(query, reference, key);
    for (const [value, ref, secret] of [
        [envelope, reference, '20'.repeat(32)], [envelope, 'BBP-other', key],
        [envelope.slice(0, -8) + 'AAAAAAAA', reference, key], ['v1.bad', reference, key],
    ]) {
        assert.throws(() => decryptHypCallback(value, ref, secret), (error: unknown) => (
            error instanceof HypCallbackEnvelopeError && error.message === 'PAYMENT_CALLBACK_DECRYPT_FAILED'
        ));
    }
    assert.throws(() => encryptHypCallback(query, reference, ''), /PAYMENT_CALLBACK_KEY_INVALID/);
    assert.throws(() => encryptHypCallback('x'.repeat(8193), reference, key), /PAYMENT_CALLBACK_TOO_LARGE/);
});

test('complete replay evidence is recorded before VERIFY and PII stays out of safe metadata', async () => {
    const calls: string[] = [];
    await settleHypCallback(new URLSearchParams(query), 'browser_return', dependencies({
        record: async input => {
            calls.push('record');
            assert.equal(input.callbackQuery, query);
            assert.equal(input.providerTransactionId, 'tx-1');
            assert.equal('Sign' in input.safePayload, false);
            assert.equal('Fild1' in input.safePayload, false);
            return callback;
        },
        verify: async () => {
            calls.push('verify');
            return { verified: false, ccode: '902', transactionId: 'tx-1', orderReference: reference, amountAgorot: 7200, currencyCode: null, currencyReported: false, safeMetadata: {} };
        },
    }));
    assert.deepEqual(calls, ['record', 'verify']);
});

test('timeout can be recovered from encrypted database evidence alone, with the same event and no second charge', async () => {
    let envelope = '';
    const applied: Parameters<HypSettlementDependencies['apply']>[0][] = [];
    const deps = dependencies({
        record: async input => {
            envelope = encryptHypCallback(input.callbackQuery, input.merchantReference, key);
            return callback;
        },
        verify: async () => { throw new Error('simulated transport loss'); },
        apply: async input => {
            applied.push(input);
            return { result: 'verification_pending', orderId: 'order-1', attemptId: 'attempt-1', orderPaymentStatus: 'pending' };
        },
    });
    const first = await settleHypCallback(new URLSearchParams(query), 'browser_return', deps);
    assert.equal(first.paid, false);
    const replay = await settleRecordedHypCallback(decryptHypCallback(envelope, reference, key), { ...callback, duplicateEvent: true }, dependencies({
        record: async () => { throw new Error('must not create an event'); },
        apply: async input => {
            applied.push(input);
            return { result: 'settled', orderId: 'order-1', attemptId: 'attempt-1', orderPaymentStatus: 'paid' };
        },
    }));
    assert.equal(replay.paid, true);
    assert.deepEqual(applied.map(input => input.eventId), [7, 7]);
    assert.equal(applied[1].currencyCode, 'ILS');
    assert.equal(applied[1].safePayload.CurrencySource, 'signed_request_ledger');
});

test('absent Coin fallback is restricted to an approved matching ILS amount and callback Id', async () => {
    for (const overrides of [
        { currencyCode: 'USD' }, { amountAgorot: 7300 },
    ]) {
        let currency: string | null | undefined;
        await settleRecordedHypCallback(new URLSearchParams(query), { ...callback, ...overrides }, dependencies({
            apply: async input => {
                currency = input.currencyCode;
                return { result: 'amount_or_currency_mismatch', orderId: 'order-1', attemptId: 'attempt-1', orderPaymentStatus: 'pending' };
            },
        }));
        assert.equal(currency, null);
    }
    let currency;
    const noId = new URLSearchParams(query);
    noId.delete('Id');
    await settleRecordedHypCallback(noId, callback, dependencies({
        apply: async input => { currency = input.currencyCode; return { result: 'missing_transaction_id', orderId: 'order-1', attemptId: 'attempt-1', orderPaymentStatus: 'pending' }; },
    }));
    assert.equal(currency, null);
});

test('callback validation rejects oversized or injected envelopes before database writes', async () => {
    const deps = dependencies({ record: async () => { throw new Error('must not write'); } });
    await assert.rejects(settleHypCallback(new URLSearchParams({ Order: reference, Fild1: 'x'.repeat(8200) }), 'browser_return', deps), /HYP_CALLBACK_TOO_LARGE/);
    await assert.rejects(settleHypCallback(new URLSearchParams({ Order: reference, KEY: 'injection' }), 'browser_return', deps), /HYP_CALLBACK_RESERVED_FIELD/);
});

test('replay migration keeps encrypted evidence server-only and claims retries atomically', () => {
    const folder = new URL('../../supabase/migrations/', import.meta.url);
    const file = readdirSync(folder).find(name => name.endsWith('_hyp_callback_recovery.sql'))!;
    const sql = readFileSync(new URL(file, folder), 'utf8').replace(/\s+/g, ' ');
    assert.match(sql, /alter table public\.hyp_callback_evidence enable row level security/);
    assert.match(sql, /revoke all privileges on table public\.hyp_callback_evidence from public, anon, authenticated, service_role/);
    assert.match(sql, /language plpgsql security invoker set search_path = ''/);
    assert.match(sql, /on conflict \(event_id\) do nothing/);
    assert.match(sql, /limit 1 for update of evidence skip locked/);
    assert.match(sql, /evidence\.retry_count < 12/);
    assert.match(sql, /event\.processed_at is null/);
    assert.doesNotMatch(sql, /create policy|security definer/);
    const repair = readdirSync(folder).find(name => name.endsWith('_hyp_callback_record_conflict.sql'))!;
    assert.match(readFileSync(new URL(repair, folder), 'utf8'), /on conflict on constraint hyp_callback_evidence_pkey do nothing/);
});

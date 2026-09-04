import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
    confirmPendingLegacyPayment,
    paymentStartDecision,
    settleLegacyOrder,
} from '../../src/lib/paymentOrderState';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

type TestFetch = (
    input: string | URL | Request,
    init?: RequestInit,
) => Promise<Response>;

function requestUrl(input: string | URL | Request): URL {
    if (input instanceof Request) return new URL(input.url);
    return new URL(String(input));
}

function jsonResponse(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function testClient(projectName: string, fakeFetch: TestFetch): SupabaseClient {
    return createClient(`https://${projectName}.supabase.co`, 'sb_secret_test', {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: { fetch: fakeFetch as typeof fetch },
    });
}

function paymentFilterMatches(filter: string | null, currentStatus: string): boolean {
    if (filter === 'eq.pending') return currentStatus === 'pending';
    if (filter === 'in.(pending,failed)') {
        return currentStatus === 'pending' || currentStatus === 'failed';
    }
    // Model the unsafe baseline: a missing status filter updates every state.
    return filter === null;
}

test('parallel generic callbacks cannot downgrade a successful settlement', {
    timeout: 5_000,
}, async () => {
    let paymentStatus = 'pending';
    let releaseFailure: () => void = () => undefined;
    const successApplied = new Promise<void>(resolve => {
        releaseFailure = resolve;
    });
    const patchUrls: URL[] = [];

    const client = testClient('webhook-cas-race', async (input, init) => {
        const url = requestUrl(input);
        patchUrls.push(url);
        const next = JSON.parse(String(init?.body)) as { payment_status: string };
        if (next.payment_status === 'failed') await successApplied;

        const idMatches = url.searchParams.get('id') === `eq.${ORDER_ID}`;
        const statusFilter = url.searchParams.get('payment_status');
        const statusMatches = paymentFilterMatches(statusFilter, paymentStatus);
        const matches = idMatches && statusMatches;
        if (matches) paymentStatus = next.payment_status;
        if (next.payment_status === 'paid_unverified') releaseFailure();
        return jsonResponse(matches ? [{ id: ORDER_ID }] : []);
    });

    const [approved, declined] = await Promise.all([
        settleLegacyOrder(client, { orderId: ORDER_ID, success: true }),
        settleLegacyOrder(client, { orderId: ORDER_ID, success: false }),
    ]);

    assert.deepEqual(approved, { kind: 'updated' });
    assert.deepEqual(declined, { kind: 'stale' });
    assert.equal(paymentStatus, 'paid_unverified');
    assert.equal(patchUrls.length, 2);
    assert.ok(patchUrls.every(url => url.searchParams.get('id') === `eq.${ORDER_ID}`));
    assert.deepEqual(
        patchUrls.map(url => url.searchParams.get('payment_status')).sort(),
        ['eq.pending', 'in.(pending,failed)'].sort(),
    );
});

test('a successful callback repairs failed when the decline wins the first lock', {
    timeout: 5_000,
}, async () => {
    let paymentStatus = 'pending';
    let releaseSuccess: () => void = () => undefined;
    const failureApplied = new Promise<void>(resolve => {
        releaseSuccess = resolve;
    });
    const patchUrls: URL[] = [];

    const client = testClient('webhook-failure-first', async (input, init) => {
        const url = requestUrl(input);
        patchUrls.push(url);
        const next = JSON.parse(String(init?.body)) as { payment_status: string };
        if (next.payment_status === 'paid_unverified') await failureApplied;

        const matches = url.searchParams.get('id') === `eq.${ORDER_ID}`
            && paymentFilterMatches(url.searchParams.get('payment_status'), paymentStatus);
        if (matches) paymentStatus = next.payment_status;
        if (next.payment_status === 'failed') releaseSuccess();
        return jsonResponse(matches ? [{ id: ORDER_ID }] : []);
    });

    const [declined, approved] = await Promise.all([
        settleLegacyOrder(client, { orderId: ORDER_ID, success: false }),
        settleLegacyOrder(client, { orderId: ORDER_ID, success: true }),
    ]);

    assert.deepEqual(declined, { kind: 'updated' });
    assert.deepEqual(approved, { kind: 'updated' });
    assert.equal(paymentStatus, 'paid_unverified');
    assert.ok(patchUrls.every(url => url.searchParams.get('id') === `eq.${ORDER_ID}`));
    assert.deepEqual(
        patchUrls.map(url => url.searchParams.get('payment_status')).sort(),
        ['eq.pending', 'in.(pending,failed)'].sort(),
    );
});

test('legacy payment creation detects a settlement that won before its guarded write', async () => {
    let paymentStatus = 'paid_unverified';
    let updateBody: Record<string, unknown> | null = null;
    let updateUrl: URL | null = null;

    const client = testClient('create-cas-race', async (input, init) => {
        const url = requestUrl(input);
        updateUrl = url;
        updateBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

        const matches = url.searchParams.get('id') === `eq.${ORDER_ID}`
            && url.searchParams.get('payment_status') === 'eq.pending'
            && paymentStatus === 'pending';
        if (matches) paymentStatus = String(updateBody.payment_status);
        return jsonResponse(matches ? [{ id: ORDER_ID }] : []);
    });

    const result = await confirmPendingLegacyPayment(client, ORDER_ID);

    assert.deepEqual(result, { kind: 'stale' });
    assert.equal(paymentStatus, 'paid_unverified');
    assert.deepEqual(updateBody, { payment_status: 'pending' });
    assert.equal((updateUrl as URL | null)?.searchParams.get('id'), `eq.${ORDER_ID}`);
    assert.equal((updateUrl as URL | null)?.searchParams.get('payment_status'), 'eq.pending');
});

test('legacy payment creation surfaces PostgREST write errors instead of returning success', async () => {
    const client = testClient('create-write-error', async () => jsonResponse({
        code: 'XX000',
        details: '',
        hint: '',
        message: 'simulated write failure',
    }, 500));

    const result = await confirmPendingLegacyPayment(client, ORDER_ID);

    assert.deepEqual(result, {
        kind: 'error',
        message: 'simulated write failure',
    });
});

test('payment start eligibility rejects terminal and non-hosted order states', () => {
    assert.equal(paymentStartDecision(72, 'pending'), 'pending');
    assert.equal(paymentStartDecision(72, 'paid'), 'already_settled');
    assert.equal(paymentStartDecision(72, 'paid_unverified'), 'already_settled');
    assert.equal(paymentStartDecision(72, 'pay_at_pickup'), 'not_required');
    assert.equal(paymentStartDecision(0, 'pending'), 'not_required');
    assert.equal(paymentStartDecision(72, 'no_payment_required'), 'not_required');
    assert.equal(paymentStartDecision(72, 'failed'), 'state_changed');
    assert.equal(paymentStartDecision(72, 'verification_pending'), 'state_changed');
});

test('payment routes use the guarded transitions and never reset kitchen progress', () => {
    const webhook = readFileSync(new URL(
        '../../src/app/api/payment/webhook/route.ts',
        import.meta.url,
    ), 'utf8');
    const create = readFileSync(new URL(
        '../../src/app/api/payment/create/route.ts',
        import.meta.url,
    ), 'utf8');

    assert.match(webhook, /success && order\.payment_status === 'failed'/);
    assert.match(webhook, /await settleLegacyOrder\(admin,/);
    assert.match(webhook, /transition\.kind === 'stale'/);
    assert.match(create, /await confirmPendingLegacyPayment\(admin, orderId\)/);
    assert.match(create, /initialization\.kind === 'error'[\s\S]*?status: 503/);
    assert.match(create, /initialization\.kind === 'stale'[\s\S]*?status: 409/);
    assert.doesNotMatch(create, /status:\s*'waiting'/);
});

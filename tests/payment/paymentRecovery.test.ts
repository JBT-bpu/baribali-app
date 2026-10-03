import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { paymentRecoveryComplete, paymentRecoveryMode } from '../../src/lib/customerPayment';
import { requestHostedPayment } from '../../src/lib/hostedPaymentRequest';
import { claimOrderSubmission, markOrderSubmissionPaymentPending, storedPaymentForOrder, type OrderSubmissionStorage } from '../../src/lib/orderSubmission';

const orderId = '22222222-2222-4222-8222-222222222222';
const paymentKey = '33333333-3333-4333-8333-333333333333';

test('tracking offers original checkout only for an explicitly unpaid chargeable order', () => {
    for (const status of [null, 'initializing', 'checkout_ready', 'init_failed']) {
        assert.equal(paymentRecoveryMode(72, 'pending', status), 'checkout');
    }
    for (const status of ['paid', 'paid_unverified', 'failed', 'pay_at_pickup', 'no_payment_required', undefined]) {
        assert.equal(paymentRecoveryMode(72, status, 'checkout_ready'), 'none');
    }
    for (const total of [0, -1, NaN, Infinity]) assert.equal(paymentRecoveryMode(total, 'pending', 'checkout_ready'), 'none');
    assert.equal(paymentRecoveryMode(72, 'pending', 'future_state'), 'none');
});

test('authoritative verification/review suppresses repayment even without a URL hint', () => {
    assert.equal(paymentRecoveryMode(72, 'pending', 'verification_pending'), 'verifying');
    assert.equal(paymentRecoveryMode(72, 'pending', 'needs_review'), 'verifying');
    for (const status of ['pending', 'verification_pending', 'paid_unverified', 'failed', undefined]) {
        assert.equal(paymentRecoveryComplete(status), false);
    }
    for (const status of ['paid', 'no_payment_required', 'pay_at_pickup']) assert.equal(paymentRecoveryComplete(status), true);
});

test('tracking can retrieve the originating tab payment identity without creating an order', () => {
    const map = new Map<string, string>();
    const storage: OrderSubmissionStorage = {
        getItem: key => map.get(key) ?? null,
        setItem: (key, value) => { map.set(key, value); },
        removeItem: key => { map.delete(key); },
    };
    const record = claimOrderSubmission('basket', null, {
        storage, randomUUID: () => '11111111-1111-4111-8111-111111111111',
    });
    markOrderSubmissionPaymentPending(record, { orderId, orderNum: 'BB-1000', idempotencyKey: paymentKey }, { storage });
    assert.equal(storedPaymentForOrder(orderId, { storage })?.idempotencyKey, paymentKey);
    assert.equal(storedPaymentForOrder('unknown', { storage }), null);
    assert.equal(storedPaymentForOrder(orderId, { storage: null }), null);
});

test('the shared hosted request retries initialization with the same order/key and no order-creation request', async () => {
    const bodies: unknown[] = [];
    const result = await requestHostedPayment({ orderId, idempotencyKey: paymentKey }, async (url, options) => {
        assert.equal(url, '/api/payment/create');
        assert.equal(options?.method, 'POST');
        assert.ok(options?.signal);
        bodies.push(JSON.parse(String(options?.body)));
        return bodies.length === 1
            ? Response.json({ code: 'PAYMENT_INITIALIZATION_IN_PROGRESS' }, { status: 202 })
            : Response.json({ paymentUrl: 'https://pay.hyp.co.il/p/?Order=test' });
    });
    assert.deepEqual(bodies, [{ orderId, idempotencyKey: paymentKey }, { orderId, idempotencyKey: paymentKey }]);
    assert.equal(result.payload?.paymentUrl, 'https://pay.hyp.co.il/p/?Order=test');
});

test('shared hosted request reports ambiguous network loss without rotating its key', async () => {
    let calls = 0;
    const result = await requestHostedPayment({ orderId, idempotencyKey: paymentKey }, async () => {
        calls += 1;
        throw new Error('offline');
    });
    assert.equal(calls, 1);
    assert.equal(result.response, null);
    assert.equal(result.networkError?.message, 'offline');
});

test('tracking recovery is bounded, accessible and cannot manufacture a payment result', () => {
    const tracking = readFileSync(new URL('../../src/app/order/[id]/OrderStatusView.tsx', import.meta.url), 'utf8');
    const actions = readFileSync(new URL('../../src/components/payment/PaymentRecoveryActions.tsx', import.meta.url), 'utf8');
    const route = readFileSync(new URL('../../src/app/api/payment/hyp/reconcile/route.ts', import.meta.url), 'utf8');
    assert.match(tracking, /if \(paymentRecoveryComplete\(order\?\.payment_status\)\) clearOrderSubmissionForOrder\(id\)/);
    assert.match(tracking, /order\.payment_recovery === 'verifying'/);
    assert.match(actions, /if \(locked\.current\) return/);
    assert.match(actions, /locked\.current = true/);
    assert.match(actions, /role="status" aria-live="polite"/);
    assert.match(actions, /AbortSignal\.timeout\(20_000\)/);
    assert.doesNotMatch(actions, /fetch\('\/api\/orders/);
    assert.match(route, /claimHypCallbackReplay\(orderId\)/);
    assert.match(route, /decryptHypCallback\(replay\.paramsEnvelope, replay\.merchantReference\)/);
    assert.match(route, /settleRecordedHypCallback/);
    assert.doesNotMatch(route, /startHypPayment|createHypPaymentUrl|body\.(?:outcome|amount|envelope)/);
});

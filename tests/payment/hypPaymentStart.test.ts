import assert from 'node:assert/strict';
import test from 'node:test';

import { HypGatewayError } from '../../src/lib/hypPay';
import {
    PaymentStartError,
    startHypPayment,
    type HypPaymentStartDependencies,
} from '../../src/lib/hypPaymentStart';
import type { ClaimedPaymentAttempt } from '../../src/lib/paymentAttempts';

const baseAttempt: ClaimedPaymentAttempt = {
    id: '11111111-1111-4111-8111-111111111111',
    orderId: '22222222-2222-4222-8222-222222222222',
    provider: 'hyp',
    merchantReference: 'BBP-attempt',
    amountAgorot: 7200,
    currencyCode: 'ILS',
    status: 'initializing',
    checkoutUrl: null,
    createdNew: true,
    leaseOwned: true,
};

function dependencies(overrides: Partial<HypPaymentStartDependencies> = {}): HypPaymentStartDependencies {
    return {
        randomUUID: () => '33333333-3333-4333-8333-333333333333',
        claim: async () => baseAttempt,
        finish: async input => ({
            status: input.checkoutUrl ? 'checkout_ready' : 'init_failed',
            checkoutUrl: input.checkoutUrl,
        }),
        createUrl: async () => 'https://pay.example/checkout',
        ...overrides,
    };
}

test('persists the hosted URL before returning it', async () => {
    const calls: string[] = [];
    const result = await startHypPayment({
        orderId: baseAttempt.orderId,
        idempotencyKey: '44444444-4444-4444-8444-444444444444',
    }, dependencies({
        createUrl: async () => {
            calls.push('create');
            return 'https://pay.example/checkout';
        },
        finish: async input => {
            calls.push('persist');
            return { status: 'checkout_ready', checkoutUrl: input.checkoutUrl };
        },
    }));

    assert.deepEqual(calls, ['create', 'persist']);
    assert.equal(result.paymentUrl, 'https://pay.example/checkout');
    assert.equal(result.reused, false);
});

test('reuses a previously persisted checkout URL without asking Hyp again', async () => {
    let created = false;
    const result = await startHypPayment({
        orderId: baseAttempt.orderId,
        idempotencyKey: '44444444-4444-4444-8444-444444444444',
    }, dependencies({
        claim: async () => ({
            ...baseAttempt,
            status: 'checkout_ready',
            checkoutUrl: 'https://pay.example/existing',
            createdNew: false,
            leaseOwned: false,
        }),
        createUrl: async () => {
            created = true;
            return 'https://pay.example/new';
        },
    }));

    assert.equal(result.paymentUrl, 'https://pay.example/existing');
    assert.equal(result.reused, true);
    assert.equal(created, false);
});

test('a zero-value attempt can never launch a hosted Hyp checkout', async () => {
    let createCalls = 0;
    const finishInputs: Parameters<HypPaymentStartDependencies['finish']>[0][] = [];
    await assert.rejects(
        startHypPayment({
            orderId: baseAttempt.orderId,
            idempotencyKey: '44444444-4444-4444-8444-444444444444',
        }, dependencies({
            claim: async () => ({ ...baseAttempt, amountAgorot: 0 }),
            createUrl: async () => {
                createCalls += 1;
                return 'https://pay.example/should-not-open';
            },
            finish: async input => {
                finishInputs.push(input);
                return { status: 'init_failed', checkoutUrl: null };
            },
        })),
        (error: unknown) => error instanceof PaymentStartError
            && error.code === 'PAYMENT_NOT_REQUIRED'
            && error.httpStatus === 409,
    );
    assert.equal(createCalls, 0);
    assert.equal(finishInputs[0]?.checkoutUrl, null);
    assert.equal(finishInputs[0]?.errorCode, 'PAYMENT_NOT_REQUIRED');
});

test('a concurrent initializer returns 202 instead of creating a second page', async () => {
    await assert.rejects(
        startHypPayment({
            orderId: baseAttempt.orderId,
            idempotencyKey: '44444444-4444-4444-8444-444444444444',
        }, dependencies({
            claim: async () => ({ ...baseAttempt, leaseOwned: false, createdNew: false }),
        })),
        (error: unknown) => error instanceof PaymentStartError
            && error.httpStatus === 202
            && error.code === 'PAYMENT_INITIALIZATION_IN_PROGRESS',
    );
});

test('a failed SIGN closes initialization with a safe code and permits a new key', async () => {
    const failureInputs: Parameters<HypPaymentStartDependencies['finish']>[0][] = [];

    await assert.rejects(
        startHypPayment({
            orderId: baseAttempt.orderId,
            idempotencyKey: '44444444-4444-4444-8444-444444444444',
        }, dependencies({
            createUrl: async () => {
                throw new HypGatewayError('HYP_SIGN_TRANSPORT', true);
            },
            finish: async input => {
                failureInputs.push(input);
                return { status: 'init_failed', checkoutUrl: null };
            },
        })),
        (error: unknown) => error instanceof PaymentStartError
            && error.code === 'HYP_SIGN_TRANSPORT'
            && error.retryWithNewKey,
    );

    assert.equal(failureInputs[0]?.checkoutUrl, null);
    assert.equal(failureInputs[0]?.errorCode, 'HYP_SIGN_TRANSPORT');
});

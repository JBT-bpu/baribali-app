import assert from 'node:assert/strict';
import test from 'node:test';
import { publicPaymentState } from '../../src/lib/payment';

const PAYMENT_ENV_KEYS = [
    'PAYMENT_PROVIDER',
    'HYP_MASOF',
    'HYP_KEY',
    'HYP_PASSP',
    'YAADPAY_MASOF',
    'YAADPAY_PASSP',
    'TRANZILA_TERMINAL',
] as const;

function withPaymentEnvironment(
    values: Partial<Record<(typeof PAYMENT_ENV_KEYS)[number], string>>,
    check: () => void,
) {
    const previous = Object.fromEntries(
        PAYMENT_ENV_KEYS.map(key => [key, process.env[key]]),
    ) as Record<(typeof PAYMENT_ENV_KEYS)[number], string | undefined>;

    try {
        for (const key of PAYMENT_ENV_KEYS) delete process.env[key];
        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined) process.env[key] = value;
        }
        check();
    } finally {
        for (const key of PAYMENT_ENV_KEYS) {
            const value = previous[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

test('public payment state advertises pickup when hosted credentials are absent', () => {
    withPaymentEnvironment({ PAYMENT_PROVIDER: 'hyp' }, () => {
        assert.deepEqual(publicPaymentState(), {
            paymentMode: 'pickup',
            paymentProvider: null,
        });
    });
});

test('public payment state advertises the hosted provider without exposing credentials', () => {
    withPaymentEnvironment({
        PAYMENT_PROVIDER: 'hyp',
        HYP_MASOF: 'test-terminal',
        HYP_KEY: 'test-key',
        HYP_PASSP: 'test-pass',
    }, () => {
        assert.deepEqual(publicPaymentState(), {
            paymentMode: 'hosted',
            paymentProvider: 'hyp',
        });
        assert.deepEqual(Object.keys(publicPaymentState()).sort(), ['paymentMode', 'paymentProvider']);
    });
});

test('public payment state fails closed for an invalid provider', () => {
    withPaymentEnvironment({ PAYMENT_PROVIDER: 'not-a-provider' }, () => {
        assert.deepEqual(publicPaymentState(), {
            paymentMode: 'unavailable',
            paymentProvider: null,
        });
    });
});

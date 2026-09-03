import assert from 'node:assert/strict';
import test from 'node:test';

import {
    customerPaymentPresentation,
    isPaymentVerificationReturn,
} from '../../src/lib/customerPayment';
import { resolvePickupMoment } from '../../src/lib/shopHours';

test('customer payment copy distinguishes verified, verifying, and still owed money', () => {
    assert.deepEqual(customerPaymentPresentation('paid'), {
        text: 'שולם',
        owed: false,
        tone: 'done',
        icon: '✓',
    });

    const unverified = customerPaymentPresentation('paid_unverified');
    assert.equal(unverified?.owed, false, 'an ambiguous callback must not ask for the money again');
    assert.equal(unverified?.tone, 'verify', 'unverified money must not look provider-verified');
    assert.notEqual(unverified?.icon, '✓');
    assert.match(unverified?.text ?? '', /אל תשלמו שוב/);

    const pending = customerPaymentPresentation('verification_pending');
    assert.equal(pending?.owed, false);
    assert.equal(pending?.tone, 'verify');
    assert.match(pending?.text ?? '', /אל תשלמו שוב/);

    assert.equal(customerPaymentPresentation('pay_at_pickup')?.owed, true);
    assert.equal(customerPaymentPresentation('pending')?.tone, 'owed');
    assert.equal(customerPaymentPresentation('failed')?.tone, 'owed');
    assert.equal(customerPaymentPresentation('unexpected'), null);

    assert.equal(isPaymentVerificationReturn('?payment=verifying'), true);
    assert.equal(isPaymentVerificationReturn('?source=hyp&payment=verifying'), true);
    assert.equal(isPaymentVerificationReturn(''), false);
    assert.equal(isPaymentVerificationReturn('?payment=success'), false);
    assert.equal(isPaymentVerificationReturn('?payment=verifying&payment=success'), false);
    assert.equal(isPaymentVerificationReturn('?payment=verifying&payment=verifying'), false);
});

test('pickup countdown anchors HH:MM to the Israel service date in every timezone', () => {
    assert.deepEqual(
        resolvePickupMoment('12:20', '2026-09-02T21:05:00Z'),
        { targetMs: Date.parse('2026-09-03T09:20:00Z'), clock: '12:20' },
        'a post-midnight summer order belongs to the new Israel calendar day',
    );
    const originalTimezone = process.env.TZ;
    try {
        process.env.TZ = 'America/Los_Angeles';
        assert.deepEqual(
            resolvePickupMoment('12:20', '2026-09-02T21:05:00Z'),
            { targetMs: Date.parse('2026-09-03T09:20:00Z'), clock: '12:20' },
            'the same order stays on the Israel clock when the phone is abroad',
        );
    } finally {
        if (originalTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = originalTimezone;
    }
    assert.deepEqual(
        resolvePickupMoment('10:00', '2026-01-13T07:30:00Z'),
        { targetMs: Date.parse('2026-01-13T08:00:00Z'), clock: '10:00' },
        'winter uses UTC+2 rather than the summer offset',
    );

    const beforeIsraelMidnight = resolvePickupMoment('12:20', '2026-09-02T20:59:00Z');
    const afterIsraelMidnight = resolvePickupMoment('12:20', '2026-09-02T21:01:00Z');
    assert.ok(beforeIsraelMidnight && afterIsraelMidnight);
    assert.equal(afterIsraelMidnight.targetMs - beforeIsraelMidnight.targetMs, 24 * 60 * 60 * 1000);

    assert.deepEqual(
        resolvePickupMoment('2026-09-03T09:20:00Z', null),
        { targetMs: Date.parse('2026-09-03T09:20:00Z'), clock: '12:20' },
        'an explicit datetime owns its date and is displayed on the Israel clock',
    );
    assert.deepEqual(
        resolvePickupMoment('2026-09-03T12:20:00+03:00', null),
        { targetMs: Date.parse('2026-09-03T09:20:00Z'), clock: '12:20' },
    );

    for (const [pickupTime, createdAt] of [
        ['', '2026-09-03T07:00:00Z'],
        ['24:00', '2026-09-03T07:00:00Z'],
        ['12:60', '2026-09-03T07:00:00Z'],
        ['garbage', '2026-09-03T07:00:00Z'],
        ['12:20', 'not-a-date'],
        ['12:20', '2026-09-03T07:00:00'],
        ['12:20', '2026-02-29T07:00:00Z'],
        ['2026-09-03T12:20:00', null],
        ['2026-02-30T09:20:00Z', null],
        ['2026-09-03T12:20:00+14:30', null],
    ] as const) {
        assert.equal(resolvePickupMoment(pickupTime, createdAt), null);
    }

    assert.notEqual(resolvePickupMoment('12:20', '2028-02-29T07:00:00Z'), null,
        'February 29 remains valid in a leap year');
});

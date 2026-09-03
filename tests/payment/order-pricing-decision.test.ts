import assert from 'node:assert/strict';
import test from 'node:test';

import type { Discount } from '../../src/lib/discounts';
import { resolveOrderPricingDecision } from '../../src/lib/orderSubmissionServer';

const FIVE_PERCENT: Discount = {
    code: 'FIVE',
    type: 'percent',
    value: 5,
    active: true,
};

const TEN_PERCENT: Discount = {
    code: 'TEN',
    type: 'percent',
    value: 10,
    active: true,
};

const TWENTY_PERCENT: Discount = {
    code: 'TWENTY',
    type: 'percent',
    value: 20,
    active: true,
};

test('accepts the exact server-authoritative total', () => {
    assert.deepEqual(resolveOrderPricingDecision({
        subtotal: 100,
        submittedTotal: 90,
        typedDiscount: null,
        assignedDiscount: TEN_PERCENT,
    }), {
        discount: TEN_PERCENT,
        discountAmount: 10,
        total: 90,
        accepted: true,
        acceptance: 'exact',
    });
});

test('accepts an undiscounted client quote when a standing discount arrived late', () => {
    assert.deepEqual(resolveOrderPricingDecision({
        subtotal: 100,
        submittedTotal: 100,
        typedDiscount: null,
        assignedDiscount: TEN_PERCENT,
    }), {
        discount: TEN_PERCENT,
        discountAmount: 10,
        total: 90,
        accepted: true,
        acceptance: 'missed-stronger-standing-discount',
    });
});

test('accepts the typed-code quote when a stronger standing discount arrived late', () => {
    assert.deepEqual(resolveOrderPricingDecision({
        subtotal: 100,
        submittedTotal: 95,
        typedDiscount: FIVE_PERCENT,
        assignedDiscount: TEN_PERCENT,
    }), {
        discount: TEN_PERCENT,
        discountAmount: 10,
        total: 90,
        accepted: true,
        acceptance: 'missed-stronger-standing-discount',
    });
});

test('keeps a stronger typed discount and requires its exact total', () => {
    assert.deepEqual(resolveOrderPricingDecision({
        subtotal: 100,
        submittedTotal: 80,
        typedDiscount: TWENTY_PERCENT,
        assignedDiscount: TEN_PERCENT,
    }), {
        discount: TWENTY_PERCENT,
        discountAmount: 20,
        total: 80,
        accepted: true,
        acceptance: 'exact',
    });
});

test('rejects arbitrary totals even when they are close to an allowed quote', () => {
    for (const submittedTotal of [89, 91, 94, 96, 100]) {
        const decision = resolveOrderPricingDecision({
            subtotal: 100,
            submittedTotal,
            typedDiscount: FIVE_PERCENT,
            assignedDiscount: TEN_PERCENT,
        });
        assert.equal(decision.accepted, false, `unexpectedly accepted ${submittedTotal}`);
        assert.equal(decision.acceptance, 'rejected');
        assert.equal(decision.total, 90);
    }
});

test('rejects a stale discount after the server-side entitlement disappears', () => {
    assert.deepEqual(resolveOrderPricingDecision({
        subtotal: 100,
        submittedTotal: 90,
        typedDiscount: null,
        assignedDiscount: null,
    }), {
        discount: null,
        discountAmount: 0,
        total: 100,
        accepted: false,
        acceptance: 'rejected',
    });
});

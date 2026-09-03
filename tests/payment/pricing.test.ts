import assert from 'node:assert/strict';
import test from 'node:test';

import { effectiveItemPriceMap, effectiveSizePrice } from '../../src/lib/menuConfig';
import { computeOrderTotal } from '../../src/lib/pricing';

test('server pricing uses the canonical catalog and current menu overrides', () => {
    const base = effectiveSizePrice(750);
    const prices = effectiveItemPriceMap();
    const result = computeOrderTotal([
        { id: 'lettuce' },
        { id: 'caesar' },
        { id: 'halloumi_p' },
    ], base);

    assert.deepEqual(result, {
        valid: true,
        total: base + prices.lettuce + prices.caesar + prices.halloumi_p,
    });
});

test('client-supplied item fields cannot lower the server total', () => {
    const base = effectiveSizePrice(1000);
    const canonicalPrice = effectiveItemPriceMap().halloumi_p;
    const tamperedItem = {
        id: 'halloumi_p',
        price: -10_000,
        he: 'free',
    };

    assert.deepEqual(computeOrderTotal([tamperedItem], base), {
        valid: true,
        total: base + canonicalPrice,
    });
});

test('unknown item ids are rejected instead of being treated as free', () => {
    assert.deepEqual(computeOrderTotal(
        [{ id: 'not-in-the-menu' }],
        effectiveSizePrice(1500),
    ), { valid: false, total: 0 });
});

test('invalid bases are rejected before any total is accepted', () => {
    assert.deepEqual(computeOrderTotal([{ id: 'lettuce' }], 1), {
        valid: false,
        total: 0,
    });
    assert.deepEqual(computeOrderTotal([{ id: 'lettuce' }], Number.NaN), {
        valid: false,
        total: 0,
    });
});

test('malformed item entries fail closed', () => {
    const malformed = [null, {}, { id: 42 }] as unknown as { id: string }[];
    assert.deepEqual(computeOrderTotal(malformed, effectiveSizePrice(750)), {
        valid: false,
        total: 0,
    });
});

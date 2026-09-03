import assert from 'node:assert/strict';
import test from 'node:test';

import { effectiveBase, effectiveSizePrice } from '../../src/lib/menuConfig';
import {
    buildReorderHref,
    detectOrderType,
    isOrderReorderable,
    stashReorder,
    takeReorder,
} from '../../src/lib/reorder';

function withMemorySessionStorage(run: (entries: Map<string, string>) => void): void {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    const entries = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: {
            getItem: (key: string) => entries.get(key) ?? null,
            setItem: (key: string, value: string) => entries.set(key, value),
            removeItem: (key: string) => entries.delete(key),
        },
    });

    try {
        run(entries);
    } finally {
        if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
        else delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
}

test('reorder destinations and availability follow the stored product base', () => {
    assert.equal(buildReorderHref({ size: effectiveSizePrice(1000) }), '/build?type=salad&size=1000');
    assert.equal(isOrderReorderable({ size: effectiveSizePrice(1000) }), true);
    assert.equal(buildReorderHref({ size: effectiveBase('tortilla') }), '/build?type=tortilla');
    assert.equal(isOrderReorderable({ size: effectiveBase('tortilla') }), false);
    for (const unknownSize of [null, undefined, '', 'not-a-price', 1, 9_999]) {
        assert.equal(detectOrderType(unknownSize), null);
        assert.equal(isOrderReorderable({ size: unknownSize }), false);
        assert.equal(buildReorderHref({ size: unknownSize }), '/home2');
    }
});

test('reorder payloads are one-shot and scoped to the expected product', () => {
    withMemorySessionStorage(entries => {
        stashReorder(['lettuce'], 'same', 'tortilla');
        assert.equal(takeReorder('salad'), null);
        assert.equal(entries.size, 0, 'a mismatched payload must be cleared, not deferred');

        stashReorder(['lettuce', 'tomato'], 'edit', 'salad');
        assert.deepEqual(takeReorder('salad'), {
            itemIds: ['lettuce', 'tomato'],
            mode: 'edit',
            product: 'salad',
        });
        assert.equal(takeReorder('salad'), null);

        entries.set('bb-reorder', JSON.stringify({ itemIds: ['lettuce'], mode: 'same' }));
        assert.equal(takeReorder('salad'), null, 'an unscoped payload from an older client must fail closed');
        assert.equal(entries.size, 0);
    });
});

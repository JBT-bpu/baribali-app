import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    claimOrderSubmission,
    clearOrderSubmission,
    orderSubmissionIntent,
    ORDER_SUBMISSION_TTL_MS,
    type OrderSubmissionStorage,
} from '../../src/lib/orderSubmission';

const summarySource = readFileSync(new URL(
    '../../src/components/builder/SummaryView.jsx',
    import.meta.url,
), 'utf8');

class MemoryStorage implements OrderSubmissionStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

function makeIntent(overrides: Record<string, unknown> = {}): string {
    return orderSubmissionIntent({
        items: [],
        total: 54,
        size: 54,
        productType: 'salad',
        pickupTime: null,
        notes: null,
        ...overrides,
    });
}

test('semantic intent ignores mutable prices and presentation but preserves ordered choices', () => {
    const first = orderSubmissionIntent({
        total: 72,
        items: [
            { id: 'tomato', he: 'עגבנייה', icon: '/tomato.webp', price: 0 },
            { id: 'quinoa', he: 'קינואה', icon: '/quinoa.webp', price: 2 },
        ],
        size: 72,
        productType: 'salad',
        pickupTime: ' 12:20 ',
        discountCode: ' vip ',
        notes: '  בלי בצל\r\nבבקשה  ',
    });
    const same = orderSubmissionIntent({
        total: 999,
        items: [
            { price: 41, icon: '/new-tomato.webp', he: 'שם חדש', id: 'tomato' },
            { price: 63, icon: '/new-quinoa.webp', he: 'מטא-דאטה חדש', id: 'quinoa' },
        ],
        size: 72,
        productType: 'salad',
        pickupTime: '12:20',
        discountCode: 'VIP',
        notes: 'בלי בצל\nבבקשה',
    });
    const reordered = orderSubmissionIntent({
        total: 72,
        items: [
            { id: 'quinoa', price: 2 },
            { id: 'tomato', price: 0 },
        ],
        size: 72,
        productType: 'salad',
        pickupTime: '12:20',
        discountCode: 'VIP',
        notes: 'בלי בצל\nבבקשה',
    });

    assert.equal(first, same);
    assert.notEqual(first, reordered);
    assert.notEqual(first, orderSubmissionIntent({
        items: [
            { id: 'tomato' },
            { id: 'quinoa' },
        ],
        total: 72,
        size: 72,
        productType: 'salad',
        pickupTime: '12:20',
        discountCode: 'VIP',
        notes: 'בלי בצל בכלל',
    }));
    assert.notEqual(first, orderSubmissionIntent({
        items: [{ id: 'tomato' }, { id: 'quinoa' }],
        total: 72,
        size: 72,
        productType: 'salad',
        pickupTime: '12:20',
        discountCode: 'VIP',
        notes: 'בלי בצל\nבבקשה',
        paymentChoice: 'now',
    }));

    const storage = new MemoryStorage();
    const firstClaim = claimOrderSubmission(first, null, {
        storage,
        now: () => 5_000,
        randomUUID: () => UUID_A,
    });
    const metadataOnlyRetry = claimOrderSubmission(same, null, {
        storage,
        now: () => 5_001,
        randomUUID: () => { throw new Error('metadata and total changes must reuse the key'); },
    });
    const changedChoice = claimOrderSubmission(reordered, firstClaim, {
        storage,
        now: () => 5_002,
        randomUUID: () => UUID_B,
    });
    assert.equal(metadataOnlyRetry.submissionKey, firstClaim.submissionKey);
    assert.equal(changedChoice.submissionKey, UUID_B);
});

test('same intent reuses one submission key from memory and after a remount', () => {
    const storage = new MemoryStorage();
    let generated = 0;
    const randomUUID = () => {
        generated += 1;
        return generated === 1 ? UUID_A : UUID_B;
    };
    const now = () => 10_000;
    const intent = makeIntent({ items: [{ id: 'tomato' }], total: 72, size: 72 });

    const first = claimOrderSubmission(intent, null, { storage, now, randomUUID });
    const inMemoryRetry = claimOrderSubmission(intent, first, { storage, now, randomUUID });
    const afterRemount = claimOrderSubmission(intent, null, { storage, now, randomUUID });

    assert.equal(first.submissionKey, UUID_A);
    assert.deepEqual(inMemoryRetry, first);
    assert.deepEqual(afterRemount, first);
    assert.equal(generated, 1);
});

test('changed intents get distinct keys without discarding an ambiguous earlier intent', () => {
    const storage = new MemoryStorage();
    const keys = [UUID_A, UUID_B];
    const now = () => 20_000;
    const firstIntent = makeIntent({ items: [{ id: 'tomato' }], total: 72, size: 72 });
    const changedIntent = makeIntent({ items: [{ id: 'tomato' }], total: 72, size: 72, notes: 'בלי בצל' });

    const first = claimOrderSubmission(firstIntent, null, { storage, now, randomUUID: () => keys.shift()! });
    const changed = claimOrderSubmission(changedIntent, first, { storage, now, randomUUID: () => keys.shift()! });
    const restoredFirst = claimOrderSubmission(firstIntent, null, {
        storage,
        now,
        randomUUID: () => { throw new Error('must not generate'); },
    });

    assert.equal(first.submissionKey, UUID_A);
    assert.equal(changed.submissionKey, UUID_B);
    assert.equal(restoredFirst.submissionKey, UUID_A);
});

test('expired records receive a new key after the thirty-minute retry window', () => {
    const storage = new MemoryStorage();
    const intent = makeIntent();
    const first = claimOrderSubmission(intent, null, {
        storage,
        now: () => 1_000,
        randomUUID: () => UUID_A,
    });
    const renewed = claimOrderSubmission(intent, null, {
        storage,
        now: () => 1_000 + ORDER_SUBMISSION_TTL_MS + 1,
        randomUUID: () => UUID_B,
    });

    assert.equal(first.submissionKey, UUID_A);
    assert.equal(renewed.submissionKey, UUID_B);
});

test('clearing one definitive submission leaves unrelated ambiguous intents intact', () => {
    const storage = new MemoryStorage();
    const first = claimOrderSubmission(makeIntent({ total: 54, size: 54 }), null, {
        storage,
        now: () => 30_000,
        randomUUID: () => UUID_A,
    });
    const second = claimOrderSubmission(makeIntent({ total: 59, size: 59 }), null, {
        storage,
        now: () => 30_000,
        randomUUID: () => UUID_B,
    });

    clearOrderSubmission(first, { storage });
    const secondRetry = claimOrderSubmission(second.intent, null, {
        storage,
        now: () => 30_001,
        randomUUID: () => { throw new Error('must not generate'); },
    });
    assert.equal(secondRetry.submissionKey, UUID_B);

    clearOrderSubmission(second, { storage });
    const afterClear = claimOrderSubmission(second.intent, null, {
        storage,
        now: () => 30_002,
        randomUUID: () => UUID_C,
    });
    assert.equal(afterClear.submissionKey, UUID_C);
});

test('storage failures still retain a retry key in the mounted client', () => {
    const unavailable: OrderSubmissionStorage = {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
    };
    const intent = makeIntent();
    let generated = 0;
    const first = claimOrderSubmission(intent, null, {
        storage: unavailable,
        now: () => 40_000,
        randomUUID: () => { generated += 1; return UUID_A; },
    });
    const retry = claimOrderSubmission(intent, first, {
        storage: unavailable,
        now: () => 40_001,
        randomUUID: () => { generated += 1; return UUID_B; },
    });

    assert.equal(retry.submissionKey, UUID_A);
    assert.equal(generated, 1);
});

test('checkout derives the intent before attaching its key and retains ambiguity', () => {
    const orderBody = summarySource.indexOf('const orderBody = {');
    const intent = summarySource.indexOf('orderSubmissionIntent(orderBody)', orderBody);
    const claim = summarySource.indexOf('claimOrderSubmission(', intent);
    const request = summarySource.indexOf("fetch('/api/orders'", claim);
    const attachedKey = summarySource.indexOf('submissionKey: submission.submissionKey', request);

    assert.ok(orderBody !== -1 && orderBody < intent);
    assert.ok(intent < claim && claim < request);
    assert.ok(attachedKey > request);
    assert.match(summarySource, /data\?\.code === 'SUBMISSION_KEY_CONFLICT'[\s\S]*?clearOrderSubmission\(submission\)/);
    assert.match(summarySource, /if \(data\?\.paymentFailed\)[\s\S]*?clearOrderSubmission\(submission\)/);
    assert.equal(summarySource.match(/clearOrderSubmission\(submission\)/g)?.length, 3,
        'only conflict, payment failure, and accepted-order paths may clear the key');

    const catchStart = summarySource.indexOf('} catch (err) {', request);
    const submitEnd = summarySource.indexOf('\n    };', catchStart);
    assert.doesNotMatch(summarySource.slice(catchStart, submitEnd), /clearOrderSubmission/,
        'timeout and network ambiguity must retain the submission key');
});

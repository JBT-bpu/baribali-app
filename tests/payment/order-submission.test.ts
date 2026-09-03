import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    claimOrderSubmission,
    clearOrderSubmission,
    clearOrderSubmissionForOrder,
    markOrderSubmissionPaymentPending,
    orderSubmissionCartIntent,
    orderSubmissionIntent,
    ORDER_SUBMISSION_TTL_MS,
    restoreOrderSubmission,
    type OrderSubmissionStorage,
} from '../../src/lib/orderSubmission';

const summarySource = readFileSync(new URL(
    '../../src/components/builder/SummaryView.jsx',
    import.meta.url,
), 'utf8');
const trackingSource = readFileSync(new URL(
    '../../src/app/order/[id]/OrderStatusView.tsx',
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
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeBody(overrides: Record<string, unknown> = {}) {
    return {
        items: [{ id: 'tomato', he: 'עגבנייה', icon: '/tomato.webp', price: 0 }],
        total: 54,
        size: 54,
        productType: 'salad',
        pickupTime: '12:20',
        notes: null,
        ...overrides,
    };
}

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

test('hard reload restores the exact ambiguous request for the same draft', () => {
    const storage = new MemoryStorage();
    const body = makeBody({ pickupTime: '12:20', discountCode: 'VIP' });
    const cartIntent = orderSubmissionCartIntent(body);
    const claimed = claimOrderSubmission(orderSubmissionIntent(body), null, {
        storage,
        now: () => 15_000,
        randomUUID: () => UUID_A,
        requestBody: body,
        cartIntent,
    });

    // Checkout-only state is gone after reload, but the persisted builder draft
    // still identifies the exact request that may already have committed.
    const afterReloadCart = orderSubmissionCartIntent(makeBody({
        pickupTime: null,
        discountCode: undefined,
    }));
    const restored = restoreOrderSubmission(afterReloadCart, {
        storage,
        now: () => 15_001,
    });

    assert.equal(afterReloadCart, cartIntent);
    assert.equal(restored?.submissionKey, claimed.submissionKey);
    assert.deepEqual(restored?.requestBody, body);
});

test('a server price correction keeps the submission key and persists the corrected body', () => {
    const storage = new MemoryStorage();
    const originalBody = makeBody({ total: 54 });
    const intent = orderSubmissionIntent(originalBody);
    const first = claimOrderSubmission(intent, null, {
        storage,
        now: () => 16_000,
        randomUUID: () => UUID_A,
        requestBody: originalBody,
    });
    const correctedBody = { ...originalBody, total: 59 };
    const corrected = claimOrderSubmission(orderSubmissionIntent(correctedBody), first, {
        storage,
        now: () => 16_001,
        randomUUID: () => { throw new Error('a total-only correction must reuse the key'); },
        requestBody: correctedBody,
    });
    const restored = claimOrderSubmission(intent, null, {
        storage,
        now: () => 16_002,
        randomUUID: () => { throw new Error('the corrected record must already exist'); },
    });

    assert.equal(corrected.submissionKey, UUID_A);
    assert.equal(restored.submissionKey, UUID_A);
    assert.equal(restored.requestBody?.total, 59);
});

test('pending payment identity survives reload and tracking clears only its order', () => {
    const storage = new MemoryStorage();
    const body = makeBody();
    const cartIntent = orderSubmissionCartIntent(body);
    const claimed = claimOrderSubmission(orderSubmissionIntent(body), null, {
        storage,
        now: () => 17_000,
        randomUUID: () => UUID_A,
        requestBody: body,
        cartIntent,
    });
    markOrderSubmissionPaymentPending(claimed, {
        orderId: ORDER_ID,
        orderNum: 'BB-1234',
        idempotencyKey: UUID_B,
    }, { storage });

    const restored = restoreOrderSubmission(cartIntent, { storage, now: () => 17_001 });
    assert.deepEqual(restored?.pendingPayment, {
        orderId: ORDER_ID,
        orderNum: 'BB-1234',
        idempotencyKey: UUID_B,
    });

    clearOrderSubmissionForOrder(ORDER_ID, { storage });
    assert.equal(restoreOrderSubmission(cartIntent, { storage, now: () => 17_002 }), null);
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

test('checkout persists ambiguity and payment identity until tracking takes over', () => {
    const orderBody = summarySource.indexOf('orderBody = {');
    const intent = summarySource.indexOf('orderSubmissionIntent(orderBody)', orderBody);
    const claim = summarySource.indexOf('claimOrderSubmission(', intent);
    const request = summarySource.indexOf("fetch('/api/orders'", claim);
    const attachedKey = summarySource.indexOf('submissionKey: submission.submissionKey', request);

    assert.ok(orderBody !== -1 && orderBody < intent);
    assert.ok(intent < claim && claim < request);
    assert.ok(attachedKey > request);
    assert.match(summarySource, /definitiveRejection[\s\S]*?clearOrderSubmission\(submission\)/);
    const priceCorrection = summarySource.indexOf("data?.code === 'ORDER_TOTAL_CHANGED'", request);
    const definitiveRejection = summarySource.indexOf('const definitiveRejection', request);
    assert.ok(priceCorrection > request && priceCorrection < definitiveRejection,
        'a price correction must preserve and update the key before generic 4xx cleanup');
    assert.match(summarySource, /correctedBody[\s\S]*?claimOrderSubmission\([\s\S]*?requestBody: correctedBody/);
    assert.match(summarySource, /total: typeof data\.total === 'number'/,
        'the confirmation must prefer the server-recorded total');
    assert.match(summarySource, /if \(data\?\.paymentFailed\)[\s\S]*?clearOrderSubmission\(submission\)/);
    assert.equal(summarySource.match(/clearOrderSubmission\(submission\)/g)?.length, 3,
        'only definitive rejection, payment failure, and on-page confirmation clear the key');
    const markPending = summarySource.indexOf('markOrderSubmissionPaymentPending(', request);
    const launchPending = summarySource.indexOf('await launchPendingPayment(pendingPayment)', markPending);
    assert.ok(markPending > request && launchPending > markPending,
        'payment identity must be durable before asking the provider for a page');
    assert.match(summarySource, /requiresHostedPayment\(data\.paymentStatus\)/,
        'only an explicitly pending order may launch hosted payment');
    assert.doesNotMatch(summarySource, /data\.id && !data\.demo && !data\.payAtPickup/,
        'a non-pickup status is not by itself evidence that money is owed');
    assert.match(summarySource, /restoreOrderSubmission\(recoveryCartIntent\)/);
    assert.match(trackingSource, /clearOrderSubmissionForOrder\(id\)/);

    const catchStart = summarySource.indexOf('} catch (err) {', request);
    assert.ok(catchStart > request, 'the order request must retain a network-error boundary');
    const submitEnd = summarySource.indexOf('\n    };', catchStart);
    assert.doesNotMatch(summarySource.slice(catchStart, submitEnd), /clearOrderSubmission/,
        'timeout and network ambiguity must retain the submission key');
});

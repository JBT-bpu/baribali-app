import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { STEPS } from '../../src/data/salad-data.js';
import { effectiveBase, effectiveItemPrice, effectiveSizePrice } from '../../src/lib/menuConfig';
import {
    orderSubmissionFingerprint,
    parseOrderSubmissionIntent,
} from '../../src/lib/orderSubmissionServer';
import { pickupSlots } from '../../src/lib/shopHours';
import { isolateSupabaseTestEnvironment } from './testEnvironment';

interface TestItem { id: string; he: string; icon: string; price: number }
interface TestStep { subgroups: { items: TestItem[] }[] }

const lettuce = (STEPS as TestStep[])
    .flatMap(step => step.subgroups.flatMap(subgroup => subgroup.items))
    .find(item => item.id === 'lettuce');
assert.ok(lettuce);

const base = effectiveSizePrice(750);
const total = base + effectiveItemPrice(lettuce.id, lettuce.price);
const defaultPickupTime = pickupSlots(new Date())[0]?.id ?? null;

function orderBody(submissionKey: string, overrides: Record<string, unknown> = {}) {
    return {
        submissionKey,
        items: [{
            id: lettuce!.id,
            he: '<script>forged</script>',
            icon: 'https://attacker.invalid/tracker.png',
            price: -50_000,
            extra: 'discard me',
        }],
        total,
        pickupTime: defaultPickupTime,
        notes: null,
        size: base,
        productType: 'salad',
        paymentChoice: 'pickup',
        ...overrides,
    };
}

function request(body: unknown, source: string) {
    return new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-forwarded-for': source,
        },
        body: JSON.stringify(body),
    });
}

test('orders route canonicalizes and idempotently records demo orders', async t => {
    const restoreEnvironment = isolateSupabaseTestEnvironment();

    const [{ POST }, demoStore, shopState] = await Promise.all([
        import('../../src/app/api/orders/route'),
        import('../../src/lib/demoStore'),
        import('../../src/lib/shopState'),
    ]);

    try {
        await shopState.writeShopState('open', null);

        await t.test('requires a well-formed UUID submission key', async () => {
            demoStore.resetDemoStore();
            const missing = orderBody('11111111-1111-4111-8111-111111111111');
            delete (missing as Partial<typeof missing>).submissionKey;
            const missingResponse = await POST(request(missing, 'order-key-missing'));
            assert.equal(missingResponse.status, 400);
            assert.equal((await missingResponse.json()).code, 'INVALID_SUBMISSION_KEY');

            const invalidResponse = await POST(request(
                orderBody('not-a-uuid'),
                'order-key-invalid',
            ));
            assert.equal(invalidResponse.status, 400);
            assert.equal((await invalidResponse.json()).code, 'INVALID_SUBMISSION_KEY');
            assert.equal(demoStore.listDemoOrders().length, 0);
        });

        await t.test('persists only server-canonical item snapshots', async () => {
            demoStore.resetDemoStore();
            const response = await POST(request(
                orderBody('11111111-1111-4111-8111-111111111111'),
                'order-canonicalization',
            ));

            assert.equal(response.status, 200);
            const payload = await response.json();
            assert.equal(payload.total, total);
            const stored = demoStore.getDemoOrder(payload.id);
            assert.ok(stored);
            assert.deepEqual(stored.items, [{
                id: lettuce!.id,
                he: lettuce!.he,
                icon: lettuce!.icon,
                price: effectiveItemPrice(lettuce!.id, lettuce!.price),
            }]);
        });

        await t.test('sequential replay returns the original order once', async () => {
            demoStore.resetDemoStore();
            const key = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
            const body = orderBody(key);
            const first = await POST(request(body, 'order-sequential'));
            const replay = await POST(request(
                orderBody(key.toUpperCase()),
                'order-sequential',
            ));
            const firstPayload = await first.json();
            const replayPayload = await replay.json();

            assert.equal(first.status, 200);
            assert.equal(replay.status, 200);
            assert.equal(firstPayload.replayed, false);
            assert.equal(replayPayload.replayed, true);
            assert.equal(replayPayload.id, firstPayload.id);
            assert.equal(replayPayload.orderNum, firstPayload.orderNum);
            assert.equal(replayPayload.total, firstPayload.total);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('concurrent equal submissions converge on one order', async () => {
            demoStore.resetDemoStore();
            const body = orderBody('33333333-3333-4333-8333-333333333333');
            const responses = await Promise.all([
                POST(request(body, 'order-concurrent-a')),
                POST(request(body, 'order-concurrent-b')),
            ]);
            const payloads = await Promise.all(responses.map(response => response.json()));

            assert.deepEqual(responses.map(response => response.status), [200, 200]);
            assert.equal(new Set(payloads.map(payload => payload.id)).size, 1);
            assert.equal(payloads.filter(payload => payload.replayed === false).length, 1);
            assert.equal(payloads.filter(payload => payload.replayed === true).length, 1);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('same key with changed customer intent conflicts', async () => {
            demoStore.resetDemoStore();
            const key = '44444444-4444-4444-8444-444444444444';
            const first = await POST(request(orderBody(key), 'order-conflict'));
            const changed = await POST(request(
                orderBody(key, { notes: 'בלי בצל' }),
                'order-conflict',
            ));

            assert.equal(first.status, 200);
            assert.equal(changed.status, 409);
            assert.equal((await changed.json()).code, 'SUBMISSION_KEY_CONFLICT');
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('a lost response can replay after the shop closes', async () => {
            demoStore.resetDemoStore();
            const body = orderBody('55555555-5555-4555-8555-555555555555');
            const lostResponse = await POST(request(body, 'order-lost-response'));
            const original = await lostResponse.json();
            assert.equal(lostResponse.status, 200);

            await shopState.writeShopState('closed', null);
            const recoveredResponse = await POST(request(body, 'order-lost-response'));
            const recovered = await recoveredResponse.json();
            assert.equal(recoveredResponse.status, 200);
            assert.equal(recovered.replayed, true);
            assert.equal(recovered.id, original.id);
            assert.equal(demoStore.listDemoOrders().length, 1);
            await shopState.writeShopState('open', null);
        });

        await t.test('demo override is shared across separately evaluated route graphs', async () => {
            const moduleUrl = new URL('../../src/lib/shopState.ts', import.meta.url).href;
            const writer = await import(`${moduleUrl}?graph=writer`);
            const reader = await import(`${moduleUrl}?graph=reader`);

            await writer.writeShopState('closed', 'shared graph check');
            assert.deepEqual(await reader.readShopState(), {
                override: 'closed',
                note: 'shared graph check',
                available: true,
            });

            await reader.writeShopState('open', null);
            assert.deepEqual(await writer.readShopState(), {
                override: 'open',
                note: null,
                available: true,
            });
        });

        await t.test('a rejected attempt does not reserve its key', async () => {
            demoStore.resetDemoStore();
            const key = '66666666-6666-4666-8666-666666666666';
            const rejected = await POST(request(
                orderBody(key, { total: total + 1 }),
                'order-rejected-key',
            ));
            assert.equal(rejected.status, 409);
            assert.deepEqual(await rejected.json(), {
                error: `המחיר עודכן ל־₪${total}. עברו על הסכום ולחצו שוב לאישור.`,
                code: 'ORDER_TOTAL_CHANGED',
                expectedTotal: total,
                subtotal: total,
                discountAmount: 0,
                discount: null,
            });
            assert.equal(demoStore.listDemoOrders().length, 0);

            const accepted = await POST(request(orderBody(key), 'order-rejected-key'));
            assert.equal(accepted.status, 200);
            assert.equal((await accepted.json()).replayed, false);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('unavailable tortilla cannot be ordered or reserve a submission key', async () => {
            demoStore.resetDemoStore();
            const key = '67676767-6767-4767-8767-676767676767';
            const tortillaBase = effectiveBase('tortilla');
            const explicit = await POST(request(orderBody(key, {
                size: tortillaBase,
                total: tortillaBase,
                items: [],
                productType: 'tortilla',
            }), 'order-tortilla-explicit'));

            assert.equal(explicit.status, 409);
            assert.deepEqual(await explicit.json(), {
                error: 'הטורטייה עדיין לא זמינה להזמנה. בחרו סלט.',
                code: 'PRODUCT_UNAVAILABLE',
            });
            assert.equal(demoStore.listDemoOrders().length, 0);
            assert.equal(demoStore.listDemoPickupAllocations().length, 0);

            const legacyBody = orderBody('68686868-6868-4868-8868-686868686868', {
                size: tortillaBase,
                total: tortillaBase,
                items: [],
            });
            delete (legacyBody as Partial<typeof legacyBody>).productType;
            const legacy = await POST(request(legacyBody, 'order-tortilla-legacy'));
            assert.equal(legacy.status, 409);
            assert.equal((await legacy.json()).code, 'PRODUCT_UNAVAILABLE');
            assert.equal(demoStore.listDemoOrders().length, 0);

            const reusedKey = await POST(request(orderBody(key), 'order-tortilla-reused-key'));
            assert.equal(reusedKey.status, 200);
            assert.equal((await reusedKey.json()).replayed, false);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('an already-recorded tortilla submission remains replayable', async () => {
            demoStore.resetDemoStore();
            const key = '69696969-6969-4969-8969-696969696969';
            const tortillaBase = effectiveBase('tortilla');
            const historicBody = orderBody(key, {
                size: tortillaBase,
                total: tortillaBase,
                items: [],
                productType: 'tortilla',
            });
            const parsed = parseOrderSubmissionIntent(historicBody, true);
            assert.equal(parsed.valid, true);
            if (!parsed.valid) return;

            const seeded = demoStore.createDemoOrderOnce({
                submissionKey: key,
                submissionFingerprint: orderSubmissionFingerprint(parsed.intent),
                serviceDate: '2026-09-04',
                items: [],
                total: tortillaBase,
                pickupTime: parsed.intent.pickupTime,
                notes: parsed.intent.notes,
                size: String(tortillaBase),
                paymentStatus: 'pay_at_pickup',
            });
            assert.equal(seeded.result, 'created');
            if (seeded.result !== 'created') return;

            const replay = await POST(request(historicBody, 'order-tortilla-replay'));
            const payload = await replay.json();
            assert.equal(replay.status, 200);
            assert.equal(payload.replayed, true);
            assert.equal(payload.id, seeded.order.id);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });

        await t.test('regular service rejects missing and invented pickup slots', async testContext => {
            demoStore.resetDemoStore();
            await shopState.writeShopState(null, null);
            testContext.mock.timers.enable({
                apis: ['Date'],
                now: new Date('2026-09-03T09:00:00Z'), // Thursday, 12:00 Israel
            });

            const missing = await POST(request(orderBody(
                '77777777-7777-4777-8777-777777777777',
                { pickupTime: null },
            ), 'order-pickup-missing'));
            assert.equal(missing.status, 409);
            assert.equal((await missing.json()).code, 'PICKUP_TIME_REQUIRED');

            const offGrid = await POST(request(orderBody(
                '88888888-8888-4888-8888-888888888888',
                { pickupTime: '12:31' },
            ), 'order-pickup-off-grid'));
            assert.equal(offGrid.status, 409);
            assert.equal((await offGrid.json()).pickupRejected, 'malformed');

            const beyondHorizon = await POST(request(orderBody(
                '99999999-9999-4999-8999-999999999999',
                { pickupTime: '15:55' },
            ), 'order-pickup-horizon'));
            assert.equal(beyondHorizon.status, 409);
            assert.equal((await beyondHorizon.json()).pickupRejected, 'unavailable');

            const accepted = await POST(request(orderBody(
                'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                { pickupTime: '12:25' },
            ), 'order-pickup-valid'));
            assert.equal(accepted.status, 200);
            assert.equal(demoStore.listDemoPickupAllocations().length, 1);

            demoStore.resetDemoStore();
            const capacityKey = (index: number) =>
                `d0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
            for (let index = 1; index <= 5; index += 1) {
                const admitted = await POST(request(orderBody(
                    capacityKey(index),
                    { pickupTime: '12:25' },
                ), 'order-capacity-route'));
                assert.equal(admitted.status, 200);
            }

            const full = await POST(request(orderBody(
                capacityKey(6),
                { pickupTime: '12:25' },
            ), 'order-capacity-route'));
            assert.equal(full.status, 409);
            assert.equal((await full.json()).code, 'PICKUP_SLOT_FULL');
            assert.equal(demoStore.listDemoOrders().length, 5);

            const reusedRejectedKey = await POST(request(orderBody(
                capacityKey(6),
                { pickupTime: '12:30' },
            ), 'order-capacity-route'));
            assert.equal(reusedRejectedKey.status, 200);
            assert.equal(demoStore.listDemoOrders().length, 6);
        });

        await t.test('a forced opening with no schedule slots may coordinate pickup at the counter', async testContext => {
            demoStore.resetDemoStore();
            await shopState.writeShopState('open', null);
            testContext.mock.timers.enable({
                apis: ['Date'],
                now: new Date('2026-09-05T09:00:00Z'), // Saturday, 12:00 Israel
            });

            const response = await POST(request(orderBody(
                'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                { pickupTime: null },
            ), 'order-pickup-counter'));
            assert.equal(response.status, 200);

            const blankResponse = await POST(request(orderBody(
                'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                { pickupTime: '   ' },
            ), 'order-pickup-counter-blank'));
            assert.equal(blankResponse.status, 200);
            assert.equal(demoStore.listDemoPickupAllocations().length, 0);
        });
    } finally {
        demoStore.resetDemoStore();
        await shopState.writeShopState(null, null);
        restoreEnvironment();
    }
});

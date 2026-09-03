import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { STEPS } from '../../src/data/salad-data.js';
import { effectiveItemPrice, effectiveSizePrice } from '../../src/lib/menuConfig';

interface TestItem { id: string; he: string; icon: string; price: number }
interface TestStep { subgroups: { items: TestItem[] }[] }

const lettuce = (STEPS as TestStep[])
    .flatMap(step => step.subgroups.flatMap(subgroup => subgroup.items))
    .find(item => item.id === 'lettuce');
assert.ok(lettuce);

const base = effectiveSizePrice(750);
const total = base + effectiveItemPrice(lettuce.id, lettuce.price);

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
        pickupTime: null,
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
    const savedEnv = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

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

        await t.test('a rejected attempt does not reserve its key', async () => {
            demoStore.resetDemoStore();
            const key = '66666666-6666-4666-8666-666666666666';
            const rejected = await POST(request(
                orderBody(key, { total: total + 1 }),
                'order-rejected-key',
            ));
            assert.equal(rejected.status, 400);
            assert.equal(demoStore.listDemoOrders().length, 0);

            const accepted = await POST(request(orderBody(key), 'order-rejected-key'));
            assert.equal(accepted.status, 200);
            assert.equal((await accepted.json()).replayed, false);
            assert.equal(demoStore.listDemoOrders().length, 1);
        });
    } finally {
        demoStore.resetDemoStore();
        await shopState.writeShopState(null, null);
        if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url;
        if (savedEnv.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedEnv.anon;
        if (savedEnv.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        else process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.service;
    }
});

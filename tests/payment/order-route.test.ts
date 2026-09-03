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

test('orders route persists server-canonical items in demo mode', async () => {
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
        demoStore.resetDemoStore();
        await shopState.writeShopState('open', null);
        const base = effectiveSizePrice(750);
        const response = await POST(new NextRequest('http://localhost/api/orders', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': 'order-route-canonicalization-test',
            },
            body: JSON.stringify({
                items: [{
                    id: lettuce.id,
                    he: '<script>forged</script>',
                    icon: 'https://attacker.invalid/tracker.png',
                    price: -50_000,
                    extra: 'discard me',
                }],
                total: base + effectiveItemPrice(lettuce.id, lettuce.price),
                pickupTime: null,
                notes: null,
                size: base,
                productType: 'salad',
                paymentChoice: 'pickup',
            }),
        }));

        assert.equal(response.status, 200);
        const payload = await response.json();
        const stored = demoStore.getDemoOrder(payload.id);
        assert.ok(stored);
        assert.deepEqual(stored.items, [{
            id: lettuce.id,
            he: lettuce.he,
            icon: lettuce.icon,
            price: effectiveItemPrice(lettuce.id, lettuce.price),
        }]);
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

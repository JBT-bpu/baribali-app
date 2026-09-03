import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import { isolateSupabaseTestEnvironment } from './testEnvironment';

test('kitchen rehearsal creates and selectively clears simulated orders in demo mode', async () => {
    const restoreEnvironment = isolateSupabaseTestEnvironment();

    const [{ POST, DELETE }, demoStore] = await Promise.all([
        import('../../src/app/api/kitchen/simulate/route'),
        import('../../src/lib/demoStore'),
    ]);

    try {
        demoStore.resetDemoStore();
        const regular = demoStore.createDemoOrder({
            items: [],
            total: 54,
            size: '54',
            paymentStatus: 'pay_at_pickup',
        });

        const created = await POST(new NextRequest('http://localhost/api/kitchen/simulate', {
            method: 'POST',
        }));
        assert.equal(created.status, 200);
        const createdPayload = await created.json();
        assert.equal(createdPayload.demo, true);
        assert.match(createdPayload.orderNum, /^SIM-\d{4}$/);

        const beforeClear = demoStore.listDemoOrders();
        assert.equal(beforeClear.length, 2);
        assert.equal(beforeClear.filter(order => order.order_num.startsWith('SIM-')).length, 1);

        const cleared = await DELETE(new NextRequest('http://localhost/api/kitchen/simulate', {
            method: 'DELETE',
        }));
        assert.equal(cleared.status, 200);
        assert.deepEqual(await cleared.json(), { removed: 1, demo: true });
        assert.deepEqual(demoStore.listDemoOrders().map(order => order.id), [regular.id]);
    } finally {
        demoStore.resetDemoStore();
        restoreEnvironment();
    }
});

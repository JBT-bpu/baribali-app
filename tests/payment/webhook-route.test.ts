import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';

test('the generic webhook rejects Hyp before reading a YaadPay-shaped payload', async () => {
    const savedProvider = process.env.PAYMENT_PROVIDER;
    const savedFetch = globalThis.fetch;
    let fetchCalls = 0;
    process.env.PAYMENT_PROVIDER = 'hyp';
    globalThis.fetch = async () => {
        fetchCalls += 1;
        throw new Error('generic Hyp webhook must not contact Supabase');
    };

    try {
        const { POST } = await import('../../src/app/api/payment/webhook/route');
        const request = new NextRequest('http://localhost/api/payment/webhook', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: 'CCode=000&Order=BB-1234&Price=1050',
        });

        const response = await POST(request);
        const payload = await response.json();

        assert.equal(response.status, 409);
        assert.equal(request.bodyUsed, false);
        assert.equal(fetchCalls, 0);
        assert.equal(payload.ok, false);
    } finally {
        globalThis.fetch = savedFetch;
        if (savedProvider === undefined) delete process.env.PAYMENT_PROVIDER;
        else process.env.PAYMENT_PROVIDER = savedProvider;
    }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    CustomerDiscountLookupError,
    getCustomerDiscount,
    lookupCustomerDiscount,
    type CustomerDiscountLookupClient,
} from '../../src/lib/customerTags';
import { supabaseConfigurationState } from '../../src/lib/supabaseServerConfig';
import { isolateSupabaseTestEnvironment } from './testEnvironment';

const ordersRouteSource = readFileSync(new URL(
    '../../src/app/api/orders/route.ts',
    import.meta.url,
), 'utf8');
const previewRouteSource = readFileSync(new URL(
    '../../src/app/api/my/discount/route.ts',
    import.meta.url,
), 'utf8');

interface FakeQueryOptions {
    data?: unknown;
    error?: unknown;
    throws?: unknown;
    calls?: string[];
}

function fakeClient(options: FakeQueryOptions = {}): CustomerDiscountLookupClient {
    return {
        from(table: string) {
            options.calls?.push(`from:${table}`);
            return {
                select(columns: string) {
                    options.calls?.push(`select:${columns}`);
                    return {
                        eq(column: string, value: unknown) {
                            options.calls?.push(`eq:${column}:${String(value)}`);
                            return {
                                async maybeSingle() {
                                    options.calls?.push('maybeSingle');
                                    if (options.throws !== undefined) throw options.throws;
                                    return {
                                        data: options.data ?? null,
                                        error: options.error ?? null,
                                    };
                                },
                            };
                        },
                    };
                },
            };
        },
    } as unknown as CustomerDiscountLookupClient;
}

test('customer discount lookup does not query without a signed-in user', async () => {
    const calls: string[] = [];
    const result = await lookupCustomerDiscount(null, fakeClient({
        calls,
        throws: new Error('must not query'),
    }));

    assert.deepEqual(result, { ok: true, discount: null });
    assert.deepEqual(calls, []);
});

test('an injected server client distinguishes no tag from a query failure', async () => {
    const calls: string[] = [];
    const userId = '11111111-1111-4111-8111-111111111111';
    const noTag = await lookupCustomerDiscount(userId, fakeClient({ calls }));

    assert.deepEqual(noTag, { ok: true, discount: null });
    assert.deepEqual(calls, [
        'from:customer_tags',
        'select:discount_code',
        `eq:user_id:${userId}`,
        'maybeSingle',
    ]);

    const databaseError = {
        code: '42P01',
        message: 'relation does not exist',
        details: null,
        hint: null,
    };
    const failed = await lookupCustomerDiscount(userId, fakeClient({ error: databaseError }));

    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.equal(failed.error.code, 'CUSTOMER_TAG_QUERY_FAILED');
    assert.equal(failed.error.cause, databaseError);
});

test('the compatibility helper throws on database failures instead of returning no discount', async () => {
    const transportError = new Error('network unavailable');

    await assert.rejects(
        () => getCustomerDiscount(
            '22222222-2222-4222-8222-222222222222',
            fakeClient({ throws: transportError }),
        ),
        (error: unknown) => {
            assert.ok(error instanceof CustomerDiscountLookupError);
            assert.equal(error.code, 'CUSTOMER_TAG_QUERY_FAILED');
            assert.equal(error.cause, transportError);
            return true;
        },
    );

    assert.equal(
        await getCustomerDiscount(
            '22222222-2222-4222-8222-222222222222',
            fakeClient(),
        ),
        null,
    );
});

test('malformed rows fail closed while unknown catalog codes remain a valid no-discount result', async () => {
    const malformed = await lookupCustomerDiscount(
        '33333333-3333-4333-8333-333333333333',
        fakeClient({ data: { discount_code: '' } }),
    );
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.error.code, 'CUSTOMER_TAG_RESULT_INVALID');

    const unknown = await lookupCustomerDiscount(
        '33333333-3333-4333-8333-333333333333',
        fakeClient({ data: { discount_code: 'RETIRED-CODE' } }),
    );
    assert.deepEqual(unknown, { ok: true, discount: null });
});

test('configured lookups refuse the implicit anon fallback', { concurrency: false }, async () => {
    const restoreEnvironment = isolateSupabaseTestEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    });

    try {
        assert.equal(supabaseConfigurationState(), 'misconfigured');

        const result = await lookupCustomerDiscount(
            '44444444-4444-4444-8444-444444444444',
        );
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.error.code, 'CUSTOMER_TAG_ADMIN_REQUIRED');
    } finally {
        restoreEnvironment();
    }
});

test('demo mode still resolves to no standing discount without querying Supabase', { concurrency: false }, async () => {
    const restoreEnvironment = isolateSupabaseTestEnvironment();

    try {
        assert.equal(
            await getCustomerDiscount('55555555-5555-4555-8555-555555555555'),
            null,
        );
    } finally {
        restoreEnvironment();
    }
});

test('both pricing routes use the strict admin client and fail closed on lookup errors', () => {
    assert.match(
        ordersRouteSource,
        /getCustomerDiscount\(userId, admin \?\? undefined\)/,
    );
    assert.match(
        ordersRouteSource,
        /Customer discount lookup failed:[\s\S]*?return customerDiscountUnavailable\(\)/,
    );
    assert.match(previewRouteSource, /getSupabaseAdmin\(\)/);
    assert.match(previewRouteSource, /getCustomerDiscount\(data\.user\.id, admin\)/);
    assert.match(
        previewRouteSource,
        /Customer discount lookup failed:[\s\S]*?return discountUnavailable\(\)/,
    );
});

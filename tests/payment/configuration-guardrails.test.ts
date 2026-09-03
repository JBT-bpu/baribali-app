import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

import { NextRequest } from 'next/server';

import {
    firstUsableSupabaseKey,
    resolveSupabaseConfiguration,
    SUPABASE_CONFIGURATION_ERROR_CODE,
} from '../../src/lib/supabaseConfig';
import {
    supabaseConfigurationState as serverSupabaseConfigurationState,
} from '../../src/lib/supabaseServerConfig';
import {
    createSessionToken,
    isKitchenAuthorized,
    kitchenAuthConfigurationState,
    resolveKitchenAuthConfiguration,
    verifySessionToken,
} from '../../src/lib/kitchenAuth';

const realPublic = {
    url: 'https://example.supabase.co',
    publicKey: 'sb_publishable_example',
};

function unsignedLegacyKey(role: 'anon' | 'service_role'): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ role })).toString('base64url');
    return `${header}.${payload}.test-signature`;
}

test('Supabase configuration resolves demo, configured and broken deployments explicitly', () => {
    const cases = [
        {
            name: 'empty development setup is demo',
            input: { nodeEnv: 'development' },
            expected: 'demo',
        },
        {
            name: 'empty test setup is demo',
            input: { nodeEnv: 'test' },
            expected: 'demo',
        },
        {
            name: 'example placeholders remain an empty local setup',
            input: {
                nodeEnv: 'development',
                url: 'https://your-project.supabase.co',
                publicKey: 'placeholder',
            },
            expected: 'demo',
        },
        {
            name: 'empty production setup fails closed',
            input: { nodeEnv: 'production' },
            expected: 'misconfigured',
        },
        {
            name: 'partial development credentials are not mistaken for demo',
            input: { nodeEnv: 'development', url: realPublic.url },
            expected: 'misconfigured',
        },
        {
            name: 'malformed URL is configuration failure',
            input: { nodeEnv: 'development', url: 'not-a-url', publicKey: realPublic.publicKey },
            expected: 'misconfigured',
        },
        {
            name: 'local Supabase HTTP is allowed in development',
            input: {
                nodeEnv: 'development',
                url: 'http://127.0.0.1:54321',
                publicKey: realPublic.publicKey,
            },
            expected: 'configured',
        },
        {
            name: 'remote HTTP is rejected even in development',
            input: {
                nodeEnv: 'development',
                url: 'http://example.supabase.co',
                publicKey: realPublic.publicKey,
            },
            expected: 'misconfigured',
        },
        {
            name: 'production always requires HTTPS',
            input: {
                nodeEnv: 'production',
                url: 'http://localhost:54321',
                publicKey: realPublic.publicKey,
            },
            expected: 'misconfigured',
        },
        {
            name: 'complete public client is configured',
            input: { nodeEnv: 'production', ...realPublic },
            expected: 'configured',
        },
        {
            name: 'server mode additionally requires an admin key',
            input: { nodeEnv: 'production', ...realPublic, requireAdminKey: true },
            expected: 'misconfigured',
        },
        {
            name: 'new secret key is rejected from the public slot',
            input: { nodeEnv: 'production', url: realPublic.url, publicKey: 'sb_secret_example' },
            expected: 'misconfigured',
        },
        {
            name: 'legacy service-role JWT is rejected from the public slot',
            input: {
                nodeEnv: 'production',
                url: realPublic.url,
                publicKey: unsignedLegacyKey('service_role'),
            },
            expected: 'misconfigured',
        },
        {
            name: 'new publishable key is rejected from the admin slot',
            input: {
                nodeEnv: 'production',
                ...realPublic,
                requireAdminKey: true,
                adminKey: 'sb_publishable_wrong_slot',
            },
            expected: 'misconfigured',
        },
        {
            name: 'legacy anon JWT is rejected from the admin slot',
            input: {
                nodeEnv: 'production',
                ...realPublic,
                requireAdminKey: true,
                adminKey: unsignedLegacyKey('anon'),
            },
            expected: 'misconfigured',
        },
        {
            name: 'complete server mode is configured',
            input: {
                nodeEnv: 'production',
                ...realPublic,
                requireAdminKey: true,
                adminKey: 'sb_secret_example',
            },
            expected: 'configured',
        },
        {
            name: 'exact production demo opt-in is honored',
            input: { nodeEnv: 'production', demoOptIn: 'true' },
            expected: 'demo',
        },
        {
            name: 'near-match demo values do not weaken production',
            input: { nodeEnv: 'production', demoOptIn: 'TRUE' },
            expected: 'misconfigured',
        },
        {
            name: 'a stale demo flag cannot override real credentials',
            input: { nodeEnv: 'production', demoOptIn: 'true', ...realPublic },
            expected: 'misconfigured',
        },
    ] as const;

    for (const entry of cases) {
        assert.equal(resolveSupabaseConfiguration(entry.input), entry.expected, entry.name);
    }
});

test('blank preferred keys cannot shadow valid legacy keys', () => {
    assert.equal(firstUsableSupabaseKey('   ', ' legacy-key '), 'legacy-key');
    assert.equal(firstUsableSupabaseKey('placeholder', ' legacy-key '), 'legacy-key');
    assert.equal(firstUsableSupabaseKey(' preferred-key ', 'legacy-key'), 'preferred-key');
});

test('Next build-time validation blocks recognized Supabase keys in the wrong visibility slot', () => {
    const require = createRequire(import.meta.url);
    const { validateSupabaseEnvironment } = require(
        '../../scripts/validate-supabase-environment.cjs',
    ) as {
        validateSupabaseEnvironment: (environment: Record<string, string | undefined>) => void;
    };

    assert.doesNotThrow(() => validateSupabaseEnvironment({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
        SUPABASE_SECRET_KEY: 'sb_secret_example',
    }));
    assert.throws(
        () => validateSupabaseEnvironment({
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_do-not-print',
        }),
        /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contains a server-only Supabase key/,
    );
    assert.throws(
        () => validateSupabaseEnvironment({
            SUPABASE_SERVICE_ROLE_KEY: unsignedLegacyKey('anon'),
        }),
        /SUPABASE_SERVICE_ROLE_KEY contains a public Supabase key/,
    );
    const nextConfigSource = readFileSync(new URL('../../next.config.js', import.meta.url), 'utf8');
    assert.match(nextConfigSource, /validateSupabaseEnvironment\(process\.env\)/);
});

test('kitchen auth is open only outside production and rejects empty-key tokens', { concurrency: false }, () => {
    assert.equal(resolveKitchenAuthConfiguration({ nodeEnv: 'development' }), 'open-local');
    assert.equal(resolveKitchenAuthConfiguration({ nodeEnv: 'test', password: '  ' }), 'open-local');
    assert.equal(resolveKitchenAuthConfiguration({ nodeEnv: 'production' }), 'misconfigured');
    assert.equal(
        resolveKitchenAuthConfiguration({ nodeEnv: 'production', password: 'staff-secret' }),
        'configured',
    );

    const mutableEnv = process.env as Record<string, string | undefined>;
    const savedNodeEnv = mutableEnv.NODE_ENV;
    const savedPassword = mutableEnv.KITCHEN_PASSWORD;
    try {
        mutableEnv.NODE_ENV = 'production';
        delete mutableEnv.KITCHEN_PASSWORD;
        const request = new NextRequest('http://localhost/api/kitchen/orders');
        assert.equal(kitchenAuthConfigurationState(), 'misconfigured');
        assert.equal(isKitchenAuthorized(request), false);
        assert.equal(verifySessionToken('9999999999999.forged'), false);
        assert.throws(() => createSessionToken(), /KITCHEN_AUTH_NOT_CONFIGURED/);
    } finally {
        if (savedNodeEnv === undefined) delete mutableEnv.NODE_ENV;
        else mutableEnv.NODE_ENV = savedNodeEnv;
        if (savedPassword === undefined) delete mutableEnv.KITCHEN_PASSWORD;
        else mutableEnv.KITCHEN_PASSWORD = savedPassword;
    }
});

test('production without Supabase fails closed at runtime and does not clear demo state', { concurrency: false }, async () => {
    const names = [
        'NODE_ENV',
        'NEXT_PUBLIC_BARIBALI_DEMO_MODE',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SECRET_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'KITCHEN_PASSWORD',
    ] as const;
    const mutableEnv = process.env as Record<string, string | undefined>;
    const saved = Object.fromEntries(names.map(name => [name, mutableEnv[name]]));

    try {
        for (const name of names) delete mutableEnv[name];
        mutableEnv.NODE_ENV = 'production';

        const [{ POST: resetDemo }, { POST: createOrder }, { GET: getShop }, { POST: kitchenLogin }, demoStore] = await Promise.all([
            import('../../src/app/api/demo/reset/route'),
            import('../../src/app/api/orders/route'),
            import('../../src/app/api/shop/route'),
            import('../../src/app/api/kitchen/login/route'),
            import('../../src/lib/demoStore'),
        ]);

        demoStore.resetDemoStore();
        demoStore.createDemoOrder({ items: [], total: 54, size: '54' });

        const resetResponse = await resetDemo();
        assert.equal(resetResponse.status, 503);
        assert.equal((await resetResponse.json()).code, SUPABASE_CONFIGURATION_ERROR_CODE);
        assert.equal(demoStore.listDemoOrders().length, 1);

        const orderResponse = await createOrder(new NextRequest('http://localhost/api/orders', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-forwarded-for': 'config-test-order' },
            body: JSON.stringify({
                submissionKey: '11111111-1111-4111-8111-111111111111',
            }),
        }));
        assert.equal(orderResponse.status, 503);
        assert.equal((await orderResponse.json()).code, SUPABASE_CONFIGURATION_ERROR_CODE);
        assert.equal(demoStore.listDemoOrders().length, 1);

        const shopResponse = await getShop();
        assert.equal(shopResponse.status, 503);
        assert.equal((await shopResponse.json()).code, SUPABASE_CONFIGURATION_ERROR_CODE);

        const loginResponse = await kitchenLogin(new NextRequest('http://localhost/api/kitchen/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-forwarded-for': 'config-test-kitchen' },
            body: JSON.stringify({ password: 'anything' }),
        }));
        assert.equal(loginResponse.status, 503);
        assert.equal((await loginResponse.json()).code, 'KITCHEN_AUTH_CONFIGURATION_ERROR');

        mutableEnv.NEXT_PUBLIC_BARIBALI_DEMO_MODE = 'true';
        const explicitDemoReset = await resetDemo();
        assert.equal(explicitDemoReset.status, 200);
        assert.equal(demoStore.listDemoOrders().length, 0);

        // The browser cannot and must not see a private key, so server routes
        // perform a second configuration check. A stale demo flag must not
        // silently discard live writes when only a server key remains.
        demoStore.createDemoOrder({ items: [], total: 54, size: '54' });
        mutableEnv.SUPABASE_SECRET_KEY = 'sb_secret_example';
        assert.equal(serverSupabaseConfigurationState(), 'misconfigured');
        const staleDemoReset = await resetDemo();
        assert.equal(staleDemoReset.status, 503);
        assert.equal((await staleDemoReset.json()).code, SUPABASE_CONFIGURATION_ERROR_CODE);
        assert.equal(demoStore.listDemoOrders().length, 1);
    } finally {
        const demoStore = await import('../../src/lib/demoStore');
        demoStore.resetDemoStore();
        for (const name of names) {
            const value = saved[name];
            if (value === undefined) delete mutableEnv[name];
            else mutableEnv[name] = value;
        }
    }
});

test('source guardrails keep admin access strict and distinguish deployment failure in the UI', () => {
    const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
    const supabaseSource = source('../../src/lib/supabase.ts');
    const serverSource = source('../../src/lib/serverSupabase.ts');
    const shopHookSource = source('../../src/lib/useShopStatus.ts');
    const summarySource = source('../../src/components/builder/SummaryView.jsx');
    const kitchenSource = source('../../src/app/kitchen/KitchenBoard.tsx');
    const webhookSource = source('../../src/app/api/payment/webhook/route.ts');
    const ordersSource = source('../../src/app/api/orders/route.ts');
    const shopRouteSource = source('../../src/app/api/shop/route.ts');

    assert.doesNotMatch(supabaseSource, /supabaseAdmin|SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
    assert.match(serverSource, /serverSupabaseConfigurationState\(\)/);
    assert.match(serverSource, /state !== 'configured'/);
    assert.doesNotMatch(serverSource, /:\s*supabase\s*;/);

    assert.match(shopHookSource, /SUPABASE_CONFIGURATION_ERROR_CODE/);
    assert.match(shopHookSource, /kind === 'configuration-error'/);
    assert.match(shopHookSource, /live:\s*true/);
    assert.match(summarySource, /const DEMO_MODE = isSupabaseDemoMode\(\)/);
    assert.match(kitchenSource, /const isDemo = isSupabaseDemoMode\(\)/);

    assert.match(webhookSource, /Settlement update failed/);
    assert.match(webhookSource, /new NextResponse\('RETRY', \{ status: 503 \}\)/);

    assert.match(ordersSource, /if \(!storedShopState\.available\)/);
    assert.match(ordersSource, /SHOP_STATE_UNAVAILABLE_ERROR_CODE/);
    assert.match(shopRouteSource, /if \(!state\.available\)/);
    assert.match(shopHookSource, /SHOP_STATE_UNAVAILABLE_ERROR_CODE/);
});

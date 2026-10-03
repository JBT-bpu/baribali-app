import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    customerPaymentPresentation,
    requiresHostedPayment,
} from '../../src/lib/customerPayment';
import { paymentStartDecision } from '../../src/lib/paymentOrderState';

function source(path: string): string {
    return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('a no-charge order is truthful to the customer and never opens hosted payment', () => {
    assert.deepEqual(customerPaymentPresentation('no_payment_required'), {
        text: 'אין צורך בתשלום',
        owed: false,
        tone: 'done',
        icon: '✓',
    });
    assert.equal(requiresHostedPayment('no_payment_required'), false);
    assert.equal(requiresHostedPayment('pay_at_pickup'), false);
    assert.equal(requiresHostedPayment('paid'), false);
    assert.equal(requiresHostedPayment('pending'), true);

    const summary = source('../../src/components/builder/SummaryView.jsx');
    assert.match(summary, /requiresHostedPayment\(data\.paymentStatus\)/);
    assert.doesNotMatch(summary, /!data\.payAtPickup\) \{/);
});

test('zero-charge orders stay visible and explicitly settled on the kitchen board', () => {
    const kitchenRoute = source('../../src/app/api/kitchen/orders/route.ts');
    const kitchenTypes = source('../../src/app/kitchen/types.ts');

    assert.match(kitchenRoute, /'no_payment_required'/);
    assert.match(
        kitchenTypes,
        /case 'no_payment_required': return \{ text: 'ללא חיוב', tone: 'settled', owed: false \}/,
    );
});

test('every payment entry point rejects no-charge orders as a final safeguard', () => {
    const createRoute = source('../../src/app/api/payment/create/route.ts');
    const hypStart = source('../../src/lib/hypPaymentStart.ts');
    const paymentMigration = source(
        '../../supabase/migrations/20260902184747_payment_foundation.sql',
    ).replace(/\s+/g, ' ').toLowerCase();

    assert.equal(paymentStartDecision(0, 'pending'), 'not_required');
    assert.equal(paymentStartDecision(72, 'no_payment_required'), 'not_required');
    assert.ok(
        createRoute.indexOf('const startDecision = paymentStartDecision')
            < createRoute.indexOf("if (provider === 'hyp')"),
        'the shared no-charge preflight must run before the Hyp branch',
    );
    assert.match(createRoute, /getSupabaseAdmin\(\)/);
    assert.match(hypStart, /attempt\.amountAgorot <= 0/);
    assert.match(paymentMigration, /v_order\.total <= 0/);
    assert.match(paymentMigration, /'no_payment_required'/);
    assert.match(paymentMigration, /amount_agorot > 0/);
});

test('zero-charge demo and stale-recovery paths always reach a truthful confirmation', () => {
    const summary = source('../../src/components/builder/SummaryView.jsx');

    assert.match(
        summary,
        /payload\?\.code === 'PAYMENT_NOT_REQUIRED'[\s\S]*?router\.replace\(`\/order\/\$\{encodeURIComponent\(pendingPayment\.orderId\)\}`\)/,
    );
    assert.match(
        summary,
        /const isFailureTest = !recoveredSubmission && checkoutTotal > 0 && choice === "fail"/,
    );
    assert.match(summary, /\{DEMO_MODE && checkoutTotal > 0 && \(/);
});

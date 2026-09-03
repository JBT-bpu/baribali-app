import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const summary = readFileSync(new URL(
    '../../src/components/builder/SummaryView.jsx',
    import.meta.url,
), 'utf8');
const tracking = readFileSync(new URL(
    '../../src/app/order/[id]/OrderStatusView.tsx',
    import.meta.url,
), 'utf8');
const seal = readFileSync(new URL(
    '../../src/components/builder/ui/OrderSealScreen.jsx',
    import.meta.url,
), 'utf8');

test('customer order hand-off keeps its client-side source invariants', () => {
    const submitStart = summary.indexOf('const submitOrder = async');
    const orderRequest = summary.indexOf("fetch('/api/orders'", submitStart);
    const lockCheck = summary.indexOf('if (submitLockRef.current) return;', submitStart);
    const lockClose = summary.indexOf('submitLockRef.current = true;', submitStart);

    assert.notEqual(submitStart, -1, 'submitOrder must exist');
    assert.notEqual(orderRequest, -1, 'the order request must exist');
    assert.ok(lockCheck > submitStart && lockCheck < orderRequest,
        'the synchronous lock must be checked before the order request');
    assert.ok(lockClose > lockCheck && lockClose < orderRequest,
        'the synchronous lock must close before the order request');
    assert.match(summary, /const failSubmit[\s\S]*?submitLockRef\.current = false;/,
        'the shared recoverable-failure path must release the submit lock');
    assert.match(summary, /if \(data\?\.paymentFailed\) \{\s*submitLockRef\.current = false;/,
        'the simulated payment-failure screen must release the submit lock');
    assert.match(summary, /submitLockRef\.current = false;\s*setSubmitting\(false\);\s*setAcceptedOrder\(/,
        'an accepted pay-at-pickup order must release the submit lock');

    assert.match(summary, /window\.addEventListener\('pageshow', recoverFromPaymentPage\)/);
    assert.match(summary, /window\.removeEventListener\('pageshow', recoverFromPaymentPage\)/);
    assert.match(summary, /!event\.persisted \|\| !pendingPaymentRef\.current/);
    assert.match(summary, /recoverFromPaymentPage[\s\S]*?setShowMixing\(false\)/,
        'bfcache return must dismiss the blocking seal');

    assert.match(tracking, /setTimeout\(\(\) => controller\.abort\(\), 10_000\)/,
        'a hung status request must have a finite deadline');
    assert.match(tracking, /signal: controller\.signal/);
    assert.match(tracking, /clearTimeout\(requestTimeout\)/);
    assert.equal(tracking.match(/activeController\?\.abort\(\)/g)?.length, 2,
        'foreground recovery and unmount cleanup must each abort stale work');
    assert.match(
        tracking,
        /if \(reloadAfterAbort[\s\S]*?reloadAfterAbort = false;\s*void load\(\);/,
        'foreground recovery must immediately replace an aborted hidden-tab request',
    );

    assert.match(seal, /ההזמנה התקבלה!/);
    assert.match(seal, /ההזמנה נשלחה למטבח/);
    assert.doesNotMatch(seal, />בהכנה!</,
        'the initial seal must not claim preparation has already started');
});

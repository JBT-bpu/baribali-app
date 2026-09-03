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
const shopHook = readFileSync(new URL(
    '../../src/lib/useShopStatus.ts',
    import.meta.url,
), 'utf8');
const slotsRoute = readFileSync(new URL(
    '../../src/app/api/slots/route.ts',
    import.meta.url,
), 'utf8');
const home = readFileSync(new URL(
    '../../src/app/home2/page.tsx',
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

    assert.match(tracking, /customerPaymentPresentation\(effectivePayment\)/);
    assert.match(seal, /customerPaymentPresentation\(order\.paymentStatus\)/);
    assert.match(tracking, /pay\.tone === 'done'[\s\S]*?pay\.tone === 'verify'/,
        'tracking styling must distinguish verified money from verification in progress');
    assert.match(tracking, /bowl && pay\?\.tone !== 'verify'/,
        'the bowl label must yield visual space to the anti-double-pay warning on narrow screens');
    assert.match(tracking, /bowl && pay\?\.tone === 'verify'[\s\S]*?P\.srOnly/,
        'the temporarily hidden bowl size must remain available to assistive technology');
    assert.match(seal, /pay\.tone === 'done'[\s\S]*?pay\.tone === 'verify'/,
        'the order seal must distinguish verified money from verification in progress');
    assert.doesNotMatch(tracking, /case 'paid_unverified'/,
        'customer payment truth must stay in the shared presentation helper');
    assert.doesNotMatch(seal, /case 'paid_unverified'/,
        'customer payment truth must stay in the shared presentation helper');

    assert.match(tracking, /resolvePickupMoment\(pickupTime, createdAt\)/,
        'the countdown must resolve pickup time against the Israel service date');
    assert.doesNotMatch(tracking, /setHours\(/,
        'the countdown must not interpret pickup HH:MM in the phone timezone');
    assert.doesNotMatch(tracking, /\.getHours\(\)|\.getMinutes\(\)/,
        'displayed pickup time must not come from the phone timezone');

    assert.match(home, /useSyncExternalStore\(/,
        'the payment return hint must hydrate without reading location during server render');
    assert.match(home, /isPaymentVerificationReturn\(window\.location\.search\)/,
        'only the conservative verifying return hint may show the warning');
    assert.match(home, /role="alert"/);
    assert.match(home, /אל תשלמו שוב\. אם ההזמנה לא מופיעה, פנו לקופה\./,
        'an ambiguous return must explicitly prevent a second payment');
    assert.match(home, /paymentVerifying && <PaymentVerifyingNotice \/>/,
        'the warning must remain visible instead of dismissing on a timer');
});

test('long-open customer screens refresh time-sensitive shop state safely', () => {
    assert.match(shopHook, /setInterval\(refreshForCurrentTime, 60_000\)/,
        'a visible tab must refresh across opening-hours boundaries');
    assert.match(shopHook, /clearInterval\(intervalId\)/);
    assert.match(shopHook, /addEventListener\('visibilitychange', onVisibilityChange\)/);
    assert.match(shopHook, /removeEventListener\('visibilitychange', onVisibilityChange\)/);
    assert.match(shopHook, /addEventListener\('pageshow', onPageShow\)/);
    assert.match(shopHook, /removeEventListener\('pageshow', onPageShow\)/);
    assert.match(shopHook, /signal: controller\.signal/);
    assert.match(shopHook, /setTimeout\(\(\) => controller\.abort\(\), 10_000\)/);
    assert.match(shopHook, /lastKnownOverrideRef\.current = \{ override, note: data\.note \?\? null \}/);
    assert.match(shopHook, /shopStatus\(new Date\(\), known\?\.override \?\? null, known\?\.note \?\? null\)/,
        'a failed refresh must recompute time without erasing a known staff override');

    assert.match(summary, /generatePickupSlots\(shop\.refreshedAt \? new Date\(shop\.refreshedAt\) : undefined\)/);
    assert.match(summary, /fetch\('\/api\/slots', \{ cache: 'no-store', signal: controller\.signal \}\)/);
    assert.match(summary, /controller\.abort\(\);[\s\S]*?\}, \[shop\.loading, shop\.refreshedAt\]\)/);
    assert.match(summary, /const effectivePickupTime = resolvePickupSelection\(pickupTime, pickupAvailability\.slots, shop\.open\)/,
        'expired or newly-full selections must be reconciled before render and submit');
    assert.match(summary, /status: current\.slots === null \? 'error' : 'stale'/,
        'a failed periodic capacity refresh must retain the last successful snapshot');
    assert.match(summary, /pickupTime: pickupForSubmit/,
        'the submitted value must be re-resolved against current availability');
    assert.match(summary, /setAcceptedOrder\(\{[\s\S]*?pickupTime: pickupForSubmit/,
        'the confirmation must show the same resolved slot the server received');

    assert.match(slotsRoute, /export const dynamic = 'force-dynamic'/);
    assert.match(slotsRoute, /export const revalidate = 0/);
    assert.match(slotsRoute, /serviceDate = shopDateKey\(now\)/,
        'capacity responses must identify their Israel service date');
    assert.equal(slotsRoute.match(/headers: NO_STORE_HEADERS/g)?.length, 2,
        'both slot responses must explicitly opt out of caching');
});

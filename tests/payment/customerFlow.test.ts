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
const sizePicker = readFileSync(new URL(
    '../../src/components/home/SizePicker.tsx',
    import.meta.url,
), 'utf8');
const heroSelector = readFileSync(new URL(
    '../../src/components/home/HeroSelector.tsx',
    import.meta.url,
), 'utf8');
const builder = readFileSync(new URL(
    '../../src/components/builder/BariBaliBuilder.jsx',
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

test('the shared size picker is a keyboard-complete modal', () => {
    assert.match(sizePicker, /role="dialog"/);
    assert.match(sizePicker, /aria-modal="true"/);
    assert.match(sizePicker, /aria-labelledby="size-picker-title"/);
    assert.match(sizePicker, /id="size-picker-title"/);
    assert.match(sizePicker, /document\.body\.style\.overflow = 'hidden'/,
        'the page behind the modal must not scroll');
    assert.match(sizePicker, /previousFocus\.focus\(\{ preventScroll: true \}\)/,
        'dismissal must restore the control that opened the picker');
    assert.match(sizePicker, /event\.key === 'Escape'/);
    assert.match(sizePicker, /event\.key === 'ArrowLeft' \|\| event\.key === 'ArrowRight'/);
    assert.match(sizePicker, /event\.key !== 'Tab'/);
    assert.match(sizePicker, /dialogRef\.current\?\.querySelectorAll<HTMLElement>/,
        'Tab trapping must only inspect controls inside the dialog');

    assert.match(sizePicker, /className="sizePickerCup"[\s\S]*?aria-pressed=\{isOn\}/,
        'the quick size choices must be real stateful buttons');
    assert.match(sizePicker, /className="sizePickerCard"[\s\S]*?aria-pressed=\{isActive\}/,
        'the visual size cards must be keyboard-operable buttons');
    assert.match(sizePicker, /tabIndex=\{isActive \? 0 : -1\}/,
        'the carousel must expose one active card in the tab order');
    assert.doesNotMatch(sizePicker, /<div key=\{c\.id\} onClick=/,
        'size shortcuts must not regress to pointer-only divs');
    assert.doesNotMatch(sizePicker, /handleCardTap[\s\S]*?doConfirm\(\)/,
        'tapping an already-selected card must not bypass the explicit CTA');

    assert.match(sizePicker, /price: effectiveSizePrice\(750\)/,
        'the customer-visible size price must come from the effective admin-driven layer');
    assert.match(sizePicker, /admin price override can never contradict[\s\S]*?height: '56%'/,
        'an opaque live-data panel must replace the launch-era price baked into the art');
    assert.match(sizePicker, /height: '56%'[\s\S]*?key=\{isActive \? `live-price-/,
        'the opaque price cover must stay static while only its live DOM content animates');
    assert.match(sizePicker, /src=\{card\.img\} alt="" aria-hidden/,
        'the stale text inside the source art must be hidden from assistive technology');
    assert.match(sizePicker, /overflowY: 'auto', overflowX: 'hidden'/,
        'projected side cards must not turn a 320px modal into a horizontal scroller');
    assert.match(sizePicker, /touchAction: 'pan-y pinch-zoom'/,
        'the carousel must preserve vertical scrolling and pinch zoom');

    assert.match(sizePicker, /if \(reducedMotion\) \{[\s\S]*?setClosing\(true\);[\s\S]*?onSelect\(selected\);[\s\S]*?return;/,
        'reduced-motion handoff must disable the modal immediately without retaining the animation delay');
    assert.match(sizePicker, /animation: reducedMotion \? 'none'/,
        'the overlay entrance must respect reduced motion');
    assert.match(sizePicker, /if \(interactionLockRef\.current \|\| diving \|\| out \|\| closing\) return;[\s\S]*?interactionLockRef\.current = true;/,
        'confirmation and dismissal must lock synchronously before timers or history navigation');
    assert.match(sizePicker, /setClosing\(true\);\s*onBack\(\);/,
        'a repeated Escape or back activation must not traverse history twice');

    assert.match(home, /window\.history\.pushState\([\s\S]*?bbOverlay: SIZE_PICKER_HISTORY_STATE/,
        'the home modal must own one history entry so mobile Back dismisses it first');
    assert.match(home, /setSizePicker\(event\.state\?\.bbOverlay === SIZE_PICKER_HISTORY_STATE\)/,
        'Back and Forward must close and reopen the modal from history state');
    assert.match(home, /window\.history\.back\(\)/,
        'the visible back control must consume the modal history entry');
    assert.match(home, /router\.replace\(target\)/,
        'selection must replace the temporary modal entry instead of leaving a duplicate home page behind');
});

test('the home hero roster is a keyboard-complete mobile choice', () => {
    assert.match(heroSelector, /role="group"[\s\S]*?aria-labelledby="hero-selector-title"/,
        'the visual roster must expose one labelled choice group');
    assert.match(heroSelector, /<button[\s\S]*?aria-pressed=\{isActive\}[\s\S]*?tabIndex=\{isActive \? 0 : -1\}/,
        'hero cards must be stateful buttons with one roving tab stop');
    assert.match(heroSelector, /handleStageKeyDown[\s\S]*?event\.key === 'ArrowLeft'[\s\S]*?go\([^;]*?true\)/,
        'physical arrow keys must request focus for the active RTL card');
    assert.match(heroSelector, /if \(focusCard\) requestAnimationFrame\(\(\) => cardRefs\.current\[next\]\?\.focus/,
        'roving focus requests must land on the newly active card');
    assert.match(heroSelector, /e\.currentTarget\.contains\(document\.activeElement\)[\s\S]*?go\([^;]*?moveFocus\)/,
        'a pointer swipe from a focused card must move focus with the roving tab stop');
    assert.doesNotMatch(heroSelector, /<div\s+key=\{hero\.id\}[\s\S]*?onClick=/,
        'hero choices must not regress to pointer-only divs');

    const cardTapStart = heroSelector.indexOf('const handleCardTap');
    const confirmStart = heroSelector.indexOf('const confirmChoice', cardTapStart);
    assert.notEqual(cardTapStart, -1);
    assert.ok(confirmStart > cardTapStart);
    assert.doesNotMatch(heroSelector.slice(cardTapStart, confirmStart), /confirmChoice/,
        'tapping the active hero must not bypass the explicit CTA');

    assert.match(heroSelector, /src=\{hero\.img\} alt="" aria-hidden/,
        'decorative card artwork must not duplicate each button name');
    assert.match(heroSelector, /touchAction: 'pan-y pinch-zoom'/,
        'the large swipe stage must preserve vertical scrolling and pinch zoom');
    assert.match(heroSelector, /animation: reducedMotion \? 'none' : S\.wrap\.animation/,
        'the roster entrance must respect reduced motion');
    assert.match(heroSelector, /aria-hidden=\{hidden \|\| undefined\}/,
        'reduced-motion side cards must not remain as invisible screen-reader controls');
    assert.match(heroSelector, /pipHit: \{ width: '44px', height: '44px'/,
        'every pagination shortcut must keep a full mobile touch target');
    assert.match(heroSelector, /aria-pressed=\{i === activeIdx\}/,
        'pagination shortcuts must expose the currently previewed hero');
    assert.match(heroSelector, /<BariButton type="button" variant="primary"/,
        'the explicit confirmation CTA must never become an accidental form submit');
});

test('builder size changes keep rendered, URL, history and reset state aligned', () => {
    assert.match(builder, /const SIZE_PARAM_BY_ML = \{ 750: "S", 1000: "M", 1500: "L" \}/,
        'new picker choices must serialize to one canonical URL form');
    assert.match(builder, /const nextSize = parseSizeParam\(sizeParam\);[\s\S]*?setSelectedSize\(current => current === nextSize \? current : nextSize\)/,
        'same-route Back and Forward must mirror their committed size into the builder');
    assert.match(builder, /const url = new URL\(window\.location\.href\);[\s\S]*?url\.searchParams\.set\("size", SIZE_PARAM_BY_ML\[nextSize\]\)/,
        'committing a size must preserve unrelated query and hash data');
    assert.match(builder, /delete nextState\.bbOverlay;[\s\S]*?window\.history\.replaceState\(nextState, "", window\.location\.href\)/,
        'commit must remove only its own overlay marker while retaining Next history state');
    assert.match(builder, /router\.replace\(`\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`, \{ scroll: false \}\)/,
        'the App Router and visible URL must receive the committed choice without scrolling');

    const openStart = builder.indexOf('const openSizePicker =');
    const cancelStart = builder.indexOf('const cancelSizeChange =', openStart);
    const commitStart = builder.indexOf('const commitSize =', cancelStart);
    assert.ok(openStart >= 0 && cancelStart > openStart && commitStart > cancelStart);
    const openBody = builder.slice(openStart, cancelStart);
    assert.match(openBody, /window\.history\.pushState\([\s\S]*?bbOverlay: BUILDER_SIZE_PICKER_HISTORY_STATE/,
        'Change Size must own one reversible same-page history entry');
    assert.doesNotMatch(openBody, /setSelectedSize/,
        'opening the picker must retain the committed size for lossless cancel');
    assert.match(builder.slice(cancelStart, commitStart), /window\.history\.back\(\)/,
        'visible cancel must consume only the owned modal entry');
    assert.match(builder, /window\.addEventListener\("popstate", syncSizePicker\)[\s\S]*?window\.removeEventListener\("popstate", syncSizePicker\)/,
        'hardware Back and Forward must close and reopen change mode');
    assert.match(builder, /requestAnimationFrame\(\(\) => syncSizePicker\(\{ state: window\.history\.state \}\)\)/,
        'reload must reconcile a currently open picker because reload emits no popstate');
    assert.match(openBody, /bbOverlay === BUILDER_SIZE_PICKER_HISTORY_STATE\) \{[\s\S]*?setChangingSize\(true\);[\s\S]*?return;/,
        'an already-owned marker must reopen defensively instead of making Change Size inert');
    assert.match(builder, /!isTortilla && \(!selectedSize \|\| changingSize\)/);
    assert.match(builder, /onBack=\{changingSize \? cancelSizeChange : \(\) => router\.replace\("\/home2"\)\}/,
        'only a true missing-size entry may return home');
    assert.doesNotMatch(builder, /setSelectedSize\(null\)/,
        'Change Size must not destroy the current selection');
    assert.match(builder, /<button[\s\S]*?ref=\{changeSizeButtonRef\}[\s\S]*?type="button"[\s\S]*?onClick=\{openSizePicker\}/,
        'Change Size must be a separate native control');
    assert.doesNotMatch(builder, /role="button"[\s\S]*?>שנה גודל<\/span>/,
        'the old nested pseudo-button must not return');

    const resetStart = builder.indexOf('const resetAll =');
    const swipeStart = builder.indexOf('// ─── Swipe detection', resetStart);
    assert.ok(resetStart >= 0 && swipeStart > resetStart);
    const resetBody = builder.slice(resetStart, swipeStart);
    assert.doesNotMatch(resetBody, /setSelectedSize|sizeParam/,
        'New Order must retain the latest committed size instead of the mount-time size');
    assert.match(sizePicker, /initialSize = 'M'[\s\S]*?card\.id === initialSize\.toUpperCase\(\)/,
        'change mode must reopen the shared picker on the current size');
    assert.match(builder, /initialSize=\{selectedSize \? SIZE_PARAM_BY_ML\[selectedSize\] : undefined\}/);
});

test('the builder step header remains usable on a narrow phone', () => {
    const headerStart = builder.indexOf('Controls occupy their own row');
    const headerEnd = builder.indexOf('{/* ── HERO BOWL CARD', headerStart);
    assert.ok(headerStart >= 0 && headerEnd > headerStart);
    const header = builder.slice(headerStart, headerEnd);

    assert.match(header, /justifyContent: "space-between", minWidth: 0/,
        'navigation controls must stay in a dedicated normal-flow row');
    assert.match(header, /<h1[\s\S]*?flexWrap: "wrap"/,
        'the step title must own a separate row and remain wrap-safe under text zoom');
    assert.doesNotMatch(header, /position: "absolute"/,
        'the title must not paint behind fixed-width controls');
    assert.match(header, /disabled=\{all\.length === 0\}/,
        'empty reset must be disabled for keyboard and pointer users alike');
    assert.match(header, /<button type="button" onClick=\{back\}/);
    assert.match(header, /<button type="button" onClick=\{next\}/);
    assert.match(header, /role="group" aria-label=\{`שלבי ההרכבה, שלב/,
        'interactive step buttons need a group rather than an ARIA progressbar that hides descendants');
    assert.doesNotMatch(header, /role="progressbar"/);
});

test('chef recipes disclose their authoritative price before selection', () => {
    assert.match(builder, /new Map\(PRESETS\.map\(preset => \[preset\.id, resolveChefPreset\(preset, steps, activeBase\)\]\)\)/,
        'all displayed recipes must be recalculated from the currently selected size');
    assert.match(builder, /const resolved = resolveChefPreset\(preset, steps, activeBase\);[\s\S]*?if \(!resolved\.valid\) return;[\s\S]*?setSels\(resolved\.selections\)/,
        'selection must fail closed and load the exact same resolution that powers its quote');
    assert.doesNotMatch(builder, /if \(inStep\?\.id === "veggies"\)/,
        'preset loading must not silently discard items from future builder steps');
    assert.match(builder, /מחיר המתכון ₪\{epQuote\.total\}/,
        'the expanded recipe must reveal its current all-in price');
    assert.match(builder, /epQuote\.total - activeBase/,
        'the paid ingredient delta must be explained separately from the size price');
    assert.match(builder, /itemPrice > 0 \? ` · \+₪\$\{itemPrice\}`/,
        'each paid ingredient must explain which item creates the surcharge');
    assert.match(builder, /disabled=\{!presetAvailable\}/,
        'a future invalid preset must fail closed instead of creating a rejected order');
    assert.match(builder, /aria-label=\{presetAvailable[\s\S]*?מחיר המתכון ₪\$\{presetQuote\.total\}/,
        'assistive technology must receive the same price as sighted customers');
    assert.match(builder, /aria-controls=\{`chef-preset-\$\{p\.id\}`\}[\s\S]*?id=\{`chef-preset-\$\{ep\.id\}`\}/,
        'the expanded state must identify the recipe details it controls');
});

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
const detailSheet = readFileSync(new URL(
    '../../src/components/builder/ui/DetailSheet.jsx',
    import.meta.url,
), 'utf8');
const menuData = readFileSync(new URL(
    '../../src/data/salad-data.js',
    import.meta.url,
), 'utf8');
const buildPage = readFileSync(new URL(
    '../../src/app/build/page.tsx',
    import.meta.url,
), 'utf8');
const bowlDrop = readFileSync(new URL(
    '../../src/components/transition/BowlDrop.tsx',
    import.meta.url,
), 'utf8');
const reviewsRoute = readFileSync(new URL(
    '../../src/app/api/reviews/route.ts',
    import.meta.url,
), 'utf8');
const reviewsStrip = readFileSync(new URL(
    '../../src/components/ui/ReviewsStrip.tsx',
    import.meta.url,
), 'utf8');
const bottomNav = readFileSync(new URL(
    '../../src/components/ui/bari/BariBottomNav.tsx',
    import.meta.url,
), 'utf8');
const ordersPage = readFileSync(new URL(
    '../../src/app/orders/page.tsx',
    import.meta.url,
), 'utf8');
const profilePage = readFileSync(new URL(
    '../../src/app/profile/page.tsx',
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
        'expired or newly-full selections must be rejected before render and submit');
    assert.match(summary, /const \[pickupTime, setPickupTime\] = useState\(null\)/,
        'checkout must require an explicit pickup choice');
    assert.match(summary, /const reconciled = reconcilePickupChoice\([\s\S]*?setPickupTime\(reconciled\.value\);[\s\S]*?setPickupSelectionNotice\(reconciled\.notice\)/,
        'live capacity changes must reconcile both the stored choice and its explanation');
    assert.match(summary, /status: current\.slots === null \? 'error' : 'stale'/,
        'a failed periodic capacity refresh must retain the last successful snapshot');
    assert.match(summary, /pickupTime: pickupForSubmit/,
        'the submitted value must be re-resolved against current availability');
    assert.match(summary, /pickupHasAvailableSlot[\s\S]*?בחרו שעת איסוף[\s\S]*?אין שעה פנויה/,
        'a missing choice and an all-full schedule need different CTA copy');
    assert.match(summary, /setAcceptedOrder\(\{[\s\S]*?pickupTime: pickupForSubmit/,
        'the confirmation must show the same resolved slot the server received');

    assert.match(slotsRoute, /export const dynamic = 'force-dynamic'/);
    assert.match(slotsRoute, /export const revalidate = 0/);
    assert.match(slotsRoute, /serviceDate = shopDateKey\(now\)/,
        'capacity responses must identify their Israel service date');
    assert.equal(slotsRoute.match(/headers: NO_STORE_HEADERS/g)?.length, 3,
        'closed, capacity and capacity-error responses must explicitly opt out of caching');
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
    assert.match(heroSelector.slice(cardTapStart, confirmStart), /if \(!HEROES\[i\]\.locked\) confirmChoice\(\)/,
        'the active orderable card must remain a direct route when the CTA is below a short viewport');
    assert.match(heroSelector, /@media \(max-height: 640px\)[\s\S]*?\.hero-selector__stage[\s\S]*?height: 228px !important[\s\S]*?\.hero-selector__card[\s\S]*?height: 220px !important[\s\S]*?\.hero-selector__pips \{ display: none !important; \}/,
        'the active card must clear the persistent dock on short phones');
    assert.match(heroSelector, /@media \(max-height: 560px\)[\s\S]*?\.hero-selector__prompt-hint \{ display: none !important; \}[\s\S]*?\.hero-selector__stage \{ height: 144px !important[\s\S]*?\.hero-selector__card[\s\S]*?height: 140px !important/,
        'extra-short phones must collapse the hero further above the dock');

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
    assert.match(header, /flex: 1, minWidth: 0, minHeight: "44px"/,
        'all five progress controls must shrink without clipping and retain a full touch target');
    assert.match(builder, /@media \(max-width: 349px\)[\s\S]*?\.builder-progress-label \{ display:none !important; \}/,
        'narrow phones must be able to hide visual labels while retaining each aria-label');
    assert.match(builder, /target\.closest\([\s\S]*?\[data-horizontal-scroll\]/,
        'step swipes must ignore controls and horizontally scrolling regions');
    assert.doesNotMatch(builder, /onChipTouchStart|onChipTouchEnd|longPressRef/,
        'the visible info control must not be shadowed by a long-press that also fires selection');
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
    assert.match(builder, /expandedPresetRef\.current[\s\S]*?scrollIntoView\(\{ block: "center" \}\)[\s\S]*?panel\.focus/,
        'recipe details below the grid must be brought into view and focused after expansion');
    assert.match(builder, /closeExpandedPreset[\s\S]*?presetButtonRefs\.current\.get\(presetId\)\?\.focus/,
        'closing recipe details must return focus to the disclosure button');
    assert.match(builder, /const gesture = touchRef\.current;[\s\S]*?touchRef\.current = \{ x: 0, y: 0, t: 0, ignored: true \}/,
        'each swipe must be consumed so controls cannot reuse stale touch coordinates');
});

test('the pre-JavaScript builder fallback visibly and politely explains loading', () => {
    assert.equal(buildPage.match(/role="status"/g)?.length, 1,
        'the fallback must expose one loading announcement');
    assert.match(buildPage, /role="status"[\s\S]*?aria-live="polite"[\s\S]*?aria-atomic="true"/);
    assert.match(buildPage, /טוענים את בונה הסלט…/,
        'a slow direct load must not look like an unexplained dark screen');
    assert.doesNotMatch(buildPage, /role="alert"/,
        'ordinary loading must not interrupt the customer as an alert');
    assert.match(buildPage, /zIndex: BUILDER_VEIL_Z \+ 1/,
        'the message must remain visible above the opaque transition veil');
    assert.match(buildPage, /width: 'min\(240px, calc\(100vw - 32px\)\)'/,
        'the message must fit a 320px phone and remain wrap-safe');
    assert.match(buildPage, /padding: 'max\(16px, env\(safe-area-inset-top\)\)/,
        'the fixed status must respect device safe areas');
    assert.match(buildPage, /<Suspense fallback=\{<BuildLoadingFallback \/>\}>/,
        'the explanatory state must be the actual Suspense fallback');

    assert.match(bowlDrop, /export const BUILDER_VEIL_Z = 300/);
    assert.match(bowlDrop, /export function DropCover\(\)[\s\S]*?<div aria-hidden="true" style=\{\{ position: 'fixed', inset: 0, zIndex: BUILDER_VEIL_Z, pointerEvents: 'none' \}\}/,
        'the opaque cover must remain purely decorative and non-interactive');
    assert.match(bowlDrop, /export function DropSettle[\s\S]*?if \(reducedMotion\) return null/,
        'the animated settling veil must still disappear for reduced motion');
    assert.match(bowlDrop, /animation: reducedMotion \? 'none' : `bbVeilIn/,
        'the picker-side veil must still close instantly without animation for reduced motion');
});

test('customer-facing menu copy stays inside the facts the builder can verify', () => {
    assert.match(summary, /function CompositionStats\(\{ all \}\)/,
        'the summary must use a factual composition overview');
    assert.match(summary, /הערכים התזונתיים משתנים לפי גודל המנה, הכמויות וההכנה בפועל/);
    assert.match(summary, /מרכיבים כל הזמנה לפי הבחירות שלכם/);
    assert.doesNotMatch(summary, /\bNUTRI\b|NutriStats|חומרי גלם טריים בלבד/,
        'the summary must not synthesize nutrition values or absolute sourcing claims');

    assert.match(detailSheet, /const itemPrice = effectiveItemPrice\(item\.id, item\.price \|\| 0\)/,
        'ingredient details must use the same authoritative price layer as checkout');
    assert.match(detailSheet, /הערכים משתנים לפי גודל המנה, הכמויות וההכנה בפועל\. לשאלות, פנו לצוות\./);
    assert.doesNotMatch(detailSheet, /\bNUTRI\b|\bkcal\b|proteinG|carbs|fatG|\.fact/,
        'ingredient details must not display unvalidated nutrition figures or facts');
    assert.doesNotMatch(detailSheet, /vegan:\s*\{\s*he:\s*"טבעוני"/,
        'unverified dietary metadata must not become a customer-facing badge');

    assert.doesNotMatch(menuData, /export const NUTRI/,
        'generic portion data must not be available for accidental customer display');
    assert.doesNotMatch(menuData, /קלוריות שליליות|איבופרופן|דטוקס|ניקוי מבפנים|הגוף הנקי|פצצת חלבון|קשת הבריאות|טרי מהשדה/);
    assert.doesNotMatch(menuData, /he:\s*"ללא גלוטן"|desc:\s*"טורטייה ללא גלוטן"/,
        'an unverified shared-kitchen product must not be represented as gluten-free');
    assert.doesNotMatch(menuData, /desc:\s*"[^"]*₪/,
        'catalog descriptions must not duplicate prices outside the effective price layer');

    assert.match(builder, /const currentSubtitle = capApplies \? `עד \$\{bowlCap\} לבחירה` : cur\.subtitle/);
    assert.match(builder, /const currentIntro = capApplies \? `בחרו עד \$\{bowlCap\} מרכיבי בסיס וירקות\.` : cur\.intro/,
        'the visible ingredient limit must follow the active product cap');
    assert.match(builder, /הקערה מלאה \(\{ingredientPickCount\}\/\{bowlCap\}\)/,
        'the cap notice must use the same capped-item count that enforces the limit');
    assert.doesNotMatch(builder, /הקערה מלאה \(\{all\.length\}\/\{bowlCap\}\)/);
    assert.match(summary, /\{all\.length\} בחירות/,
        'summary counts must not label preparation choices as ingredients');
    assert.match(summary, /בחירות שביצעתם/);
    assert.match(summary, /aria-label=\{`\$\{all\.length\} בחירות בהזמנה`\}/,
        'the shared salad/tortilla summary must use a product-neutral accessible label');
    assert.match(summary, /ההזמנה שלכם/);
    assert.match(summary, /מחיר בסיס/);
    assert.doesNotMatch(summary, /הסלט שלכם|סלט בסיס|בחירות בסלט/);
    assert.match(seal, /\{order\.items\} בחירות/,
        'the accepted-order seal must describe its all-choice count truthfully');
    assert.doesNotMatch(sizePicker, /servings/,
        'size choices must not invent serving-count guidance');
    assert.match(sizePicker, /tag: 'קומפקטי'[\s\S]*?tag: 'הקלאסי'[\s\S]*?tag: 'הכי גדול שלנו'/);
});

test('pickup time choices expose selection and full states on a phone-sized target', () => {
    assert.match(summary, /style=\{PT\.row\}[\s\S]*?role="group"[\s\S]*?aria-label="בחירת זמן איסוף"/,
        'pickup slots must be one labelled choice group');
    assert.match(summary, /<button[\s\S]*?type="button"[\s\S]*?key=\{slot\.id\}[\s\S]*?disabled=\{disabled \|\| slot\.full\}[\s\S]*?aria-pressed=\{value === slot\.id\}/,
        'each slot must be a native stateful button that keeps full or recovery-locked slots disabled');
    assert.match(summary, /value === slot\.id && <span style=\{PT\.selectedCheck\} aria-hidden="true">✓<\/span>/,
        'the selected state must have a visible cue beyond colour');
    assert.match(summary, /chip: \{[^}]*minHeight: "44px"/,
        'time slots must meet the minimum mobile touch target height');
    assert.match(summary, /row: \{[^}]*overflowX: "auto"[^}]*overscrollBehaviorX: "contain"/,
        'all times must remain horizontally reachable on narrow screens');
    assert.match(summary, /role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(summary, /אין שעות פנויות כרגע\./,
        'an all-full row must explain why no keyboard-selectable choice exists');
    assert.match(summary, /pickupCheckingMoreSlots[\s\S]*?pickupBlockLabel[\s\S]*?בודקים שעות איסוף/,
        'pending capacity must use the same checking state in the CTA');
    assert.match(summary, /checkingMoreSlots=\{pickupCheckingMoreSlots\}/,
        'the picker and checkout CTA must share one pending-capacity decision');
    assert.doesNotMatch(summary, /chipFull: \{[^}]*opacity:/,
        'disabled status labels must not inherit low opacity from the entire button');
    assert.match(summary, /slot\.isPeak && !slot\.full && <span style=\{PT\.peakTag\}>עמוס<\/span>/,
        'peak demand must be conveyed in text rather than by an unexplained red dot');
    assert.match(summary, /onClick=\{\(\) => !disabled && !slot\.full && onChange\(slot\.id\)\}/,
        'an available slot must flow into the controlled selection');
    assert.match(summary, /pickupTime: pickupForSubmit/,
        'the reconciled selected time must reach the order payload');
});

test('home reviews never impersonate customers and retain Google provenance', () => {
    assert.doesNotMatch(reviewsRoute, /STATIC_REVIEWS|source:\s*'static'|Math\.random/,
        'the API must not invent or shuffle customer testimonials');
    assert.doesNotMatch(reviewsRoute, /מיכל כ\.|דני ל\.|שרה מ\.|אורי ב\.|נועה ר\.|יוסי ג\./,
        'the removed fallback identities must stay out of source');
    assert.match(reviewsRoute, /export const dynamic = 'force-dynamic'/);
    assert.match(reviewsRoute, /export const revalidate = 0/);
    assert.match(reviewsRoute, /cache: 'no-store'/,
        'Places content must not be retained in the Next data cache');
    assert.match(reviewsRoute, /enforceRateLimit\(req, 'reviews', 20, 60_000\)/,
        'the public proxy must blunt requests that could consume paid Places quota');
    assert.equal(reviewsRoute.match(/headers: NO_STORE_HEADERS/g)?.length, 2,
        'both positive and unavailable API responses must opt out of response caching');
    assert.match(reviewsRoute, /setTimeout\(\(\) => controller\.abort\(\), GOOGLE_TIMEOUT_MS\)/);
    assert.match(reviewsRoute, /const GOOGLE_TIMEOUT_MS = 5_000/);
    assert.match(reviewsRoute, /authorUri:[\s\S]*?authorPhotoUri:[\s\S]*?reviewUri:[\s\S]*?reportUri:/,
        'a displayed review must carry author, source and reporting attribution');
    assert.doesNotMatch(reviewsRoute, /rating >= 4/,
        'the API must not silently hide critical reviews');

    assert.match(reviewsStrip, /payload\?\.source !== 'google'/,
        'the client must accept testimonials only from the Google response variant');
    assert.match(reviewsStrip, /data-review-source=\{review \? 'google' : 'product'\}/);
    assert.match(reviewsStrip, /המחיר מול העיניים/);
    assert.match(reviewsStrip, /בוחרים גודל ותוספות, ורואים את המחיר מתעדכן לפני שליחת ההזמנה\./,
        'the unavailable state must remain a clearly brand-owned product fact');
    assert.doesNotMatch(reviewsStrip, /setInterval|Auto-cycle|Dot indicators/,
        'the compact strip must not auto-rotate or expose pointer-only carousel dots');
    assert.match(reviewsStrip, /aria-label=\{`דירוג \$\{rating\} מתוך 5 כוכבים`\}/);
    assert.match(reviewsStrip, /aria-hidden="true"[\s\S]*?'★'\.repeat\(rating\)/,
        'decorative star glyphs must not duplicate the accessible rating');
    assert.match(reviewsStrip, /review\.authorUri[\s\S]*?review\.authorPhotoUri/);
    assert.match(reviewsStrip, /review\.reviewUri[\s\S]*?Google Maps/);
    assert.match(reviewsStrip, /review\.reportUri[\s\S]*?>דיווח</,
        'Google review content must keep a visible source and reporting path');
    assert.match(reviewsStrip, /מוצגת לפי רלוונטיות/,
        'the UI must explain Google\'s default review ordering');
});

test('the customer dock is persistent, semantic and keyboard-complete', () => {
    assert.match(bottomNav, /<nav[\s\S]*?aria-label="ניווט ראשי"/,
        'the three primary destinations must be exposed as navigation');
    assert.match(bottomNav, /position: 'fixed'[\s\S]*?bottom: 0[\s\S]*?maxWidth: '430px'/,
        'the mobile dock must remain reachable at the bottom of the viewport');
    assert.match(bottomNav, /aria-current=\{active \? 'page' : undefined\}/,
        'the active destination must be announced as the current page');
    assert.match(bottomNav, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none !important/,
        'the dock CSS motion must honor the same OS preference as its Motion component');
    assert.match(home, /<BariBottomNav \/>/);
    assert.match(ordersPage, /<BariBottomNav \/>/);
    assert.match(profilePage, /<BariBottomNav \/>/);
    assert.match(ordersPage, /<Link[\s\S]*?href=\{`\/order\/\$\{encodeURIComponent\(o\.id\)\}`\}[\s\S]*?aria-label=\{`צפייה במעקב של הזמנה \$\{o\.order_num\}`\}/,
        'each order body must be a keyboard-reachable status link');
    assert.doesNotMatch(ordersPage, /onClick=\{\(\) => router\.push\(`\/order\/\$\{o\.id\}`\)\}/,
        'order status navigation must not regress to a pointer-only div');
    assert.match(ordersPage, /<h1[\s\S]*?ההזמנות שלי<\/h1>/);
    assert.match(profilePage, /<h1[\s\S]*?האזור שלי<\/h1>/);
    assert.match(heroSelector, /@media \(max-height: 640px\)/,
        'the home roster must reserve a compact short-phone mode for the fixed dock');
    assert.match(ordersPage, /background: 'linear-gradient\(to bottom,[\s\S]*?url\(\/homepage-assets\/BG_8K\.webp\)/,
        'guest copy needs a dark image veil rather than an opaque photo over a fallback gradient');
    assert.match(profilePage, /background: 'linear-gradient\(to bottom,[\s\S]*?url\(\/homepage-assets\/BG_8K\.webp\)/);
});

test('checkout controls stay truthful, stateful and touchable in demo mode', () => {
    assert.match(summary, /const SHOW_FAILURE_TEST = DEMO_MODE && process\.env\.NODE_ENV !== "production"/,
        'the destructive failure simulator must never appear in a production build');
    assert.match(summary, /לא מתבצע חיוב אמיתי\. בחרו איזה מסלול לבדוק\./,
        'demo payment choices must explicitly say that no charge occurs');
    assert.match(summary, /role="group" aria-labelledby="demo-payment-title" aria-describedby="demo-payment-note"/,
        'payment choices must expose one named and described group');
    assert.equal(summary.match(/aria-pressed=\{paymentChoice === "(?:now|pickup)"\}/g)?.length, 2,
        'both payment choices must expose their selected state');
    assert.equal(summary.match(/aria-pressed=\{paymentChoice === "(?:now|pickup)"\}\s+disabled=\{checkoutLocked\}/g)?.length, 2,
        'both payment choices must stop changing during submission, recovery, or price reconfirmation');
    assert.equal(summary.match(/PAY\.selectedCheck\} aria-hidden="true">✓/g)?.length, 2,
        'both choices must have a visible selected cue beyond colour');
    assert.match(summary, /opt: \{ position: "relative", flex: 1, minHeight: "64px"/,
        'payment choices must remain large mobile touch targets');
    assert.match(summary, /\{SHOW_FAILURE_TEST && \([\s\S]*?דמה כשל תשלום/,
        'the local-only failure path must stay behind the production guard');
    assert.match(summary, /aria-busy=\{submitting\}/,
        'the primary order action must expose its in-flight state');
    assert.match(summary, /<h1[\s\S]*?>ההזמנה שלכם<\/h1>/,
        'checkout must expose its page title as a real heading');
    assert.match(summary, /aria-controls="pickup-time-picker"[\s\S]*?pickupFooterLabel/,
        'the persistent footer must give customers a route back to the buried pickup picker');
    assert.match(summary, /id="pickup-time-picker" role="region" tabIndex=\{-1\} aria-labelledby="pickup-time-picker-title"/,
        'the labelled pickup region must accept programmatic focus after the footer shortcut');
    assert.match(summary, /padding: "12px 16px max\(18px, env\(safe-area-inset-bottom\)\)"/,
        'checkout actions and legal copy must clear the iPhone home indicator');
    assert.equal(summary.match(/target="_blank" rel="noopener noreferrer" aria-label="[^"]+\(נפתח(?:ת)? בלשונית חדשה\)"/g)?.length, 3,
        'legal documents must open without destroying the in-progress checkout state');

    assert.doesNotMatch(summary, /\* \{ -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; \}/,
        'the summary must not override Tailwind button padding with an unlayered reset');
    assert.doesNotMatch(builder, /\* \{ -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; \}/,
        'the builder must rely on the safely layered global reset');
    assert.match(summary, /notesToggle: \{ width: "100%", minHeight: "44px"/);
    assert.match(summary, /aria-label="קוד הנחה"[\s\S]*?minHeight: "44px", padding: "8px 10px"/,
        'the promo input must meet the mobile target floor');
    assert.match(summary, /<button type="button" disabled=\{checkoutLocked\} onClick=\{applyPromo\}[\s\S]*?minHeight: "44px", padding: "8px 14px"/,
        'the promo apply button must meet the mobile target floor');
    assert.match(summary, /<PickupTimePicker[\s\S]*?disabled=\{checkoutLocked\}/,
        'an unresolved order must lock checkout-only choices until its exact request is resolved');
    assert.match(summary, /promoError && <div role="alert"/);
    assert.match(summary, /<div role="status" aria-live="polite" style=\{\{ \.\.\.S\.sumPriceLine/,
        'an applied discount must be announced as well as shown');
    assert.match(summary, /aria-label=\{`עריכת \$\{s\.title\}`\}/,
        'repeated edit buttons must identify the section they open');
});

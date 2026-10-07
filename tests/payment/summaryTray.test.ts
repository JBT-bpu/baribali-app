import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { summaryGroupCountLabel } from '../../src/lib/summaryPresentation';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const tray = source('src/components/builder/ui/SummarySelectionTray.tsx');
const css = source('src/components/builder/ui/SummaryTray.module.css');
const summary = source('src/components/builder/SummaryView.jsx');

test('group counts describe only that group, not the order-wide total', () => {
    const vegetables = ['baby_leaf', 'tomato', 'cucumber', 'quinoa', 'chickpeas', 'baked_sweet_potato', 'red_onion', 'sunflower_seeds'].map(id => ({ id }));
    assert.equal(summaryGroupCountLabel(vegetables, 'veggies'), '8 מרכיבים');
    assert.equal(summaryGroupCountLabel([{ id: 'tahini' }, { id: 'lemon' }], 'sauces'), '2 רטבים');
    assert.equal(summaryGroupCountLabel([{ id: 'lemon' }], 'sauces'), '1 רוטב');
    assert.equal(summaryGroupCountLabel([{ id: 'tomato' }], 'veggies'), '1 מרכיב');
    assert.equal(summaryGroupCountLabel([], 'veggies'), '0 מרכיבים');
    assert.match(tray, /summaryGroupCountLabel\(items, s\.id\)/);
    assert.doesNotMatch(tray, /סה״כ|count: number/);
});

test('preparation-only and mixed groups do not misrepresent instructions as ingredients', () => {
    assert.equal(summaryGroupCountLabel([{ id: 'mix_no_sauce' }], 'sauces'), '1 הנחיית הכנה');
    assert.equal(summaryGroupCountLabel([{ id: 'tahini' }, { id: 'mix_no_sauce' }], 'sauces'), '1 רוטב · 1 הנחיית הכנה');
    assert.equal(summaryGroupCountLabel([{ id: 'no_mix' }, { id: 'none_side' }], 'finish'), '2 הנחיות הכנה');
    assert.equal(summaryGroupCountLabel([{ id: 'future_food' }], 'upgrade'), '1 מרכיב');
});

test('the BariMeter hint navigates to the real named choices and respects reduced motion', () => {
    assert.match(summary, /aria-controls="summary-selections" onClick=\{focusSummarySelections\}/);
    assert.match(summary, /summarySelectionsRef\.current[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?selections\.focus\(\{ preventScroll: true \}\)/);
    assert.match(tray, /ref=\{sectionRef\} id="summary-selections" role="region" aria-label="בחירות ההזמנה"[\s\S]*?tabIndex=\{-1\}/);
    assert.match(css, /\.meterJump \{[^}]*min-height: 44px/);
});

test('payment details remain explicit, keyboard-operable and conditional on hosted payment', () => {
    assert.match(summary, /hostedPaymentExpected && \([\s\S]*?<details className=\{trayStyles\.paymentDetails\}>[\s\S]*?<summary>[\s\S]*?פרטים[\s\S]*?<p>לאחר שליחת ההזמנה[\s\S]*?אם האישור עדיין בבדיקה, נמשיך לאמת אותו\.<\/p>/);
    assert.match(css, /\.paymentDetails summary \{[^}]*min-height: 44px/);
    assert.match(css, /\.paymentDetails summary:focus-visible/);
    assert.match(summary, /href="\/terms"/);
    assert.match(summary, /href="\/privacy"/);
    assert.match(summary, /href="\/cancellations"/);
});

test('pickup presentation explains the prerequisite without changing checkout gating', () => {
    assert.doesNotMatch(summary, /style=\{PT\.box\}/, 'legacy inline styling must not override the prerequisite card or high-contrast colors');
    assert.match(summary, /const needsChoice = !value && hasAvailableSlot && !disabled/);
    assert.match(summary, /needsChoice && !statusMessage[\s\S]*?בחרו שעה כדי להמשיך להזמנה/);
    assert.match(summary, /aria-describedby=\{statusMessage \? "pickup-time-status" : needsChoice \? "pickup-time-guidance" : undefined\}/);
    assert.match(summary, /aria-label=\{`זמן איסוף: \$\{pickupFooterLabel\}\. מעבר לבחירת זמן`\}/);
    assert.match(summary, /submitting \|\| paymentConfigurationBlocked \|\| \(!recoveryPending && \(shopBlocked \|\| pickupBlocked\)\)/);
    assert.match(css, /\.pickupShortcut \{[^}]*min-height: 56px/);
});

test('summary trays render actual choices once, with native names and canonical prices', () => {
    assert.match(tray, /groups\.map\(\(\{ s, items \}\)/);
    assert.match(tray, /<ul[\s\S]*?items\.map\(item =>[\s\S]*?<li key=\{item\.id\}/);
    assert.match(tray, /effectiveItemPrice\(item\.id, item\.price\)/);
    assert.match(tray, /<bdi dir="ltr">\+₪\{price\}<\/bdi>/);
    assert.match(tray, /preparationLabel\(item\) : item\.he/);
    assert.match(tray, /<img src=\{item\.icon\} alt=""/);
    assert.doesNotMatch(tray, /fetch\(|useEffect|useState|localStorage|slice\(0,/);
});

test('summary group edit stays named, locked and tied to its original step', () => {
    assert.match(tray, /disabled=\{disabled\}[\s\S]*?aria-label=\{`עריכת \$\{s\.title\}`\}[\s\S]*?onClick=\{\(\) => onEdit\(s\.id\)\}/);
    assert.match(summary, /disabled=\{checkoutLocked\}[\s\S]*?onEdit\(STEPS\.findIndex\(st => st\.id === stepId\)\)/);
    assert.match(tray, /data-muted=\{Boolean\(highlightedStep && highlightedStep !== s\.id\)\}/);
});

test('trays reflow rather than cropping Hebrew names or adding individual tile boxes', () => {
    assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(css, /@container \(max-width: 18rem\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.sauces \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /@container[\s\S]*?\.sauces \{ grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(css, /\.itemName \{[^}]*overflow-wrap: anywhere/);
    assert.doesNotMatch(css, /text-overflow: ellipsis|line-clamp/);
    assert.match(css, /\.edit \{[^}]*min-height: 44px/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /forced-colors: active/);
    assert.match(css, /\.slot\[aria-pressed='true'\] span \{ background: Highlight !important; color: HighlightText !important/,
        'a selected pickup time must stay readable on its system highlight background');
});

test('the decorated order button preserves busy, recovery and checkout gating', () => {
    assert.match(summary, /className=\{trayStyles\.submit\}[\s\S]*?aria-busy=\{submitting\}[\s\S]*?disabled=\{[\s\S]*?onClick=\{\(\) => submitOrder\(\)\}/);
    assert.match(summary, /aria-controls="pickup-time-picker"/);
    assert.ok(/role="alert" className=\{trayStyles\.footerError\}/.test(summary),
        'the existing submission error must remain a native alert in the new footer');
    assert.match(summary, /maxLength=\{MAX_NOTES_LENGTH\}/);
});

test('the two decorative assets are lightweight independent WebPs with genuine alpha', async () => {
    let total = 0;
    for (const name of ['summary-tray-frame-v1.webp', 'summary-gold-action-v1.webp']) {
        const path = fileURLToPath(new URL(`../../public/builder-assets/${name}`, import.meta.url));
        const bytes = readFileSync(path);
        assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
        assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
        const metadata = await sharp(path).metadata();
        const stats = await sharp(path).stats();
        assert.equal(metadata.hasAlpha, true);
        assert.equal(stats.channels.at(-1)?.min, 0);
        total += statSync(path).size;
    }
    assert.ok(total < 100_000, 'the shared tray and action art must stay under 100KB combined');
    assert.doesNotMatch(css + summary + tray, /selected-option-2\.png|exec-7e21b6d2/);
});

test('closing the cook-note sheet restores focus to its named native trigger', () => {
    const modal = source('src/components/ui/bari/BariModal.tsx');
    assert.match(summary, /ref=\{notesTriggerRef\}[\s\S]*?aria-haspopup="dialog"/);
    assert.match(summary, /title="הערה לבשלן" returnFocusRef=\{notesTriggerRef\}/);
    assert.match(modal, /onCloseAutoFocus=\{event =>[\s\S]*?event\.preventDefault\(\)[\s\S]*?returnFocusRef\.current\.focus\(\{ preventScroll: true \}\)/);
});

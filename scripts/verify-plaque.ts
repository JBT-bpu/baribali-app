/**
 * Geometry assertions for the ornate plaque frame.
 *
 * There is no test framework in this repo, so this is a standalone harness:
 *   node --experimental-strip-types scripts/verify-plaque.ts
 *
 * It imports the real constants (that is why plaqueGeometry.ts is a plain .ts
 * with no JSX) and checks the invariants the layout depends on but that nothing
 * in the type system can enforce.
 *
 * `scripts/` is excluded from tsconfig: Node's type stripper needs the explicit
 * .ts extension on that import, which the app's bundler resolution rejects.
 */
import { PLAQUE, pct } from '../src/components/ui/bari/plaqueGeometry.ts';

const WIDTHS = [296, 336, 366, 376];   // plaque widths at 320/360/390/430 viewports

let failed = 0;
const ok = (cond: boolean, msg: string) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${msg}`);
};
const head = (s: string) => console.log(`\n${s}`);

// ── 1. The slots must span exactly pedestal → divider ────────────
head('1. Slot arithmetic');
ok(Math.abs(PLAQUE.pedestalZone + PLAQUE.titleZone - PLAQUE.divider) < 5e-4,
    `pedestalZone + titleZone (${(PLAQUE.pedestalZone + PLAQUE.titleZone).toFixed(4)}) == divider (${PLAQUE.divider})`);

// ── 2. The last element must clear the bottom ornament ───────────
head('2. Bottom ornament clearance');
ok(PLAQUE.contentPadBottom > PLAQUE.interiorBottom,
    `contentPadBottom (${PLAQUE.contentPadBottom}) > interiorBottom (${PLAQUE.interiorBottom})`);
for (const W of WIDTHS) {
    const gap = (PLAQUE.contentPadBottom - PLAQUE.interiorBottom) * W;
    ok(gap >= 9, `W=${W}: ${gap.toFixed(1)}px of clearance below the last element`);
}

// ── 3. Text must clear the gold rail ─────────────────────────────
head('3. Side insets clear the frame rail');
ok(PLAQUE.bodySidePad > PLAQUE.sideInset, `bodySidePad (${PLAQUE.bodySidePad}) > sideInset (${PLAQUE.sideInset})`);
ok(PLAQUE.titleSidePad > PLAQUE.sideInset, `titleSidePad (${PLAQUE.titleSidePad}) > sideInset (${PLAQUE.sideInset})`);

// ── 4. Minimum-height invariant ──────────────────────────────────
// The frame's bands are flexShrink:0. If the content is shorter than their
// combined height the bottom band overflows BELOW the plaque box and the
// ornament renders outside the frame. Fixed content (the two zones plus the
// body's top and bottom padding) is 1.157*W, so the body has a floor.
head('4. Minimum body height (bands never overflow)');
const FIXED = PLAQUE.pedestalZone + PLAQUE.titleZone + PLAQUE.bodyPadTop + PLAQUE.contentPadBottom;
const MIN_BODY = PLAQUE.topBandH + PLAQUE.botBandH - FIXED;
console.log(`  bands ${(PLAQUE.topBandH + PLAQUE.botBandH).toFixed(4)}*W  -  fixed ${FIXED.toFixed(4)}*W  =>  body must be >= ${MIN_BODY.toFixed(4)}*W`);
for (const W of WIDTHS) console.log(`     W=${W}  ->  ${(MIN_BODY * W).toFixed(0)}px`);

// Measured content heights, tallest viewport (the floor scales with W, the
// content mostly does not, so the widest plaque is the worst case).
const G = 14;    // status page bodyStack gap
const items = (nameLines: number, notes = 0) =>
    16 + 10 + 29 + 8 + nameLines * 18 + 12 + 30 + 6 + 27 + notes;   // title, icons, names, total, pay pill
const fixtures: Record<string, number> = {
    'confirmation: badges + pay pill': 48 + 22 + 47 + 70 + 68 + 48,
    'confirmation: no badges, no pay': 48 + 22 + 68 + 48,
    'status: 14 items + notes + countdown': 26 + G + 36 + G + 1 + G + items(3, 26) + G + 17 + G + 44,
    'status: 1 item, no countdown, no notes': 26 + G + 1 + G + items(1) + G + 17 + G + 44,
    // The old three-thin-bar skeleton was ~74px and would have overflowed the
    // frame's fixed bands — this is the fixture that caught it.
    'status: Loading skeleton': 14 + 16 + 46 + 16 + 14 + 16 + 40,
};
for (const [name, body] of Object.entries(fixtures)) {
    const need = MIN_BODY * Math.max(...WIDTHS);
    ok(body >= need, `${name}: body ${body}px >= ${need.toFixed(0)}px floor`);
}

// ── 5. The title block must fit its box at the narrowest width ───
// The zone scales with W but fixed-px type does not, so 320px is the worst case.
// Line heights must be pinned by the caller; at Heebo's default (~1.5) the ready
// state overflows and runs over the engraved divider.
head('5. Title zone fit at the narrowest width');
const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(v, hi));
for (const [name, vw, titleFs, subFs, subLines, extra] of [
    // Confirmation: clamped type, and the order-number badge lives in this zone.
    ['confirmation (clamped type)', 320, clamp(20, 320 * 0.064, 26), clamp(11, 320 * 0.034, 13), 1, 8 + 26],
    // Status page: fixed type, no badge (it moved to the body), sub may wrap.
    ['status: waiting/preparing', 320, 22, 13, 2, 0],
    ['status: ready (largest type)', 320, 28, 14, 2, 0],
] as [string, number, number, number, number, number][]) {
    const W = Math.min(vw, PLAQUE.maxWidth) - 2 * PLAQUE.gutter;
    const zone = PLAQUE.titleZone * W;
    // Line heights as pinned in the components: 1.1 on the label, 1.3 on the
    // status sub (1.5 on the confirmation's unpinned subtitle).
    const lh = extra > 0 ? 1.5 : 1.3;
    const needs = titleFs * 1.1 + 4 + subFs * lh * subLines + extra;
    ok(needs <= zone, `${name}: needs ${needs.toFixed(0)}px, zone is ${zone.toFixed(0)}px`);
}

// ── 6. Regression snapshot ───────────────────────────────────────
// The literals the inline implementation emitted before extraction. Any drift
// here means the confirmation screen moved, which this refactor must not do.
head('6. Emitted CSS matches the pre-extraction literals');
const snapshot: [string, string, string][] = [
    ['top band aspect',    PLAQUE.topBandAspect,                      '914 / 977'],
    ['bottom band aspect', PLAQUE.botBandAspect,                      '914 / 346'],
    ['pedestal zone',      `1 / ${PLAQUE.pedestalZone}`,              '1 / 0.65'],
    ['title zone',         `1 / ${PLAQUE.titleZone}`,                 '1 / 0.277'],
    ['pedestal art width', pct(PLAQUE.pedestalArt),                   '66%'],
    ['title side padding', `0 ${pct(PLAQUE.titleSidePad)}`,           '0 12%'],
    ['body padding-top',   pct(PLAQUE.bodyPadTop),                    '6%'],
    ['body side padding',  pct(PLAQUE.bodySidePad),                   '11%'],
    ['content pad-bottom', pct(PLAQUE.contentPadBottom),              '17%'],
    ['max width',          `${PLAQUE.maxWidth}px`,                    '400px'],
    ['inset', `max(${PLAQUE.gutter}px, env(safe-area-inset-top)) ${PLAQUE.gutter}px max(${PLAQUE.gutter}px, env(safe-area-inset-bottom))`,
              'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))'],
];
for (const [name, got, want] of snapshot) {
    ok(got === want, `${name}: "${got}"${got === want ? '' : ` !== "${want}"`}`);
}

console.log(failed === 0 ? '\nAll plaque assertions passed.\n' : `\n${failed} FAILED\n`);
process.exit(failed === 0 ? 0 : 1);

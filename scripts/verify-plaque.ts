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
import { TRACK, TRACK_ASPECT_H } from '../src/app/order/[id]/trackingArt.ts';
import { PANEL, chipRows, chipsPerRow, panelHeight, statsColumnHeight, ringFor } from '../src/components/builder/ui/heroBowlGeometry.ts';

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

// ── 7. Tracking board: the card's bands are fixed slots ──────────
// This artwork is a composition, not a stretchable frame, so the content has to
// fit the slot rather than the slot growing. The clamp MINIMA are what matter
// here: on a 320px phone the band shrinks with the art while fixed type floors
// do not, which is exactly where band 1 first overflowed.
head('7. Tracking board — the card holds its content');
const cl = (lo: number, k: number, hi: number, vwPx: number) => clamp(lo, vwPx * k / 100, hi);
for (const W of WIDTHS) {
    const vwPx = W + 2 * TRACK.gutter;
    // Worst case: 14 ingredients (icon row wraps to two lines) AND a note, which
    // squeezes the names to one line rather than adding a sixth row.
    const cardNeeds =
        cl(14, 4.4, 18, vwPx) * 1.15               // status label
        + cl(8, 3.1, 12, vwPx) * 1.25              // pickup / countdown / ready line
        + cl(12, 4.8, 19, vwPx) * 1.1 * 2 + 3      // two rows of icons
        + cl(8, 2.7, 10, vwPx) * 1.35              // names, clamped to 1 line by the note
        + cl(8, 2.7, 10, vwPx) * 1.35              // the note
        + cl(15, 5.0, 20, vwPx) * 1.1              // total / size / payment, one row
        + 5 * 2;                                   // gaps
    ok(cardNeeds <= TRACK.card.height * W,
        `W=${W}: card needs ${cardNeeds.toFixed(0)}px, slot is ${(TRACK.card.height * W).toFixed(0)}px`);
}
// This is a Hebrew-first app: step 1 sits on the RIGHT and progress runs
// leftwards. The centres are stored in step order, so that means strictly
// descending x. Easy to undo by accident when re-measuring off the artwork.
ok(TRACK.rail.centres.every((c, i) => i === 0 || c < TRACK.rail.centres[i - 1]),
    `rail runs right-to-left: ${TRACK.rail.centres.map(c => `${(c * 100).toFixed(0)}%`).join(' -> ')}`);

// The board is a fixed ratio, so its height is decided entirely by its width.
for (const [vwPx, screenH] of [[320, 568], [390, 844]] as [number, number][]) {
    const W = Math.min(vwPx, TRACK.maxWidth) - 2 * TRACK.gutter;
    const h = W * TRACK_ASPECT_H;
    ok(h < screenH, `${vwPx}x${screenH}: board is ${h.toFixed(0)}px, fits without scrolling`);
}

// ── 8. Builder hero panel: the height must not depend on how full the bowl is ──
// This is the whole point of the chip cap. The panel used to grow with every
// ingredient and every earned badge — 196px empty, 264px at 13 items and 10
// badges, ~370px worst case, against a 353px scroll region. Growing as the
// customer succeeds is the bug; a constant height is the fix.
head('8. Builder hero panel — height is independent of the bowl contents');
const VIEWPORTS = [320, 360, 375, 390, 430];

// The chips are deliberately NOT capped. What keeps the panel from growing is
// that the ring is taller than a full bowl's worth of chips ever needs — so this
// is the load-bearing assertion, not a nicety. Raising the bowl cap, enlarging
// the chips or shrinking the ring all break it here rather than on someone's
// phone.
for (const vw of VIEWPORTS) {
    const worst = statsColumnHeight(PANEL.maxItems, vw);
    ok(worst <= ringFor(vw),
        `vw=${vw}: a full bowl of ${PANEL.maxItems} needs ${chipRows(PANEL.maxItems, vw)} rows = ${worst}px, ring is ${ringFor(vw)}px (${chipsPerRow(vw)}/row)`);
}

for (const vw of VIEWPORTS) {
    const heights = new Set<number>();
    for (let n = 0; n <= PANEL.maxItems; n++) heights.add(panelHeight(vw, n));
    ok(heights.size === 1,
        `vw=${vw}: panel is ${[...heights][0]}px at every count 0..${PANEL.maxItems} (${heights.size} distinct height${heights.size === 1 ? '' : 's'})`);
}

console.log(`\n  panel height: ${panelHeight(390, 14)}px at 390px, ${panelHeight(320, 14)}px at 320px (was 264px typical / ~370px worst)`);
console.log(`  headroom at a full bowl: ${ringFor(390) - statsColumnHeight(14, 390)}px spare at 390px, ${ringFor(320) - statsColumnHeight(14, 320)}px at 320px`);

console.log(failed === 0 ? '\nAll assertions passed.\n' : `\n${failed} FAILED\n`);
process.exit(failed === 0 ? 0 : 1);

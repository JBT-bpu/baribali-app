/**
 * Geometry of the ornate plaque frame.
 *
 * The art (design-assets/SumOrder/SentDoneBG.png) is keyed and cut into three
 * WebP bands in public/builder-assets/. The cut is taken at a SINGLE source row
 * (y=1020), so the top band ends on exactly the pixels the 2px middle repeats
 * and the middle ends on exactly the bottom band's first row: the gold side
 * rails stay continuous however far the middle is stretched, with no colour
 * step. y=1020 was chosen because the border there is still straight — by y=1090
 * the corner curve has pushed the gold 114px inward and a horizontal cut would
 * show a 64px step.
 *
 * EVERY VERTICAL POSITION IS A FRACTION OF THE PLAQUE'S WIDTH. That is the only
 * dimension the art and the layout agree on: the bands are aspect-ratio boxes,
 * so their heights follow the width, and CSS percentage padding resolves against
 * the inline size too. Heights are therefore expressed as `aspectRatio:
 * 1 / <fraction>`, never as percentages — a percentage height would resolve
 * against the parent's height and mean nothing here.
 *
 * Measured off the source art (plaque bbox 914x1323, cut at row 1020) and
 * verified by assertions in the plaque layout harness.
 *
 * This is a plain .ts rather than constants inside BariPlaque.tsx so the
 * verification script can import it with no dependencies and no JSX transform.
 */

/** Fraction -> CSS percentage. Rounded because 0.06 * 100 is 6.000000000000001. */
export const pct = (fraction: number): string => `${+(fraction * 100).toFixed(4)}%`;

export const PLAQUE = {
    // ─── Bands ───────────────────────────────────────────────
    topBandAspect: '914 / 977',
    botBandAspect: '914 / 346',
    /** Band heights as fractions of W — the frame cannot be shorter than their sum. */
    topBandH: 977 / 914,   // 1.0689
    botBandH: 346 / 914,   // 0.3786

    // ─── Landmarks in the art, as fractions of W from the plaque's top ───
    pedestalSurface: 0.5711,
    pedestalRim: 0.6313,
    divider: 0.9267,
    /** The green interior stops this far ABOVE the plaque's bottom edge. */
    interiorBottom: 0.1368,
    /** How far the gold rail reaches in from each side. */
    sideInset: 0.0372,

    // ─── Interior slots ──────────────────────────────────────
    // pedestalZone + titleZone must equal `divider`, so the object rests on the
    // pedestal and the title block ends exactly at the engraved divider.
    pedestalZone: 0.65,
    titleZone: 0.277,
    /** Default footprint of the object on the pedestal, as a fraction of W. */
    pedestalArt: 0.66,
    titleSidePad: 0.12,
    bodyPadTop: 0.06,
    bodySidePad: 0.11,
    /** Must exceed `interiorBottom`, or the last element sits over the ornament. */
    contentPadBottom: 0.17,

    // ─── Box ─────────────────────────────────────────────────
    maxWidth: 400,
    /** Side gutter. Also the frame's inset, so the two must move together. */
    gutter: 12,

    art: {
        top: '/builder-assets/sent-frame-top.webp',
        mid: '/builder-assets/sent-frame-mid.webp',
        bot: '/builder-assets/sent-frame-bot.webp',
    },

    // ─── Backdrop the plaque was designed against ────────────
    // Deliberately flat and photo-free, so the frame's gold rails and filigree
    // are the only detail on screen. Shared as data rather than as a component
    // because the two hosts differ: the confirmation is a fixed overlay, the
    // order-status page is a normal scrolling document.
    backdrop: 'linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
    glow: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(200,168,78,0.08) 0%, transparent 70%)',
} as const;

/**
 * Keyframes for content inside the plaque.
 *
 * Namespaced on purpose. A component-local <style> block injects GLOBALLY
 * scoped keyframes, and `fadeUp` was declared four times across this app with
 * three different travel distances (16px in SummaryView, 12px in
 * OrderStatusView, 8px in DetailSheet) — whichever element mounted later won
 * for everything on screen. Sharing a component between two of those screens
 * would have made that collision load-bearing, so the plaque's set gets names
 * nothing else uses, hoisted into <head> where no page-local block can shadow
 * them.
 */
export const PLAQUE_KEYFRAMES = `
@keyframes plaqueScreenIn    { from{opacity:0} to{opacity:1} }
@keyframes plaqueFadeUp      { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes plaqueRingPop     { 0%{transform:scale(0.4);opacity:0} 55%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes plaqueGoldShimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes plaqueBadgePop    { from{opacity:0;transform:scale(0.5) translateY(10px)} to{opacity:1;transform:none} }
`;

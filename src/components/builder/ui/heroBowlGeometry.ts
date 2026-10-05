/**
 * Layout numbers for the builder's hero panel (HeroBowlCard).
 *
 * A plain .ts, not constants inside the .jsx, for the same reason
 * plaqueGeometry.ts exists: the assertion harness runs under Node's type
 * stripper, which has no JSX transform and so cannot import a .jsx file.
 *
 * WHY THESE EXIST: this panel used to GROW as the customer succeeded — an
 * uncapped chip per ingredient PLUS an uncapped pill per earned badge, wrapping
 * inside a column only ~166px wide. At 13 ingredients and 10 badges it stood at
 * 264px, worst case ~370px, against a scroll region of 353px. The better someone
 * did, the less room they had to keep going.
 *
 * The new compact panel keeps ALL choices in one horizontally scrollable row.
 * That includes paid extras and preparation options, not only the 14 base picks.
 * Every removal button is 44px rather than a tiny wrapping icon. The artwork
 * shrinks to 96px, freeing vertical room for the actual ingredient cards.
 *
 * That makes the constant height a real invariant rather than a coincidence:
 * `statsColumnHeight(n) <= ringFor(vw)` for every n up to `maxItems`, asserted
 * in scripts/verify-plaque.ts. If the layout constants or the chip or
 * ring sizes change, that assertion is what catches the panel growing again.
 */

export const PANEL = {
    chipIcon: 26,
    chipW: 44,       // Full mobile touch targets.
    chipGap: 6,

    ring: 96,
    ringSmall: 88,  // @media (max-width: 374px)
    smallAt: 374,

    marginX: 12,     // margin: "6px 12px"
    marginY: 4,
    padTop: 8,
    padX: 10,
    padBottom: 8,
    rowGap: 10,

    counterH: 17,    // 12px text with a comfortable line height.
    colGap: 6,
    hintH: 15,
    border: 1,

    /** Stress case including extras and preparation, NOT a business cap. */
    maxItems: 32,
} as const;

/** The ring diameter at a given viewport width. */
export const ringFor = (viewportW: number): number =>
    viewportW <= PANEL.smallAt ? PANEL.ringSmall : PANEL.ring;

/** Width available to the stats column beside the ring. */
export const statsColumnWidth = (viewportW: number): number =>
    viewportW - 2 * PANEL.marginX - 2 * PANEL.padX - 2 * PANEL.border - ringFor(viewportW) - PANEL.rowGap;

/** How many chips fit on one row at this width. */
export const chipsPerRow = (viewportW: number): number =>
    Math.floor((statsColumnWidth(viewportW) + PANEL.chipGap) / (PANEL.chipW + PANEL.chipGap));

/** All choices stay in one scrollable row, without growing the panel. */
export const chipRows = (count: number, _viewportW: number): number => count === 0 ? 0 : 1;

/** Height of the stats column for a given ingredient count. */
export const statsColumnHeight = (count: number, viewportW: number): number => {
    const rows = chipRows(count, viewportW);
    if (rows === 0) return PANEL.counterH;
    return PANEL.counterH + 2 * PANEL.colGap + PANEL.chipW + PANEL.hintH;
};

/** Total panel height. Must not vary with `count` — that is the invariant. */
export const panelHeight = (viewportW: number, count: number): number =>
    2 * PANEL.marginY
    + 2 * PANEL.border
    + PANEL.padTop + PANEL.padBottom
    + Math.max(ringFor(viewportW), statsColumnHeight(count, viewportW));

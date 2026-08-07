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
 * Removing the badge pills is what fixed it. The chips alone never threaten the
 * height: the panel row is `max(ring, statsColumn)`, and even a full bowl of 14
 * needs only three chip rows, which fits inside the ring at every width. So the
 * chips are NOT capped — capping them would waste the ~113px of empty column
 * beside the ring for no benefit.
 *
 * That makes the constant height a real invariant rather than a coincidence:
 * `statsColumnHeight(n) <= ringFor(vw)` for every n up to `maxItems`, asserted
 * in scripts/verify-plaque.ts. If the bowl cap is ever raised, or the chip or
 * ring sizes change, that assertion is what catches the panel growing again.
 */

export const PANEL = {
    chipIcon: 18,
    chipW: 24,       // 2px padding x2 + 18px icon + 2px border
    chipGap: 3,

    ring: 158,
    ringSmall: 118,  // @media (max-width: 374px)
    smallAt: 374,

    marginX: 12,     // margin: "6px 12px"
    marginY: 6,
    padTop: 18,      // padding: "18px 14px 8px"
    padX: 14,
    padBottom: 8,
    rowGap: 14,      // between the ring and the stats column

    counterH: 16,    // the 11px "n / 14 מרכיבים" line
    colGap: 5,

    /** BOWL_MAX in BariBaliBuilder — the most chips that can ever appear. */
    maxItems: 14,
} as const;

/** The ring diameter at a given viewport width. */
export const ringFor = (viewportW: number): number =>
    viewportW <= PANEL.smallAt ? PANEL.ringSmall : PANEL.ring;

/** Width available to the stats column beside the ring. */
export const statsColumnWidth = (viewportW: number): number =>
    viewportW - 2 * PANEL.marginX - 2 * PANEL.padX - ringFor(viewportW) - PANEL.rowGap;

/** How many chips fit on one row at this width. */
export const chipsPerRow = (viewportW: number): number =>
    Math.floor((statsColumnWidth(viewportW) + PANEL.chipGap) / (PANEL.chipW + PANEL.chipGap));

/** How many rows `count` chips wrap onto. */
export const chipRows = (count: number, viewportW: number): number =>
    count === 0 ? 0 : Math.ceil(count / chipsPerRow(viewportW));

/** Height of the stats column for a given ingredient count. */
export const statsColumnHeight = (count: number, viewportW: number): number => {
    const rows = chipRows(count, viewportW);
    if (rows === 0) return PANEL.counterH;
    return PANEL.counterH + PANEL.colGap + rows * PANEL.chipW + (rows - 1) * PANEL.chipGap;
};

/** Total panel height. Must not vary with `count` — that is the invariant. */
export const panelHeight = (viewportW: number, count: number): number =>
    2 * PANEL.marginY
    + PANEL.padTop + PANEL.padBottom
    + Math.max(ringFor(viewportW), statsColumnHeight(count, viewportW));

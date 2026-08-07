/**
 * Layout numbers for the builder's hero panel (HeroBowlCard).
 *
 * A plain .ts, not constants inside the .jsx, for the same reason
 * plaqueGeometry.ts exists: the assertion harness runs under Node's type
 * stripper, which has no JSX transform and so cannot import a .jsx file.
 *
 * WHY THESE EXIST AT ALL: this panel used to GROW as the customer succeeded —
 * an uncapped chip per ingredient plus an uncapped pill per earned badge,
 * wrapping inside a column only ~166px wide. At 13 ingredients and 10 badges it
 * stood at 264px, worst case ~370px, against a scroll region of 353px. The
 * better someone did, the less room they had to keep going.
 *
 * Capping the chips to one row is what makes the height CONSTANT: the panel row
 * is `max(ring, statsColumn)` and the 158px ring then always wins, so the column
 * stops driving the height at all. `panelHeight()` below is that invariant, and
 * scripts/verify-plaque.ts asserts it across every ingredient count.
 */

export const PANEL = {
    /**
     * Deliberately fixed rather than responsive: 4 chips plus the overflow chip
     * is exactly one row at BOTH ends of the range.
     *   390px viewport -> column 390 - 24 margin - 28 padding - 158 ring - 14 gap = 166px -> 5 fit
     *   320px viewport -> column 320 - 24 - 28 - 118 ring (@media <=374px) - 14   = 136px -> 4 fit
     */
    chipsPerRow: 4,

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
} as const;

/** The ring diameter at a given viewport width. */
export const ringFor = (viewportW: number): number =>
    viewportW <= PANEL.smallAt ? PANEL.ringSmall : PANEL.ring;

/** Width available to the stats column beside the ring. */
export const statsColumnWidth = (viewportW: number): number =>
    viewportW - 2 * PANEL.marginX - 2 * PANEL.padX - ringFor(viewportW) - PANEL.rowGap;

/** How many chips (including the overflow chip) fit on one row at this width. */
export const chipsThatFit = (viewportW: number): number => {
    const w = statsColumnWidth(viewportW);
    return Math.floor((w + PANEL.chipGap) / (PANEL.chipW + PANEL.chipGap));
};

/** Height of the stats column when collapsed, for a given ingredient count. */
export const statsColumnHeight = (itemCount: number): number =>
    itemCount === 0
        ? PANEL.counterH
        : PANEL.counterH + PANEL.colGap + PANEL.chipW;   // one chip row, always

/** Total panel height. Must not vary with `itemCount` — that is the invariant. */
export const panelHeight = (viewportW: number, itemCount: number): number =>
    2 * PANEL.marginY
    + PANEL.padTop + PANEL.padBottom
    + Math.max(ringFor(viewportW), statsColumnHeight(itemCount));

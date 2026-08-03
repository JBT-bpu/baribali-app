/**
 * Slot geometry for the order-tracking artwork (design-assets/SumOrder/TRACKING/
 * TRACKING BG.png -> public/builder-assets/track-bg.webp).
 *
 * Unlike the confirmation screen's frame, this is NOT a stretchable frame — it
 * is a fixed composition with a nameplate, a hero ring, a four-step rail, an
 * ornate items card and two pill buttons already drawn in place. So the box is
 * locked to the art's aspect ratio and every element is positioned into the slot
 * the art drew for it. The consequence is that content cannot grow: anything
 * variable (the ingredient list, the notes) is clamped rather than allowed to
 * push the composition apart.
 *
 * Positions are measured off the source (941x1672) and expressed as fractions of
 * the box's WIDTH, so they stay correct at any size. `yPct` converts them to the
 * percentages CSS needs for absolute positioning, which resolve against the
 * box's height.
 */

const ART_W = 941;
const ART_H = 1672;

/** Box height as a multiple of its width. */
export const TRACK_ASPECT_H = ART_H / ART_W;   // 1.7768

/** Art pixels -> fraction of the box's width. */
const f = (px: number) => px / ART_W;

/** Fraction-of-width (vertical) -> percentage of the box's height. */
export const yPct = (fw: number) => `${(fw / TRACK_ASPECT_H) * 100}%`;
/** Fraction-of-width (horizontal) -> percentage of the box's width. */
export const xPct = (fw: number) => `${fw * 100}%`;

export const TRACK = {
    aspect: `${ART_W} / ${ART_H}`,
    art: '/builder-assets/track-bg.webp',

    /** Small pill at the top — the order number. */
    nameplate: { top: f(155), height: f(215 - 155), left: f(376), right: 1 - f(563) },

    /** The big ornate circle. Holds the current step's medallion. */
    heroRing: { top: f(266), size: f(514 - 266) },

    /** Between the ring and the engraved divider — the status label. */
    labelBand: { top: f(514), height: f(570 - 514) },

    /** Four circles with an engraved connector already drawn between them. */
    rail: {
        top: f(664), size: f(751 - 664),
        centres: [f(167), f(365), f(573), f(774)] as const,
        labelTop: f(756), labelHeight: f(810 - 756),
    },

    /**
     * The ornate card. Two engraved dividers (measured at y=942 and y=1185) cut
     * it into three bands, and a green pill is drawn at y 1260-1340. The bands
     * are inset from those lines so nothing sits on top of the engraving.
     */
    card: {
        left: f(86), right: 1 - f(854),
        band1: { top: f(832), height: f(935 - 832) },    // status sub-line + pickup
        band2: { top: f(952), height: f(1178 - 952) },   // ingredients + notes
        band3: { top: f(1192), height: f(1252 - 1192) }, // total + bowl size
        // Offset right rather than centred — that is the RTL start edge, and it
        // is where the artwork actually draws it.
        pill: { top: f(1260), height: f(1340 - 1260), left: f(433), right: 1 - f(800) },
    },

    /** Between the card and the bottom pill — the polling status line. */
    footer: { top: f(1400), height: f(1435 - 1400) },

    /** The bottom pill button — the way off the page. */
    bottomPill: { top: f(1480), height: f(1560 - 1480), left: f(286), right: 1 - f(653) },

    /** Small circle bottom-left — the live/offline indicator. */
    statusDot: { top: f(1490), size: f(1560 - 1490), left: f(99) },

    maxWidth: 400,
    gutter: 12,
} as const;

/** Absolute-position a slot that spans the full card width. */
export const slot = (top: number, height: number, left = 0, right = 0) => ({
    position: 'absolute' as const,
    top: yPct(top),
    height: yPct(height),
    left: xPct(left),
    right: xPct(right),
});

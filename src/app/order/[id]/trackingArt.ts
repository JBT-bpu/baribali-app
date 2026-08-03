/**
 * Slot geometry for the order-tracking artwork (design-assets/SumOrder/TRACKING/
 * TRACKING BG.png -> public/builder-assets/track-bg.webp).
 *
 * Unlike the confirmation screen's frame, this is NOT a stretchable frame — it
 * is a fixed composition with a nameplate, a hero ring, a four-step rail, an
 * ornate items card and a pill button already drawn in place. So the box is
 * locked to the art's aspect ratio and every element is positioned into the slot
 * the art drew for it. The consequence is that content cannot grow: anything
 * variable (the ingredient list, the notes) is clamped rather than allowed to
 * push the composition apart.
 *
 * The art is keyed: everything outside the frame and its filled slots is
 * transparent, so the page's own background and particle field show THROUGH it.
 * That is why this screen keeps the full site backdrop rather than the flat one
 * the confirmation overlay uses.
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
    nameplate: { top: f(166), height: f(214 - 166), left: f(383), right: 1 - f(556) },

    /**
     * The green disc inside the big ornate ring. The medallion is deliberately
     * drawn larger than this (see P.medallion) so its own gold rim lands on the
     * drawn ring rather than sitting inside it as a second concentric circle.
     */
    heroRing: { top: f(281), size: f(489 - 281) },

    /** Between the ring and the engraved divider — the status label. */
    labelBand: { top: f(505), height: f(568 - 505) },

    /**
     * Four circles with an engraved connector already drawn between them.
     *
     * The centres are listed RIGHT TO LEFT — this is a Hebrew-first app, so the
     * first step belongs on the right and progress runs leftwards. Reversing the
     * array here rather than at the render site means `centres[i]` is simply
     * "where step i goes", and nothing downstream has to know about direction.
     * (Measured left-to-right off the art as 165, 367, 573, 774.)
     */
    rail: {
        top: f(666), size: f(82),
        centres: [f(774), f(573), f(367), f(165)] as const,
        labelTop: f(756), labelHeight: f(812 - 756),
    },

    /**
     * The ornate card. A single engraved divider at y=1187 cuts it in two. The
     * bands are inset from the divider and from the card's own frame so nothing
     * sits on top of the engraving.
     */
    card: {
        left: f(100), right: 1 - f(838),
        band1: { top: f(862), height: f(1172 - 862) },   // sub-line, pickup, ingredients
        band2: { top: f(1202), height: f(1382 - 1202) }, // total, bowl size, payment
    },

    /** Between the card's lower rule and the bottom pill — the polling line. */
    footer: { top: f(1418), height: f(1472 - 1418) },

    /** The bottom pill button — the way off the page. */
    bottomPill: { top: f(1491), height: f(1589 - 1491), left: f(305), right: 1 - f(634) },

    /** Small circle bottom-left — the live/offline indicator. */
    statusDot: { top: f(1521), size: f(1591 - 1521), left: f(89) },

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

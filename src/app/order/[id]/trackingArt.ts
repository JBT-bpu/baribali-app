/**
 * Slot geometry for the order-tracking artwork (design-assets/SumOrder/TRACKING/
 * TRACKING BG2.png -> public/builder-assets/track-bg.webp).
 *
 * This is NOT a stretchable frame — it is a fixed composition with a nameplate,
 * a hero ring, a four-step rail, an ornate card and a pill button already drawn
 * in place. The box is locked to the art's ratio and every element is positioned
 * into the slot the art drew for it. The consequence is that content cannot
 * grow: anything variable is clamped rather than allowed to push the
 * composition apart.
 *
 * The art carries its own alpha — the warm field around the plaque is a glow,
 * not a background — so the page's own backdrop and particle field show through
 * around it.
 *
 * Positions are measured off the source (1024x1536, by flood-filling each slot
 * and scanning its gold outline) and expressed as fractions of the box's WIDTH,
 * so they survive the asset being re-exported at any resolution. `yPct`
 * converts them to the percentages CSS needs, which resolve against height.
 *
 * TWO THINGS THIS ARTWORK DOES NOT HAVE ROOM FOR, both measured, not guessed:
 *  - Rail labels. The gap between the circles and the rule below them is 9px at
 *    a 366px board; the labels need ~14px. The rail is icons only, and the card
 *    names the current step.
 *  - A status label above the rule. That gap is 15px against the ~20px a label
 *    needs, so the status label moved into the card.
 */

const ART_W = 1024;
const ART_H = 1536;

/** Box height as a multiple of its width. */
export const TRACK_ASPECT_H = ART_H / ART_W;   // 1.5

/** Art pixels -> fraction of the box's width. */
const f = (px: number) => px / ART_W;

/** Fraction-of-width (vertical) -> percentage of the box's height. */
export const yPct = (fw: number) => `${(fw / TRACK_ASPECT_H) * 100}%`;
/** Fraction-of-width (horizontal) -> percentage of the box's width. */
export const xPct = (fw: number) => `${fw * 100}%`;

export const TRACK = {
    aspect: `${ART_W} / ${ART_H}`,
    art: '/builder-assets/track-bg.webp',

    /** Small plate at the top — the order number. */
    nameplate: { top: f(141), height: f(194 - 141), left: f(404), right: 1 - f(619) },

    /**
     * The green disc inside the big ornate ring. The medallion is drawn larger
     * than this (see P.medallion) so its own gold rim lands on the drawn ring
     * rather than sitting inside it as a second concentric circle.
     */
    heroRing: { top: f(244), size: f(500 - 244) },

    /**
     * Four circles with an engraved connector already drawn between them.
     *
     * The centres are listed RIGHT TO LEFT — this is a Hebrew-first app, so the
     * first step belongs on the right and progress runs leftwards. Reversing the
     * array here rather than at the render site means `centres[i]` is simply
     * "where step i goes", and nothing downstream has to know about direction.
     * (Flood-filled left-to-right off the art as 225, 406, 610, 796.)
     */
    rail: {
        top: f(581), size: f(88),
        centres: [f(796), f(610), f(406), f(225)] as const,
    },

    /**
     * The ornate card — one open field, no internal rule. It carries the whole
     * order: status, timing, ingredients and the money.
     */
    card: { top: f(761), height: f(1175 - 761), left: f(157), right: 1 - f(865) },

    /**
     * There is no footer slot. Below the pill the plaque narrows into its tag
     * point — half the canvas wide at y=1380 and a third by y=1400 — so a line
     * of text there would run off the artwork, and the gap above the pill is
     * taken by an engraved rule. The polling state therefore lives on the card's
     * second line, which is priority-ordered (see the render): an offline
     * warning outranks the ready instruction, which outranks the countdown.
     */

    /** The pill button the art draws — the way off the page. */
    bottomPill: { top: f(1249), height: f(1321 - 1249), left: f(324), right: 1 - f(699) },

    maxWidth: 400,
    gutter: 12,
} as const;

/** Absolute-position a slot. */
export const slot = (top: number, height: number, left = 0, right = 0) => ({
    position: 'absolute' as const,
    top: yPct(top),
    height: yPct(height),
    left: xPct(left),
    right: xPct(right),
});

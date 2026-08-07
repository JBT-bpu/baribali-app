/**
 * Timing and choreography for the post-order mixing animation.
 *
 * A plain .ts, like plaqueGeometry.ts and heroBowlGeometry.ts, so the assertion
 * harness can import it — Node's type stripper has no JSX transform.
 *
 * WHAT WENT WRONG BEFORE: the ingredients were laid out with `col = i % 5` at a
 * fixed `top`, and every one ended at the same `translateY(165px)`. That gave
 * five positions for ten icons, so from the sixth ingredient onwards they landed
 * pixel-exactly on top of each other — a 13-ingredient order animated as five
 * icons. Everything past the tenth was dropped outright by a `slice(0, 10)`,
 * which existed because at a flat 0.1s stagger a full bowl of 14 would have
 * finished 0.25s AFTER the fade to the glow phase had already begun.
 *
 * The fix is to make the stagger a function of the count rather than a constant,
 * and to let the ingredients converge on the bowl and vanish instead of queueing
 * above it. Converging means the destination can be shared — they arrive one at
 * a time — so no number of ingredients can collide.
 */

/** Where the ingredients converge, as a fraction of the bowl box. Matches where
 *  the old motion put them (165px into a 60+320 stack ≈ 0.33), so the landing
 *  point is unchanged — only the path and the ending are. */
export const MOUTH_Y = 0.36;

/** One ingredient's flight time. */
export const DROP_DUR = 0.75;

/** When the glow phase starts fading the ingredients out. Everything must have
 *  landed by then, or the last ones are cut off mid-air. */
export const GLOW_AT = 1.7;

/** Small margin so the last arrival is not simultaneous with the fade. */
const SAFETY = 0.05;

export interface PourStep { ex: number; ey: number; rot: number; delay: number }

export function pourPlan(count: number): PourStep[] {
    // The whole sequence has (GLOW_AT - SAFETY - DROP_DUR) to spread across, so
    // the stagger shrinks as the bowl fills rather than the tail being dropped.
    const stagger = count > 1 ? Math.min(0.1, (GLOW_AT - SAFETY - DROP_DUR) / (count - 1)) : 0;
    const spread = count > 1 ? Math.min(56, 260 / (count - 1)) : 0;
    return Array.from({ length: count }, (_, i) => ({
        // Symmetric about the bowl's centre, so the fan is never lopsided — the
        // old row sat 10px left of centre.
        ex: Math.round((i - (count - 1) / 2) * spread),
        // Three staggered start heights, so they don't read as one falling line.
        ey: -170 - (i % 3) * 24,
        rot: (i % 2 ? 1 : -1) * (8 + (i % 4) * 4),
        delay: Number((i * stagger).toFixed(3)),
    }));
}

/** When the last ingredient finishes. Must stay below GLOW_AT. */
export const pourEndsAt = (count: number): number =>
    count === 0 ? 0 : pourPlan(count)[count - 1].delay + DROP_DUR;

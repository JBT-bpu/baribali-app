'use client';

import { usePrefersReducedMotion } from '@/lib/motionHooks';

/**
 * The transition from the size picker into the builder, split across the page
 * boundary so the motion is continuous.
 *
 * There is deliberately no wipe here. The motion IS the gold particle field
 * (components/ui/GoldField) accelerating: on confirm the motes rush upward into
 * long light trails, and on the next page they decelerate back to their normal
 * drift — the same motes, handed over via `persistKey`. A panel sliding across
 * read as an effect bolted on top; speeding up what the screen is already doing
 * reads as one continuous move.
 *
 * All these components contribute is the cover needed to hide the route swap:
 *
 *   picker  → <DropPour/>    a veil that stays clear while the field builds
 *                            speed, then darkens. Navigation at POUR_END.
 *   <DropCover/>             the veil at full — the builder's Suspense fallback,
 *                            so suspending mid-navigation can't flash a
 *                            differently-coloured box.
 *   /build  → <DropSettle/>  holds the veil until the page has painted, then
 *                            lifts it while the field is still slowing.
 *
 * Opacity only; disabled under reduced motion.
 */

/** The veil is opaque at this moment; the picker navigates just after. */
export const POUR_END = 520;

/**
 * The transition's sweep on the gold field — negative is upward. Both sides read
 * this one value: the picker drives the field to it, and the builder falls back
 * to it if the mote-for-mote hand-off didn't land (the old page can unmount
 * after the new one mounts). Hard-coding it separately on each side is how the
 * builder ended up sweeping the opposite way.
 */
export const SWEEP = -1.2;

const VEIL = 'radial-gradient(ellipse 80% 70% at 50% 50%, #041204 0%, #020a02 100%)';

/** Picker side: the veil closes as the field accelerates away. */
export function DropPour() {
    const reducedMotion = usePrefersReducedMotion();
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
            <style>{KF}</style>
            <div style={{
                position: 'absolute', inset: 0, background: VEIL,
                opacity: reducedMotion ? 1 : 0,
                // Barely darkens for the first third — the pick has time to land
                // and the field to gather speed before anything closes in.
                animation: reducedMotion ? 'none' : `bbVeilIn ${POUR_END}ms cubic-bezier(0.85,0,0.9,0.5) forwards`,
                willChange: 'opacity',
            }} />
        </div>
    );
}

/** The veil at full — used as the builder's Suspense fallback. */
export function DropCover() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: VEIL }} />
        </div>
    );
}

/**
 * Builder side: the veil arrives opaque and *holds* until the page behind it has
 * painted (`exiting`), then lifts. Holding matters — the builder is a heavy
 * tree, and lifting on schedule revealed an empty page that then popped in.
 */
export function DropSettle({ exiting = false }: { exiting?: boolean }) {
    const reducedMotion = usePrefersReducedMotion();
    if (reducedMotion) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}>
            <style>{KF}</style>
            <div style={{
                position: 'absolute', inset: 0, background: VEIL,
                opacity: 1,
                // Lifts early and quickly — the field is still moving underneath,
                // and its slowdown is the tail of the transition.
                animation: exiting ? 'bbVeilOut 560ms cubic-bezier(0.3,0.8,0.35,1) forwards' : 'none',
                willChange: 'opacity',
            }} />
        </div>
    );
}

const KF = `
@keyframes bbVeilIn  { from{opacity:0} to{opacity:1} }
@keyframes bbVeilOut { from{opacity:1} to{opacity:0} }
`;

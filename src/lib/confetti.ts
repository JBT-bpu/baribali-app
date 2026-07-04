import confetti from 'canvas-confetti';

const GOLD_PALETTE = ['#f0d060', '#ffe08a', '#c8a832', '#ffffff', '#a5d6a7', '#edd87e'];

/**
 * The app's signature gold confetti burst — used at order-success moments
 * (order submitted, order marked ready for pickup). Respects
 * prefers-reduced-motion natively via the library's own option.
 */
export function fireGoldConfetti() {
    confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 38,
        origin: { y: 0.42 },
        colors: GOLD_PALETTE,
        disableForReducedMotion: true,
    });
}

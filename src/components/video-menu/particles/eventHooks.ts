/**
 * Event Hooks
 *
 * Functions that handle user actions and trigger energy impulses.
 * These connect UI events to particle system responses.
 */

import { Particle, VideoRect, CARD_POSITIONS } from './ParticleTypes';
import { EnergyState, impulse } from './energySystem';
import { retargetParticles, burstParticles, pullParticles, swirlParticles } from './energyActions';

/**
 * Get card position in canvas coordinates
 */
function getCardCanvasPosition(
    cardId: string | null,
    videoRect: VideoRect
): { x: number; y: number } | null {
    if (!cardId) return null;

    const cardPos = CARD_POSITIONS[cardId];
    if (!cardPos) return null;

    return {
        x: videoRect.left + videoRect.width * (cardPos.x / 100),
        y: videoRect.top + videoRect.height * (cardPos.y / 100),
    };
}

/**
 * Local exposure bump - brighten particles near a point
 * Creates a subtle glow effect around hovered/selected elements
 *
 * @param particles - Array of particles
 * @param center - Center point {x, y}
 * @param radius - Radius of effect in pixels
 */
function localExposureBump(
    particles: Particle[],
    center: { x: number; y: number },
    radius: number
): void {
    for (const p of particles) {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
            // Increase opacity for particles near center
            p.opacity = Math.min(1, p.opacity * 1.3);
        }
    }
}

/**
 * Ring bokeh pulse - create expanding ring effect
 * Adds two expanding bokeh particles that fade out
 *
 * @param particles - Array of particles
 * @param center - Center of pulse {x, y}
 */
function ringBokehPulse(
    particles: Particle[],
    center: { x: number; y: number }
): void {
    // Find lens particles to use for the ring
    const lensParticles = particles.filter(p => p.population === 'lens');

    // Select two particles for the ring effect
    const ringParticles = lensParticles.slice(0, 2);

    for (let i = 0; i < ringParticles.length; i++) {
        const p = ringParticles[i];
        const angle = (i / ringParticles.length) * Math.PI * 2;

        // Position particles at center with outward velocity
        p.x = center.x;
        p.y = center.y;
        p.vx = Math.cos(angle) * 80; // Expand outward
        p.vy = Math.sin(angle) * 80;
        p.size = p.baseSize * 2; // Larger size for pulse
        p.opacity = 0.4; // Start bright
    }
}

/**
 * Handle card hover event
 * Adds subtle impulse and gentle pull toward card
 *
 * @param particles - Array of particles
 * @param cardId - Hovered card ID
 * @param videoRect - Video rectangle
 * @param energyState - Energy state to modify
 */
export function onCardHover(
    particles: Particle[],
    cardId: string | null,
    videoRect: VideoRect | null,
    energyState: EnergyState
): void {
    // Add energy impulse
    impulse(energyState, 0.12);

    if (cardId && videoRect) {
        const card = getCardCanvasPosition(cardId, videoRect);
        if (card) {
            // Pull particles toward card
            pullParticles(particles, card, 0.5);
            // Add tiny swirl for magical feel
            swirlParticles(particles, card, 0.2);
            // Local exposure bump near card
            localExposureBump(particles, card, 150);
        }
    }
}

/**
 * Handle card select event
 * Adds stronger impulse, retargets particles, and shifts sizes
 *
 * @param particles - Array of particles
 * @param cardId - Selected card ID
 * @param videoRect - Video rectangle
 * @param energyState - Energy state to modify
 */
export function onCardSelect(
    particles: Particle[],
    cardId: string | null,
    videoRect: VideoRect | null,
    energyState: EnergyState
): void {
    // Add energy impulse
    impulse(energyState, 0.35);

    // Set activity window for enhanced behavior
    energyState.activeUntil = performance.now() + 1200; // 1.2s activity window

    if (cardId && videoRect) {
        const card = getCardCanvasPosition(cardId, videoRect);
        if (card) {
            // Retarget particles around selected card
            retargetParticles(particles, card, 1.0, energyState.energy);
            // Add swirl for magical "choice locks in" feel
            swirlParticles(particles, card, 1.0);
            // Ring bokeh pulse for visual confirmation
            ringBokehPulse(particles, card);
        }
    }
}

/**
 * Handle continue button press
 * Adds strong impulse, pulls to center then scatters outward
 * Cinematic transition breath: inhale → 250ms → exhale
 *
 * @param particles - Array of particles
 * @param videoRect - Video rectangle
 * @param energyState - Energy state to modify
 */
export function onContinue(
    particles: Particle[],
    videoRect: VideoRect | null,
    energyState: EnergyState
): void {
    // Add energy impulse
    impulse(energyState, 0.55);

    // Set activity window for enhanced behavior
    energyState.activeUntil = performance.now() + 1200; // 1.2s activity window

    if (!videoRect) return;

    const center = { x: videoRect.centerX, y: videoRect.centerY };

    // Inhale: pull particles to center
    pullParticles(particles, center, 1.2);

    // Exhale: scatter particles outward after 250ms (cinematic transition breath)
    setTimeout(() => {
        burstParticles(particles, center, 1.5);
    }, 250);
}

/**
 * Handle phase change event
 * Adds strong impulse and applies phase-specific behavior
 * Inhale on intro, exhale on outro
 *
 * @param particles - Array of particles
 * @param phase - New engine phase
 * @param videoRect - Video rectangle
 * @param energyState - Energy state to modify
 */
export function onPhaseChange(
    particles: Particle[],
    phase: 'intro' | 'loop' | 'preview' | 'outro',
    videoRect: VideoRect | null,
    energyState: EnergyState
): void {
    // Add energy impulse
    impulse(energyState, 0.7);

    // Set activity window for enhanced behavior
    energyState.activeUntil = performance.now() + 1200; // 1.2s activity window

    if (!videoRect) return;

    const center = { x: videoRect.centerX, y: videoRect.centerY };

    if (phase === 'intro') {
        // Inhale on intro
        pullParticles(particles, center, 1.5);
    } else if (phase === 'outro') {
        // Exhale on outro
        burstParticles(particles, center, 1.8);
    }
    // 'loop' and 'preview' phases don't need special behavior
}

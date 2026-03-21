/**
 * Phase-Reactive Forces
 *
 * Calculates forces applied to particles based on the current phase and state.
 * This creates cinematic effects like intro drift, preview card attraction, and outro scatter.
 */

import { Particle, VideoRect, CARD_POSITIONS } from './ParticleTypes';
import { EnginePhase } from '@/types/video-menu';

/**
 * Map EnginePhase to cinematic phase
 */
export function mapPhaseToCinematic(phase: EnginePhase): 'intro' | 'loop' | 'preview' | 'outro' {
    switch (phase) {
        case 'loading':
        case 'intro':
            return 'intro';
        case 'loop':
            return 'loop';
        case 'preview':
            return 'preview';
        case 'navigating':
        case 'swapping':
            return 'outro';
        default:
            return 'loop';
    }
}

/**
 * Get card position in canvas coordinates
 */
export function getCardCanvasPosition(
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
 * Calculate phase-reactive forces for a particle
 *
 * @param p - Particle to calculate forces for
 * @param cinematicPhase - Current cinematic phase
 * @param cardId - Currently hovered/selected card ID
 * @param videoRect - Video rectangle
 * @param t - Current time in frames
 * @returns Force {x, y} to apply to particle
 */
export function calculatePhaseForces(
    p: Particle,
    cinematicPhase: 'intro' | 'loop' | 'preview' | 'outro',
    cardId: string | null,
    videoRect: VideoRect | null,
    t: number
): { forceX: number; forceY: number; opacityMultiplier: number } {
    let forceX = 0;
    let forceY = 0;
    let opacityMultiplier = 1;

    // Intro phase: Drift toward video center
    if (cinematicPhase === 'intro' && videoRect) {
        const dx = videoRect.centerX - p.x;
        const dy = videoRect.centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        forceX = (dx / dist) * 0.15;
        forceY = (dy / dist) * 0.15;
    }

    // Preview phase: Attract to card, dim others
    if (cinematicPhase === 'preview' && cardId && videoRect) {
        const card = getCardCanvasPosition(cardId, videoRect);
        if (card) {
            const dx = card.x - p.x;
            const dy = card.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Particles near card: brighten + gentle pull
            if (dist < 200) {
                opacityMultiplier = Math.min(p.opacity * 1.8, 0.9);
                forceX = (dx / dist) * 0.08;
                forceY = (dy / dist) * 0.08;
            } else {
                // Far particles: dim
                opacityMultiplier = 0.6;
            }
        }
    }

    // Outro phase: Scatter outward from center
    if (cinematicPhase === 'outro' && videoRect) {
        const dx = p.x - videoRect.centerX;
        const dy = p.y - videoRect.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        forceX = (dx / dist) * 1.2;
        forceY = (dy / dist) * 1.2;
        opacityMultiplier = 0.97; // Fade during scatter
    }

    return { forceX, forceY, opacityMultiplier };
}

/**
 * Apply forces with damping to particle
 *
 * @param p - Particle to update
 * @param forceX - X force to apply
 * @param forceY - Y force to apply
 * @param t - Current time in frames
 */
export function applyForcesToParticle(
    p: Particle,
    forceX: number,
    forceY: number,
    t: number
): void {
    // Apply forces with damping
    p.fx = (p.fx + forceX) * 0.95;
    p.fy = (p.fy + forceY) * 0.95;
}

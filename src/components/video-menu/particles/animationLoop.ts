/**
 * Animation Loop
 *
 * Main animation loop for particle system.
 * Handles particle updates, lifecycle management, and rendering.
 * Supports sprite-based bokeh with screen blend mode for diegetic lens optics.
 */

import { Particle, VideoRect, PARTICLE_TYPES } from './ParticleTypes';
import { createParticle } from './createParticle';
import { mapPhaseToCinematic, calculatePhaseForces, applyForcesToParticle } from './phaseForces';
import { renderParticle, applyEdgeMask } from './renderers';
import { getBokehIntensity } from './videoBrightnessSampler';
import { EnginePhase } from '@/types/video-menu';
import { EnergyState, updateEnergy, getEnergyMultipliers } from './energySystem';
import { updateParticlePhysics } from './energyActions';

/**
 * Animation loop state
 */
export interface AnimationState {
    time: number;
    particles: Particle[];
    gyro: { x: number; y: number };
    phase: EnginePhase;
    cardId: string | null;
    videoRect: VideoRect | null;
    bokehIntensity: number; // From video brightness sampling
    energy: number; // Current energy level [0..1]
    activeUntil: number; // Timestamp until activity window ends (ms)
}

/**
 * Update particle lifecycle (fade in/out, respawn)
 */
function updateParticleLifecycle(p: Particle, config: typeof PARTICLE_TYPES[string], w: number, h: number, vr: VideoRect | null): boolean {
    p.life++;

    // Fade in
    if (p.life < p.fadeInFrames) {
        p.opacity = (p.life / p.fadeInFrames) * p.baseOpacity;
    }
    // Fade out
    else if (p.life > p.maxLife - p.fadeOutFrames) {
        p.opacity = ((p.maxLife - p.life) / p.fadeOutFrames) * p.baseOpacity;
    }
    // Normal opacity
    else {
        p.opacity = p.baseOpacity;
    }

    // Respawn if life exceeded
    if (p.life >= p.maxLife) {
        return true; // Particle was respawned
    }

    return false;
}

/**
 * Update firefly blinking
 */
function updateFireflyBlink(p: Particle, t: number): void {
    if (p.type === 'firefly') {
        const blink = Math.sin(t * 0.05 * p.blinkSpeed + p.blinkPhase);
        p.opacity *= Math.max(0, blink);
    }
}

/**
 * Update particle position with wandering and parallax
 */
function updateParticlePosition(
    p: Particle,
    gyro: { x: number; y: number },
    t: number,
    w: number,
    h: number
): void {
    // Wandering movement
    p.wanderAngle += p.wanderSpeed;
    const wanderX = Math.cos(p.wanderAngle) * p.wanderRadius * p.speed * 0.3;
    const wanderY = Math.sin(p.wanderAngle * 0.7 + p.phaseOffset) * p.wanderRadius * p.speed * 0.3;

    // Parallax from gyroscope
    const parallaxStrength = p.depth * 25;
    const parallaxX = gyro.x * parallaxStrength;
    const parallaxY = gyro.y * parallaxStrength;

    // Update position
    p.x = p.originX + wanderX + parallaxX + p.fx * t * 0.1;
    p.y = p.originY + wanderY + parallaxY + p.fy * t * 0.1;
    p.rotation += p.rotationSpeed * 0.02;

    // Keep in bounds (soft wrap)
    if (p.x < -50) p.x += w + 100;
    if (p.x > w + 50) p.x -= w + 100;
    if (p.y < -50) p.y += h + 100;
    if (p.y > h + 50) p.y -= h + 100;
}

/**
 * Main animation frame function
 */
export function animateFrame(
    ctx: CanvasRenderingContext2D,
    state: AnimationState,
    imageCache: Map<string, HTMLImageElement>,
    bokehAtlas: HTMLCanvasElement[] | null,
    w: number,
    h: number,
    isLensOverlay: boolean = false
): void {
    state.time++;
    const t = state.time;
    const cinematicPhase = mapPhaseToCinematic(state.phase);
    const currentTime = performance.now();

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Get energy multipliers
    const energyMultipliers = getEnergyMultipliers(state.energy);

    // Update and render each particle
    state.particles.forEach((p) => {
        const config = PARTICLE_TYPES[p.type];
        if (!config) return;

        // Skip lens particles when rendering border field
        if (!isLensOverlay && p.population === 'lens') return;
        // Skip border particles when rendering lens field
        if (isLensOverlay && p.population === 'border') return;

        // Lifecycle management
        const wasRespawned = updateParticleLifecycle(p, config, w, h, state.videoRect);
        if (wasRespawned) return; // Skip update for newly respawned particle

        // Firefly blinking
        updateFireflyBlink(p, t);

        // Calculate phase-reactive forces
        const { forceX, forceY, opacityMultiplier } = calculatePhaseForces(
            p,
            cinematicPhase,
            state.cardId,
            state.videoRect,
            t
        );

        // Apply energy multipliers to particle properties
        const dt = 1 / 60; // Assume 60fps
        p.size = p.baseSize * energyMultipliers.sizeMul;

        // Apply bokeh intensity from video brightness
        if (p.type.startsWith('bokeh')) {
            p.opacity = p.baseOpacity * opacityMultiplier * state.bokehIntensity * energyMultipliers.alphaMul;
        } else {
            p.opacity = p.baseOpacity * opacityMultiplier * energyMultipliers.alphaMul;
        }

        // Apply forces with damping
        applyForcesToParticle(p, forceX, forceY, t);

        // Update position with physics-based movement
        updateParticlePhysics(p, dt, state.energy, state.gyro, w, h, currentTime, state.activeUntil);

        // Skip rendering if invisible
        if (p.opacity < 0.01) return;

        // Render particle
        renderParticle(ctx, p, imageCache, bokehAtlas, isLensOverlay);
    });

    // Apply edge mask to lens overlay (optional cinematic effect)
    if (isLensOverlay) {
        applyEdgeMask(ctx, w, h);
    }
}

/**
 * Calculate video rectangle for 9:16 aspect ratio containment
 */
export function calculateVideoRect(canvasW: number, canvasH: number): VideoRect {
    const videoAspect = 9 / 16;
    const screenAspect = canvasW / canvasH;
    let vw, vh, vx, vy;

    if (screenAspect > videoAspect) {
        // Screen is wider than video
        vh = canvasH;
        vw = vh * videoAspect;
        vx = (canvasW - vw) / 2;
        vy = 0;
    } else {
        // Screen is taller than video
        vw = canvasW;
        vh = vw / videoAspect;
        vx = 0;
        vy = (canvasH - vh) / 2;
    }

    return {
        left: vx,
        top: vy,
        right: vx + vw,
        bottom: vy + vh,
        width: vw,
        height: vh,
        centerX: vx + vw / 2,
        centerY: vy + vh / 2,
    };
}

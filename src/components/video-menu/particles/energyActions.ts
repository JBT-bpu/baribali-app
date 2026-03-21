/**
 * Energy Actions
 *
 * Functions for retargeting particles and applying bursts based on energy impulses.
 * These create the dynamic "alive" feel when user actions occur.
 */

import { Particle, VideoRect } from './ParticleTypes';
import { lerp } from './bokehAtlas';

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;

/**
 * Apply swirl motion around a center point
 * Particles rotate tangentially, creating a magical swirling effect
 *
 * @param particles - Array of particles to modify
 * @param center - Center of swirl {x, y}
 * @param strength - Strength of swirl (1.0 = normal)
 */
export function swirlParticles(
    particles: Particle[],
    center: { x: number; y: number },
    strength: number = 1
): void {
    for (const p of particles) {
        if (Math.random() > 0.6) continue; // ~40% affected

        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const inv = 1 / (Math.sqrt(dx * dx + dy * dy) + 60);
        const tangX = -dy * inv;
        const tangY = dx * inv;

        const s = 90 * (1 - p.depth) * strength;
        p.vx += tangX * s;
        p.vy += tangY * s;
    }
}

/**
 * Retarget a subset of particles to new anchor positions around a target
 *
 * @param particles - Array of particles to modify
 * @param target - Target position {x, y}
 * @param strength - Strength of retargeting (1.0 = normal)
 */
export function retargetParticles(
    particles: Particle[],
    target: { x: number; y: number },
    strength: number = 1,
    energy: number = 0
): void {
    // Energy-driven retarget probability: 2% idle → 30% burst
    const reseedChance = 0.02 + 0.28 * energy;

    for (const p of particles) {
        if (Math.random() > reseedChance) continue;

        // Spread increases with particle depth
        const spread = (40 + 180 * p.depth) * strength;

        // New anchor around target
        p.ax = target.x + (Math.random() * 2 - 1) * spread;
        p.ay = target.y + (Math.random() * 2 - 1) * spread;

        // Depth-dependent size kick: near particles get more size change
        const sizeKick = (1 - p.depth) * (0.2 + 0.6 * energy);
        p.sizeTarget = p.baseSize * (1 + sizeKick * (Math.random() * 0.6 - 0.2));

        // Velocity burst (subtle)
        p.vx += (Math.random() * 2 - 1) * 20 * (1 - p.depth) * strength;
        p.vy += (Math.random() * 2 - 1) * 20 * (1 - p.depth) * strength;
    }
}

/**
 * Apply outward burst from a center point
 *
 * @param particles - Array of particles to modify
 * @param center - Center of burst {x, y}
 * @param strength - Strength of burst (1.0 = normal)
 */
export function burstParticles(
    particles: Particle[],
    center: { x: number; y: number },
    strength: number = 1
): void {
    for (const p of particles) {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Outward velocity proportional to burst strength
        // Closer particles get more force
        const force = (30 + 50 * (1 - p.depth)) * strength / (1 + dist * 0.01);

        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
    }
}

/**
 * Apply inward pull toward a center point
 *
 * @param particles - Array of particles to modify
 * @param center - Center to pull toward {x, y}
 * @param strength - Strength of pull (1.0 = normal)
 */
export function pullParticles(
    particles: Particle[],
    center: { x: number; y: number },
    strength: number = 1
): void {
    for (const p of particles) {
        const dx = center.x - p.x;
        const dy = center.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Inward velocity
        const force = (15 + 25 * (1 - p.depth)) * strength / (1 + dist * 0.005);

        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
    }
}

/**
 * Update particle physics with steering toward anchor, damping, and integration
 *
 * @param p - Particle to update
 * @param dt - Delta time in seconds
 * @param energy - Current energy level [0..1]
 * @param gyro - Gyroscope/mouse input {x, y}
 * @param w - Canvas width
 * @param h - Canvas height
 */
export function updateParticlePhysics(
    p: Particle,
    dt: number,
    energy: number,
    gyro: { x: number; y: number },
    w: number,
    h: number,
    currentTime: number = 0,
    activeUntil: number = 0
): void {
    // Check if in activity window
    const isActive = currentTime < activeUntil;
    const activityMultiplier = isActive ? 1.5 : 1.0;

    // Speed multiplier from energy (enhanced during activity)
    const speedMul = (1 + 2.2 * energy) * activityMultiplier;

    // Steering toward anchor
    // Closer particles respond more strongly
    const steerStrength = (0.35 + 1.2 * energy) * (1 - p.depth) * activityMultiplier;
    p.vx += (p.ax - p.x) * steerStrength * dt * 60;
    p.vy += (p.ay - p.y) * steerStrength * dt * 60;

    // Damping (critically damped)
    const damp = Math.pow(0.18, dt * 60);
    p.vx *= damp;
    p.vy *= damp;

    // Integrate position
    p.x += p.vx * dt * speedMul;
    p.y += p.vy * dt * speedMul;

    // Size easing
    p.size += (p.sizeTarget - p.size) * (1 - Math.pow(0.08, dt * 60));

    // Update origin for parallax
    p.originX = p.x;
    p.originY = p.y;

    // Keep in bounds (soft wrap)
    if (p.x < -50) p.x += w + 100;
    if (p.x > w + 50) p.x -= w + 100;
    if (p.y < -50) p.y += h + 100;
    if (p.y > h + 50) p.y -= h + 100;

    // Update rotation
    p.rotation += p.rotationSpeed * 0.02 * speedMul;
}

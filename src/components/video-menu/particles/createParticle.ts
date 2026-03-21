/**
 * Particle Creation Function
 *
 * Creates individual particles with randomized properties based on type configuration.
 * Particles are positioned outside the video area to create a border effect.
 * Bokeh particles spawn near video edge and drift outward.
 */

import { Particle, ParticleTypeConfig, VideoRect } from './ParticleTypes';
import { getDepthOfFieldProperties, lerp } from './bokehAtlas';

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;

/**
 * Create a new particle with randomized properties
 *
 * @param type - Particle type key from PARTICLE_TYPES
 * @param config - Particle type configuration
 * @param canvasW - Canvas width in pixels
 * @param canvasH - Canvas height in pixels
 * @param videoRect - Video rectangle for positioning (null = full canvas)
 * @returns New particle object
 */
export function createParticle(
    type: string,
    config: ParticleTypeConfig,
    canvasW: number,
    canvasH: number,
    videoRect: VideoRect | null
): Particle {
    // Position particles OUTSIDE the video area
    let x: number, y: number;
    const margin = 20;
    const side = Math.floor(Math.random() * 4);

    // Initialize x, y with default values
    x = 0;
    y = 0;

    if (!videoRect) {
        // Full canvas placement (no video rect)
        x = rand(0, canvasW);
        y = rand(0, canvasH);
    } else {
        // Place in border zones (outside video, inside canvas)
        // For bokeh: bias positions near video edge, then drift outward
        if (type.startsWith('bokeh')) {
            const edgeBias = 0.7; // 70% chance to spawn near edge
            if (Math.random() < edgeBias) {
                // Spawn near video edge
                spawnNearEdge(side, videoRect, canvasW, canvasH, margin, (px, py) => {
                    x = px;
                    y = py;
                });
            } else {
                // Spawn in full border area
                spawnInBorderZone(side, videoRect, canvasW, canvasH, margin, (px, py) => {
                    x = px;
                    y = py;
                });
            }
        } else {
            // Non-bokeh particles spawn normally in border zones
            spawnInBorderZone(side, videoRect, canvasW, canvasH, margin, (px, py) => {
                x = px;
                y = py;
            });
        }
    }

    // Depth for bokeh particles (0 = close/sharp, 1 = far/blurred)
    const depth = type.startsWith('bokeh') ? rand(0, 1) : rand(0.3, 1.0);
    const dofProps = getDepthOfFieldProperties(depth);

    const baseSize = rand(config.sizeRange[0], config.sizeRange[1]);

    // Determine population: bokehMedium and bokehLarge are lens particles
    const population: 'border' | 'lens' =
        (type === 'bokehMedium' || type === 'bokehLarge') ? 'lens' : 'border';

    return {
        type,
        x,
        y,
        originX: x,
        originY: y,
        ax: x,           // Anchor starts at spawn position
        ay: y,
        vx: 0,           // Velocity starts at 0
        vy: 0,
        size: baseSize,
        baseSize,
        sizeTarget: baseSize,
        baseOpacity: rand(config.opacityRange[0], config.opacityRange[1]),
        opacity: 0, // Start at 0 for fade-in effect
        speed: rand(config.speedRange[0], config.speedRange[1]) * dofProps.speedMultiplier,
        rotation: rand(0, Math.PI * 2),
        rotationSpeed: rand(config.rotationSpeed[0], config.rotationSpeed[1]) * (Math.random() > 0.5 ? 1 : -1),
        blur: rand(config.blurRange[0], config.blurRange[1]),
        sprite: config.sprites ? config.sprites[Math.floor(Math.random() * config.sprites.length)] : null,
        color: config.colors ? config.colors[Math.floor(Math.random() * config.colors.length)] : null,

        // Wandering movement properties
        wanderAngle: rand(0, Math.PI * 2),
        wanderSpeed: rand(0.002, 0.008),
        wanderRadius: rand(20, 80),

        // Depth (affects parallax response - higher = more movement)
        depth,

        // Phase offset for synchronized effects
        phaseOffset: rand(0, Math.PI * 2),

        // Blink properties (for fireflies)
        blinkSpeed: rand(0.5, 2.0),
        blinkPhase: rand(0, Math.PI * 2),

        // Lifecycle properties
        life: 0,
        maxLife: rand(300, 800), // frames (~5-13 seconds at 60fps)
        fadeInFrames: 60,
        fadeOutFrames: 60,

        // Force accumulation (for phase-reactive forces)
        fx: 0,
        fy: 0,

        // Sprite index for bokeh atlas
        spriteIndex: Math.floor(Math.random() * 9999),

        // Population: border (rich effects) or lens (subtle overlay)
        population,
    };
}

/**
 * Spawn particle near video edge for emanation effect
 */
function spawnNearEdge(
    side: number,
    videoRect: VideoRect,
    canvasW: number,
    canvasH: number,
    margin: number,
    setPosition: (x: number, y: number) => void
): void {
    const edgeOffset = rand(10, 60); // Distance from edge
    const cornerBias = Math.random() < 0.3; // 30% bias toward corners

    let x: number, y: number;

    if (cornerBias) {
        // Spawn near corners
        const corner = Math.floor(Math.random() * 4);
        switch (corner) {
            case 0: // Top-left
                x = rand(videoRect.left - edgeOffset, videoRect.left + margin);
                y = rand(videoRect.top - edgeOffset, videoRect.top + margin);
                break;
            case 1: // Top-right
                x = rand(videoRect.right - margin, videoRect.right + edgeOffset);
                y = rand(videoRect.top - edgeOffset, videoRect.top + margin);
                break;
            case 2: // Bottom-left
                x = rand(videoRect.left - edgeOffset, videoRect.left + margin);
                y = rand(videoRect.bottom - margin, videoRect.bottom + edgeOffset);
                break;
            case 3: // Bottom-right
                x = rand(videoRect.right - margin, videoRect.right + edgeOffset);
                y = rand(videoRect.bottom - margin, videoRect.bottom + edgeOffset);
                break;
            default:
                x = rand(0, canvasW);
                y = rand(0, canvasH);
                break;
        }
    } else {
        // Spawn near edge midpoints
        switch (side) {
            case 0: // top edge
                x = rand(videoRect.left, videoRect.right);
                y = rand(videoRect.top - edgeOffset, videoRect.top + margin);
                break;
            case 1: // bottom edge
                x = rand(videoRect.left, videoRect.right);
                y = rand(videoRect.bottom - margin, videoRect.bottom + edgeOffset);
                break;
            case 2: // left edge
                x = rand(videoRect.left - edgeOffset, videoRect.left + margin);
                y = rand(videoRect.top, videoRect.bottom);
                break;
            case 3: // right edge
                x = rand(videoRect.right - margin, videoRect.right + edgeOffset);
                y = rand(videoRect.top, videoRect.bottom);
                break;
            default:
                x = rand(0, canvasW);
                y = rand(0, canvasH);
                break;
        }
    }

    setPosition(x, y);
}

/**
 * Spawn particle in border zone (standard placement)
 */
function spawnInBorderZone(
    side: number,
    videoRect: VideoRect,
    canvasW: number,
    canvasH: number,
    margin: number,
    setPosition: (x: number, y: number) => void
): void {
    let x: number, y: number;

    switch (side) {
        case 0: // top
            x = rand(0, canvasW);
            y = rand(0, videoRect.top - margin);
            break;
        case 1: // bottom
            x = rand(0, canvasW);
            y = rand(videoRect.bottom + margin, canvasH);
            break;
        case 2: // left
            x = rand(0, videoRect.left - margin);
            y = rand(0, canvasH);
            break;
        case 3: // right
            x = rand(videoRect.right + margin, canvasW);
            y = rand(0, canvasH);
            break;
        default:
            x = rand(0, canvasW);
            y = rand(0, canvasH);
            break;
    }

    setPosition(x, y);
}

/**
 * Initialize all particles for the particle system
 *
 * @param PARTICLE_TYPES - Particle type configurations
 * @param canvasW - Canvas width
 * @param canvasH - Canvas height
 * @param videoRect - Video rectangle
 * @returns Array of all particles
 */
export function initializeParticles(
    PARTICLE_TYPES: Record<string, ParticleTypeConfig>,
    canvasW: number,
    canvasH: number,
    videoRect: VideoRect | null
): Particle[] {
    const particles: Particle[] = [];

    Object.entries(PARTICLE_TYPES).forEach(([type, config]) => {
        for (let i = 0; i < config.count; i++) {
            particles.push(createParticle(type, config, canvasW, canvasH, videoRect));
        }
    });

    return particles;
}

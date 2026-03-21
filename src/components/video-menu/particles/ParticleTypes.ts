/**
 * Particle Type Configurations
 *
 * Defines all particle types with their visual and physical properties.
 * Replace emoji sprites with PNG paths when assets are available.
 * The particle system automatically detects PNG paths and uses ctx.drawImage().
 */

export interface ParticleTypeConfig {
    sprites?: string[]; // Emoji or PNG paths (e.g., ["/images/veggies/tomato.png", ...])
    sizeRange: [number, number];
    opacityRange: [number, number];
    speedRange: [number, number];
    rotationSpeed: [number, number];
    blurRange: [number, number];
    count: number;
    colors?: string[]; // For bokeh/fireflies (rgba prefixes)
}

export const PARTICLE_TYPES: Record<string, ParticleTypeConfig> = {
    // Vegetable particles - main floating elements
    veggie: {
        sprites: ["🍅", "🥬", "🫑", "🥒", "🥕", "🍋", "🌿", "🫒", "🍃", "🥗"],
        // Replace with PNGs when available:
        // sprites: ["/assets/images/veggies/tomato.png", "/assets/images/veggies/lettuce.png", ...],
        sizeRange: [14, 28],
        opacityRange: [0.15, 0.45],
        speedRange: [0.08, 0.25],
        rotationSpeed: [0.1, 0.4],
        blurRange: [1, 6],
        count: 12,
    },

    // Small bokeh particles - background depth
    bokehSmall: {
        sizeRange: [3, 10],
        opacityRange: [0.05, 0.18],
        speedRange: [0.03, 0.12],
        rotationSpeed: [0, 0],
        blurRange: [2, 8],
        count: 30,
        colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,", "rgba(255,255,255,"],
    },

    // Medium bokeh particles - mid-ground depth
    bokehMedium: {
        sizeRange: [12, 28],
        opacityRange: [0.04, 0.12],
        speedRange: [0.02, 0.08],
        rotationSpeed: [0, 0],
        blurRange: [6, 16],
        count: 18,
        colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,", "rgba(255,255,255,", "rgba(100,200,120,"],
    },

    // Large bokeh particles - foreground depth
    bokehLarge: {
        sizeRange: [30, 60],
        opacityRange: [0.02, 0.06],
        speedRange: [0.01, 0.04],
        rotationSpeed: [0, 0],
        blurRange: [14, 30],
        count: 8,
        colors: ["rgba(76,175,80,", "rgba(139,195,74,", "rgba(200,168,78,"],
    },

    // Firefly particles - blinking glowing dots
    firefly: {
        sizeRange: [1.5, 3.5],
        opacityRange: [0, 0.7],
        speedRange: [0.15, 0.5],
        rotationSpeed: [0, 0],
        blurRange: [0, 2],
        count: 16,
        colors: ["rgba(180,220,100,", "rgba(220,255,150,", "rgba(255,255,200,"],
    },
};

// Card positions for proximity effects (percentage coordinates)
export const CARD_POSITIONS: Record<string, { x: number; y: number }> = {
    build: { x: 15, y: 53 },
    recommended: { x: 50, y: 53 },
    login: { x: 85, y: 53 },
};

/**
 * Individual particle state
 */
export interface Particle {
    type: string;
    x: number;
    y: number;
    originX: number;
    originY: number;
    ax: number;        // Anchor X (where particle "wants" to be)
    ay: number;        // Anchor Y
    vx: number;        // Velocity X
    vy: number;        // Velocity Y
    size: number;
    baseSize: number;  // Original size reference
    sizeTarget: number; // Target size for smooth transitions
    baseOpacity: number;
    opacity: number;
    speed: number;
    rotation: number;
    rotationSpeed: number;
    blur: number;
    sprite: string | null;
    color: string | null;
    wanderAngle: number;
    wanderSpeed: number;
    wanderRadius: number;
    depth: number;
    phaseOffset: number;
    blinkSpeed: number;
    blinkPhase: number;
    life: number;
    maxLife: number;
    fadeInFrames: number;
    fadeOutFrames: number;
    fx: number; // Force X accumulator
    fy: number; // Force Y accumulator
    spriteIndex: number; // Index into bokeh sprite atlas
    population: 'border' | 'lens'; // Particle population: border (rich effects) or lens (subtle overlay)
}

/**
 * Video rectangle for particle positioning
 */
export interface VideoRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
}

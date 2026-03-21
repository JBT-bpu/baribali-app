/**
 * Bokeh Sprite Atlas
 *
 * Pre-renders bokeh sprites for efficient rendering.
 * Uses sprite-based rendering instead of per-frame gradients for better performance
 * and authentic lens bokeh appearance.
 */

/**
 * Bokeh tint colors (warm gold + salad green highlights)
 */
const BOKEH_TINTS = [
    [255, 225, 150], // gold
    [255, 210, 120], // warm gold
    [210, 255, 190], // minty green
    [180, 235, 160], // salad green
    [255, 245, 210], // pale highlight
];

/**
 * Bokeh radii for depth tiers
 */
const BOKEH_RADII = [6, 10, 14, 18, 26, 34, 46, 60];

/**
 * Create a single bokeh sprite
 *
 * @param r - Radius of bokeh
 * @param tint - RGB color array [r, g, b]
 * @param ring - Whether to draw ring edge
 * @returns Canvas element with bokeh sprite
 */
function makeBokehSprite({
    r,
    tint,
    ring = true,
}: {
    r: number;
    tint: [number, number, number];
    ring?: boolean;
}): HTMLCanvasElement {
    const pad = Math.ceil(r * 1.2);
    const canvas = document.createElement('canvas');
    canvas.width = r * 2 + pad * 2;
    canvas.height = r * 2 + pad * 2;
    const ctx = canvas.getContext('2d');

    if (!ctx) return canvas;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Core glow - soft gold core with falloff
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0.0, `rgba(${tint[0]},${tint[1]},${tint[2]},0.22)`);
    gradient.addColorStop(0.25, `rgba(${tint[0]},${tint[1]},${tint[2]},0.10)`);
    gradient.addColorStop(0.55, `rgba(${tint[0]},${tint[1]},${tint[2]},0.04)`);
    gradient.addColorStop(1.0, `rgba(${tint[0]},${tint[1]},${tint[2]},0.00)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle ring edge (lens bokeh feel)
    if (ring) {
        ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.06)`;
        ctx.lineWidth = Math.max(1, r * 0.03);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();
    }

    return canvas;
}

/**
 * Build the complete bokeh sprite atlas
 *
 * @returns Array of pre-rendered bokeh canvas elements
 */
export function buildBokehAtlas(): HTMLCanvasElement[] {
    const sprites: HTMLCanvasElement[] = [];

    for (const r of BOKEH_RADII) {
        for (const tint of BOKEH_TINTS) {
            // Add ring edge for larger bokeh (medium and large)
            const ring = r >= 12;
            sprites.push(makeBokehSprite({ r, tint: tint as [number, number, number], ring }));
        }
    }

    return sprites;
}

/**
 * Get depth-based bokeh properties
 *
 * @param z - Depth value [0..1], 0 = close/sharp, 1 = far/blurred
 * @returns Object with size, speed, alpha multipliers
 */
export function getDepthOfFieldProperties(z: number) {
    // Size: big ones are "background" bokeh wash
    const sizeMultiplier = z * z; // z^2 for exponential falloff

    // Speed: big bokeh moves slower
    const speedMultiplier = 1 - z * 0.75; // 1.0 at z=0, 0.25 at z=1

    // Alpha: big bokeh is faint
    const alphaMultiplier = 1 - z * 0.8; // 1.0 at z=0, 0.2 at z=1

    return {
        sizeMultiplier,
        speedMultiplier,
        alphaMultiplier,
    };
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

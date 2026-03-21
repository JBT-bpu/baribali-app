/**
 * Particle Renderers
 *
 * Functions to render different particle types on canvas.
 * Supports both emoji sprites and PNG images.
 * Uses sprite-based bokeh with screen blend for diegetic lens optics.
 */

import { Particle } from './ParticleTypes';
import { getDepthOfFieldProperties } from './bokehAtlas';

/**
 * Check if a sprite path is a PNG image
 */
function isPngPath(sprite: string): boolean {
    return sprite.startsWith('/') || sprite.startsWith('./') || sprite.endsWith('.png');
}

/**
 * Render a vegetable particle
 * Supports both emoji and PNG images
 */
export function renderVeggie(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    imageCache: Map<string, HTMLImageElement>
): void {
    if (!p.sprite) return;

    const cachedImage = imageCache.get(p.sprite);

    if (cachedImage) {
        // Draw PNG image
        ctx.drawImage(
            cachedImage,
            -p.size / 2,
            -p.size / 2,
            p.size,
            p.size
        );
    } else if (!isPngPath(p.sprite)) {
        // Fallback to emoji
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.sprite, 0, 0);
    }
}

/**
 * Render a bokeh particle using pre-rendered sprite
 * Uses screen blend mode for authentic lens optics
 */
export function renderBokeh(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    bokehAtlas: HTMLCanvasElement[] | null,
    isLensOverlay: boolean = false
): void {
    if (!bokehAtlas || !p.spriteIndex) return;

    const sprite = bokehAtlas[p.spriteIndex % bokehAtlas.length];
    if (!sprite) return;

    // Lens blend mode for authentic bokeh
    ctx.globalCompositeOperation = 'screen';

    // Apply intensity multiplier for lens overlay
    let alpha = p.opacity;
    if (isLensOverlay) {
        // Lens overlay uses reduced intensity (2-8% effective)
        alpha *= 0.22; // LENS_ALPHA constant
    }

    ctx.globalAlpha = alpha;

    const w = sprite.width;
    const h = sprite.height;
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);

    // Restore defaults for other particles
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

/**
 * Render a firefly particle (blinking glowing dot)
 */
export function renderFirefly(
    ctx: CanvasRenderingContext2D,
    p: Particle
): void {
    if (!p.color) return;

    // Glowing dot with bloom
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 4);
    gradient.addColorStop(0, p.color + '1)');
    gradient.addColorStop(0.2, p.color + '0.5)');
    gradient.addColorStop(1, p.color + '0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 4, 0, Math.PI * 2);
    ctx.fill();

    // Hard core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Main render function - dispatches to appropriate renderer
 */
export function renderParticle(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    imageCache: Map<string, HTMLImageElement>,
    bokehAtlas: HTMLCanvasElement[] | null,
    isLensOverlay: boolean = false
): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    // Skip blur for sprite-based bokeh (pre-blurred in sprite)
    if (p.type.startsWith('bokeh')) {
        renderBokeh(ctx, p, bokehAtlas, isLensOverlay);
        ctx.restore();
        return;
    }

    // Apply blur for non-bokeh particles
    if (p.blur > 0.5) {
        ctx.filter = `blur(${p.blur}px)`;
    }

    ctx.globalAlpha = p.opacity;

    switch (p.type) {
        case 'veggie':
            renderVeggie(ctx, p, imageCache);
            break;
        case 'firefly':
            renderFirefly(ctx, p);
            break;
    }

    ctx.filter = 'none';
    ctx.restore();
}

/**
 * Preload PNG images for particle sprites
 */
export async function preloadImages(spritePaths: string[]): Promise<Map<string, HTMLImageElement>> {
    const imageCache = new Map<string, HTMLImageElement>();

    const loadPromises = spritePaths.map(async (path) => {
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                imageCache.set(path, img);
                resolve();
            };
            img.onerror = () => {
                // Silently fail - will fall back to emoji
                resolve();
            };
            img.src = path;
        });
    });

    await Promise.all(loadPromises);
    return imageCache;
}

/**
 * Apply edge mask to lens overlay canvas
 * Prevents bokeh from "dirtying" faces/text in center
 *
 * @param ctx - Canvas context
 * @param w - Canvas width
 * @param h - Canvas height
 */
export function applyEdgeMask(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
    gradient.addColorStop(0, 'rgba(0,0,0,0.15)');   // Center: 15% visible
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.4)');  // Mid: 40% visible
    gradient.addColorStop(1, 'rgba(0,0,0,1)');     // Edges: 100% visible

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

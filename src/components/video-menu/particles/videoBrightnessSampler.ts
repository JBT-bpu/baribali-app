/**
 * Video Brightness Sampler
 *
 * Samples video brightness at low resolution for exposure-reactive bokeh.
 * Makes bokeh "breathe" with actual scene lighting.
 */

/**
 * Video brightness sampler state
 */
export interface BrightnessSamplerState {
    sampleCanvas: HTMLCanvasElement | null;
    sampleCtx: CanvasRenderingContext2D | null;
    lastSampleTime: number;
    currentBrightness: number;
    targetBrightness: number;
}

/**
 * Initialize brightness sampler
 */
export function initBrightnessSampler(): BrightnessSamplerState {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 48; // Low res for performance
    sampleCanvas.height = 48;
    const sampleCtx = sampleCanvas.getContext('2d');

    return {
        sampleCanvas,
        sampleCtx,
        lastSampleTime: 0,
        currentBrightness: 0.5,
        targetBrightness: 0.5,
    };
}

/**
 * Sample video brightness
 *
 * @param video - Video element to sample
 * @param state - Sampler state
 * @param currentTime - Current timestamp
 * @param sampleInterval - Sampling interval in ms (default 200ms)
 */
export function sampleVideoBrightness(
    video: HTMLVideoElement | null,
    state: BrightnessSamplerState,
    currentTime: number,
    sampleInterval: number = 200
): void {
    if (!video || !state.sampleCtx) return;

    // Sample at interval
    if (currentTime - state.lastSampleTime < sampleInterval) return;
    state.lastSampleTime = currentTime;

    // Draw video to sample canvas
    state.sampleCtx.drawImage(video, 0, 0, 48, 48);

    // Get pixel data
    const imageData = state.sampleCtx.getImageData(0, 0, 48, 48);
    const data = imageData.data;

    // Calculate average luminance
    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Perceived luminance formula
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += luminance;
    }

    const avgLuminance = totalLuminance / (data.length / 4);
    state.targetBrightness = avgLuminance / 255; // Normalize to 0-1

    // Smooth transition
    state.currentBrightness = lerp(state.currentBrightness, state.targetBrightness, 0.15);
}

/**
 * Get bokeh intensity multiplier based on brightness
 *
 * @param brightness - Current brightness [0..1]
 * @returns Intensity multiplier [0.7..1.3]
 */
export function getBokehIntensity(brightness: number): number {
    return 0.7 + brightness * 0.6;
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

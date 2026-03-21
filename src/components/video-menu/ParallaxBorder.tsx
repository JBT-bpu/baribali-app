/**
 * Parallax Border - Diegetic Lens Optics Particle System
 *
 * A high-performance canvas-based particle system that creates cinematic bokeh effects.
 * Features:
 * - Sprite-based bokeh rendering (pre-rendered atlas for performance)
 * - Screen blend mode for authentic lens optics
 * - Phase-reactive forces (intro drift, preview attraction, outro scatter)
 * - Gyroscope and mouse parallax support
 * - Video brightness sampling for exposure-reactive bokeh
 * - 6-layer stacking (ambient glows, particles, light leaks, edge bloom, video, vignette)
 * - PNG asset support with emoji fallback
 * - Mobile optimization (DPR cap, particle limits)
 * - Energy-based impulse system for dynamic particle responses
 *
 * Architecture extracted from: opus_help/cinematic-fx (1).jsx
 */

'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { EnginePhase, CardState } from '@/types/video-menu';
import { PARTICLE_TYPES } from './particles/ParticleTypes';
import { initializeParticles } from './particles/createParticle';
import { mapPhaseToCinematic, calculatePhaseForces, applyForcesToParticle } from './particles/phaseForces';
import { animateFrame, calculateVideoRect, AnimationState } from './particles/animationLoop';
import { preloadImages, renderParticle, applyEdgeMask } from './particles/renderers';
import { buildBokehAtlas } from './particles/bokehAtlas';
import { initBrightnessSampler, sampleVideoBrightness, getBokehIntensity, BrightnessSamplerState } from './particles/videoBrightnessSampler';
import { initEnergyState, updateEnergy } from './particles/energySystem';
import { onCardHover, onCardSelect, onContinue, onPhaseChange } from './particles/eventHooks';
import { EnergyState } from './particles/energySystem';

/**
 * Imperative handle for triggering particle events from parent components
 */
export interface ParallaxBorderHandle {
    onCardHover: (cardId: string | null) => void;
    onCardSelect: (cardId: string | null) => void;
    onContinue: () => void;
}

export interface ParallaxBorderProps {
    phase: EnginePhase;
    cardHovered: string | null;
    cardSelected: string | null;
    cardStates: Record<string, CardState>;
    videoRef?: React.RefObject<HTMLVideoElement> | null; // Optional video element for brightness sampling
}

const ParallaxBorder = forwardRef<ParallaxBorderHandle, ParallaxBorderProps>((props, ref) => {
    const { phase, cardHovered, cardSelected, cardStates, videoRef } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number | null>(null);
    const bokehAtlasRef = useRef<HTMLCanvasElement[] | null>(null);
    const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const brightnessSamplerRef = useRef<BrightnessSamplerState | null>(null);
    const energyStateRef = useRef(initEnergyState());
    const stateRef = useRef<AnimationState>({
        time: 0,
        particles: [],
        gyro: { x: 0, y: 0 },
        phase,
        cardId: cardHovered || cardSelected,
        videoRect: null,
        bokehIntensity: 1.0,
        energy: 0.08,
        activeUntil: 0,
    });

    // Animation state
    const animationStateRef = useRef<AnimationState>({
        time: 0,
        particles: [],
        gyro: { x: 0, y: 0 },
        phase,
        cardId: cardHovered || cardSelected,
        videoRect: null,
        bokehIntensity: 1.0,
        energy: 0.08,
        activeUntil: 0,
    });

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
        onCardHover: (cardId: string | null) => {
            onCardHover(
                animationStateRef.current.particles,
                cardId,
                stateRef.current.videoRect,
                energyStateRef.current
            );
        },
        onCardSelect: (cardId: string | null) => {
            onCardSelect(
                animationStateRef.current.particles,
                cardId,
                stateRef.current.videoRect,
                energyStateRef.current
            );
        },
        onContinue: () => {
            onContinue(
                animationStateRef.current.particles,
                stateRef.current.videoRect,
                energyStateRef.current
            );
        },
    }));

    // Preload bokeh sprite atlas
    useEffect(() => {
        const atlas = buildBokehAtlas();
        bokehAtlasRef.current = atlas;
    }, []);

    // Preload PNG assets (if configured)
    useEffect(() => {
        const loadAssets = async () => {
            const veggieSprites = PARTICLE_TYPES.veggie.sprites;
            if (veggieSprites?.some(s => s.startsWith('/'))) {
                const cache = await preloadImages(veggieSprites);
                imageCacheRef.current = cache;
            }
        };
        loadAssets();
    }, []);

    // Initialize brightness sampler
    useEffect(() => {
        if (videoRef?.current) {
            brightnessSamplerRef.current = initBrightnessSampler();
        }
    }, [videoRef]);

    // Sample video brightness periodically
    useEffect(() => {
        if (!videoRef?.current || !brightnessSamplerRef.current) return;

        const sampleInterval = setInterval(() => {
            if (videoRef.current && brightnessSamplerRef.current) {
                sampleVideoBrightness(
                    videoRef.current,
                    brightnessSamplerRef.current,
                    performance.now(),
                    200 // Sample every 200ms
                );
            }
        }, 200);

        return () => clearInterval(sampleInterval);
    }, [videoRef]);

    // Gyroscope input for mobile
    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            stateRef.current.gyro = {
                x: (e.gamma || 0) / 45, // -1 to 1
                y: (e.beta || 0) / 45,
            };
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    // Desktop fallback: mousemove
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            stateRef.current.gyro = {
                x: (e.clientX / window.innerWidth - 0.5) * 2,
                y: (e.clientY / window.innerHeight - 0.5) * 2,
            };
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Handle phase changes
    useEffect(() => {
        const prevPhase = stateRef.current.phase;
        stateRef.current.phase = phase;

        // Trigger phase change event
        if (prevPhase !== phase && stateRef.current.videoRect) {
            const cinematicPhase = mapPhaseToCinematic(phase);
            onPhaseChange(
                stateRef.current.particles,
                cinematicPhase,
                stateRef.current.videoRect,
                energyStateRef.current
            );
        }
    }, [phase]);

    // Handle card hover/select changes
    useEffect(() => {
        const cardId = cardHovered || cardSelected;
        stateRef.current.cardId = cardId;
    }, [cardHovered, cardSelected]);

    // Initialize canvas and particles
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            animationStateRef.current.videoRect = calculateVideoRect(canvas.width, canvas.height);

            // Reinitialize particles on resize
            animationStateRef.current.particles = initializeParticles(
                PARTICLE_TYPES,
                canvas.width,
                canvas.height,
                stateRef.current.videoRect
            );
        };

        resize();
        window.addEventListener('resize', resize);

        // Initialize particles
        resize();

        // Animation loop
        const animate = () => {
            // Update energy state
            updateEnergy(energyStateRef.current, performance.now());

            // Update bokeh intensity from brightness sampler
            if (brightnessSamplerRef.current) {
                stateRef.current.bokehIntensity = getBokehIntensity(brightnessSamplerRef.current.currentBrightness);
            }

            // Update energy in state
            animationStateRef.current.energy = energyStateRef.current.energy;

            animateFrame(
                ctx,
                stateRef.current,
                imageCacheRef.current,
                bokehAtlasRef.current,
                canvas.width,
                canvas.height,
                false // isLensOverlay = false (border canvas)
            );
            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <>
            {/* Layer 1: Deep ambient glows */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute rounded-full will-change-transform transition-transform duration-[12000ms] ease-in-out animate-[ambientDrift_12s_ease-in-out_infinite]"
                    style={{
                        top: '-15%',
                        right: '-20%',
                        width: '70%',
                        height: '50%',
                        background: 'radial-gradient(ellipse, rgba(76,175,80,0.08) 0%, transparent 70%)',
                    }}
                />
                <div className="absolute rounded-full will-change-transform transition-transform duration-[16000ms] ease-in-out animate-[ambientDrift_16s_ease-in-out_infinite]"
                    style={{
                        bottom: '-10%',
                        left: '-15%',
                        width: '55%',
                        height: '45%',
                        background: 'radial-gradient(ellipse, rgba(139,195,74,0.06) 0%, transparent 70%)',
                        animationDelay: '4s',
                    }}
                />
                <div className="absolute rounded-full will-change-transform transition-transform duration-[20000ms] ease-in-out animate-[ambientDrift_20s_ease-in-out_infinite]"
                    style={{
                        top: '30%',
                        left: '50%',
                        width: '40%',
                        height: '35%',
                        background: 'radial-gradient(ellipse, rgba(200,168,78,0.04) 0%, transparent 70%)',
                        animationDelay: '8s',
                    }}
                />
            </div>

            {/* Layer 2: Canvas particle system (border-only) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full z-[2] pointer-events-none"
            />

            {/* Layer 3: Light leaks / flares */}
            <div className="absolute inset-0 z-[3] pointer-events-none mix-blend-screen">
                <div className="absolute will-change-transform transition-transform duration-[8000ms] ease-in-out animate-[leakShift_8s_ease-in-out_infinite]"
                    style={{
                        top: 0,
                        left: '10%',
                        width: '30%',
                        height: '40%',
                        background: 'linear-gradient(180deg, rgba(180,220,100,0.03) 0%, transparent 100%)',
                    }}
                />
                <div className="absolute will-change-transform transition-transform duration-[10000ms] ease-in-out animate-[leakShift_10s_ease-in-out_infinite]"
                    style={{
                        bottom: 0,
                        right: '15%',
                        width: '25%',
                        height: '35%',
                        background: 'linear-gradient(0deg, rgba(200,168,78,0.025) 0%, transparent 100%)',
                        animationDelay: '3s',
                    }}
                />
            </div>

            {/* Layer 4: Edge bloom */}
            <div className="absolute inset-0 z-[4] pointer-events-none">
                <div className="absolute blur-[20px] animate-[edgePulse_6s_ease-in-out_infinite]"
                    style={{
                        top: '5%',
                        left: '15%',
                        right: '15%',
                        height: '60px',
                        background: 'linear-gradient(180deg, rgba(76,175,80,0.06) 0%, transparent 100%)',
                    }}
                />
                <div className="absolute blur-[20px] animate-[edgePulse_6s_ease-in-out_infinite]"
                    style={{
                        bottom: '5%',
                        left: '15%',
                        right: '15%',
                        height: '60px',
                        background: 'linear-gradient(0deg, rgba(76,175,80,0.06) 0%, transparent 100%)',
                        animationDelay: '3s',
                    }}
                />
                <div className="absolute blur-[15px] animate-[edgePulse_8s_ease-in-out_infinite]"
                    style={{
                        top: '15%',
                        bottom: '15%',
                        left: '10%',
                        width: '40px',
                        height: '100%',
                        background: 'linear-gradient(90deg, rgba(139,195,74,0.04) 0%, transparent 100%)',
                        animationDelay: '1.5s',
                    }}
                />
                <div className="absolute blur-[15px] animate-[edgePulse_8s_ease-in-out_infinite]"
                    style={{
                        top: '15%',
                        bottom: '15%',
                        right: '10%',
                        width: '40px',
                        height: '100%',
                        background: 'linear-gradient(270deg, rgba(139,195,74,0.04) 0%, transparent 100%)',
                        animationDelay: '4.5s',
                    }}
                />
            </div>

            {/* Layer 5: Video area (placeholder - actual video goes here) */}
            <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
                <div className="aspect-[9/16] h-full max-w-full border border-dashed border-white/10 rounded-4 flex flex-col items-center justify-center"
                    style={{ width: '100%' }}>
                    <div className="text-[32px] mb-3">📹</div>
                    <div className="text-[13px] text-white/40">VIDEO AREA</div>
                    <div className="text-[10px] text-white/20">9:16 contain</div>
                </div>
            </div>

            {/* Layer 6: Vignette */}
            <div className="absolute inset-0 z-[6] pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 70% 70% at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
                }}
            />

            {/* CSS animations for ambient effects */}
            <style>{`
                @keyframes ambientDrift {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    33% { transform: translate(3%, -2%) scale(1.05); opacity: 0.8; }
                    66% { transform: translate(-2%, 1%) scale(0.95); opacity: 0.7; }
                }
                @keyframes leakShift {
                    0%, 100% { transform: translateX(0) scaleY(1); opacity: 0.5; }
                    50% { transform: translateX(5%) scaleY(1.1); opacity: 0.8; }
                }
                @keyframes edgePulse {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.35; }
                }
            `}</style>
        </>
    );
});

ParallaxBorder.displayName = 'ParallaxBorder';

export default ParallaxBorder;

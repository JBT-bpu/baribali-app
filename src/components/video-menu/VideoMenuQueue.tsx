// Video Menu Component with VideoQueue Architecture
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import VideoQueue, { QueueEntry, VideoQueueRef } from './VideoQueue';
import HotspotLayer from './HotspotLayer';
import GlowOverlay from './GlowOverlay';
import ParallaxBorder from './ParallaxBorder';
import { HOTSPOT_CONFIG } from './hotspot-config';
import type { Hotspot, NavHotspot } from '@/types/video-menu';

// Video queue configuration
const VIDEO_QUEUE: QueueEntry[] = [
    { id: 'menu-intro', src: '/video/intro.mp4', loop: false, waitFor: null },
    { id: 'menu-loop', src: '/video/loop1.mp4', loop: true, waitFor: 'card-pick' },
    { id: 'build-intro', src: '/video/intro_build.mp4', loop: false, waitFor: null },
    { id: 'build-loop', src: '/video/build_loop1.mp4', loop: true, waitFor: 'size-pick' },
    { id: 'build-outro', src: '/video/build_outro.mp4', loop: false, waitFor: null },
];

// Size selection hotspots
const SIZE_HOTSPOTS = [
    { id: 'sizeS', label: 'Size S', dest: '/build', top: 40, left: 1.6, width: 25, height: 27.2 },
    { id: 'sizeM', label: 'Size M', dest: '/build', top: 38.3, left: 35, width: 30, height: 30 },
    { id: 'sizeL', label: 'Size L', dest: '/build', top: 40, left: 72, width: 26.4, height: 26.7 },
];

export default function VideoMenuQueue() {
    const [waitingFor, setWaitingFor] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [showBuilder, setShowBuilder] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [debugMode, setDebugMode] = useState(false);
    const [fps, setFps] = useState(0);
    const queueRef = useRef<VideoQueueRef>(null);

    // Get current hotspot config based on wait state
    const currentHotspotConfig = useMemo(() => {
        if (waitingFor === 'size-pick') {
            return {
                cards: SIZE_HOTSPOTS,
                nav: [],
                navBottom: 2.5,
                navHeight: 7,
            };
        }
        return HOTSPOT_CONFIG;
    }, [waitingFor]);

    // Toggle debug mode with 'd' key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'd' || e.key === 'D') {
                setDebugMode((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // FPS counter — only runs when debug mode is active
    useEffect(() => {
        if (!debugMode) return;
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const countFrames = () => {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
            animationFrameId = requestAnimationFrame(countFrames);
        };

        animationFrameId = requestAnimationFrame(countFrames);
        return () => cancelAnimationFrame(animationFrameId);
    }, [debugMode]);

    // Called when queue hits a pause point
    const handleWaiting = useCallback((waitId: string) => {
        setWaitingFor(waitId);
        setPreviewId(null);
    }, []);

    // Called when queue finishes
    const handleQueueComplete = useCallback(() => {
        setShowBuilder(true);
    }, []);

    // Advance the queue (called on second tap confirm)
    const advanceQueue = useCallback(() => {
        queueRef.current?.advance();
        setWaitingFor(null);
        setPreviewId(null);
    }, []);

    // Handle hotspot tap (two-tap pattern)
    const handleHotspotTap = useCallback((id: string) => {
        if (!waitingFor) return;

        if (previewId === id) {
            if (waitingFor === 'size-pick') {
                const MAP: Record<string, string> = { sizeS: 'S', sizeM: 'M', sizeL: 'L' };
                setSelectedSize(MAP[id] ?? id);
            }
            advanceQueue();
        } else {
            setPreviewId(id);
        }
    }, [waitingFor, previewId, advanceQueue]);

    // Handle nav click (direct navigation)
    const handleNavClick = useCallback((_dest: string) => {
        // nav clicks during video flow aren't currently used
    }, []);

    // Handle hotspot click
    const handleHotspotClick = useCallback((hotspot: Hotspot | NavHotspot) => {
        if (!waitingFor) return;

        if ('top' in hotspot) {
            // Card/size click
            handleHotspotTap(hotspot.id);
        } else {
            // Nav click
            handleNavClick(hotspot.dest);
        }
    }, [waitingFor, handleHotspotTap, handleNavClick]);

    // Tap outside → reset preview
    const handleBackgroundClick = useCallback(() => {
        setPreviewId(null);
    }, []);

    // If showing builder, redirect to build page with size param
    useEffect(() => {
        if (showBuilder) {
            const sizeQuery = selectedSize ? `?size=${selectedSize}` : '';
            window.location.href = `/build${sizeQuery}`;
        }
    }, [showBuilder, selectedSize]);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px',
                aspectRatio: '9/16',
                margin: '0 auto',
                overflow: 'hidden',
                backgroundColor: '#000',
                borderRadius: '20px',
            }}
        >
            {/* Layer 1: Background + Parallax Border */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#0d1f04',
                    zIndex: 0,
                }}
            >
                <ParallaxBorder
                    phase={waitingFor ? 'loop' : 'loading'}
                    cardHovered={hoveredId}
                    cardSelected={previewId}
                    cardStates={{}}
                />
            </div>

            {/* Layer 2: Video Queue */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                }}
            >
                <VideoQueue
                    ref={queueRef}
                    queue={VIDEO_QUEUE}
                    onWaiting={handleWaiting}
                    onQueueComplete={handleQueueComplete}
                />
            </div>

            {/* Layer 3: PNG Glow Overlays */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2,
                    pointerEvents: 'none',
                }}
            >
                {currentHotspotConfig.cards.map((card) => {
                    const shouldShowGlow = previewId === card.id;
                    return (
                        <div
                            key={`glow-container-${card.id}`}
                            style={{
                                position: 'absolute',
                                top: `${card.top - 4}%`,
                                left: `${card.left - 3}%`,
                                width: `${card.width + 6}%`,
                                height: `${card.height + 8}%`,
                                opacity: shouldShowGlow ? 1 : 0,
                                transition: 'opacity 0.3s ease, transform 0.3s ease',
                                transform: shouldShowGlow ? 'scale(1.02)' : 'scale(0.98)',
                            }}
                        >
                            <GlowOverlay
                                cardId={card.id}
                                layout="mobile"
                                cardState={shouldShowGlow ? 'previewing' : 'idle'}
                            />
                        </div>
                    );
                })}

                {/* Nav glow bar */}
                {currentHotspotConfig.nav.length > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: `${currentHotspotConfig.navBottom - 1}%`,
                            left: '5%',
                            width: '90%',
                            height: `${currentHotspotConfig.navHeight + 2}%`,
                            background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)',
                            opacity: currentHotspotConfig.nav.some((n) => n.id === hoveredId) ? 1 : 0,
                            transition: 'opacity 0.3s ease',
                        }}
                    />
                )}
            </div>

            {/* Layer 4: Invisible Hotspot Buttons */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 3,
                }}
            >
                <HotspotLayer
                    config={currentHotspotConfig}
                    onHotspotClick={handleHotspotClick}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    hotspotsActive={!!waitingFor}
                    debugMode={debugMode}
                    onBackgroundClick={handleBackgroundClick}
                />
            </div>

            {/* Debug Mode Indicator */}
            {debugMode && (
                <div
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#0f0',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        zIndex: 100,
                    }}
                >
                    DEBUG MODE<br />
                    FPS: {fps}<br />
                    Waiting For: {waitingFor || 'none'}<br />
                    Preview: {previewId || 'none'}<br />
                    Hovered: {hoveredId || 'none'}<br />
                    Queue Index: {queueRef.current?.getCurrentIndex() ?? 'N/A'}<br />
                    Press 'D' to toggle
                </div>
            )}
        </div>
    );
}

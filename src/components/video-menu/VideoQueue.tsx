'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface QueueEntry {
    id: string;
    src: string;
    loop: boolean;
    waitFor: string | null;  // null = auto-advance, string = wait for trigger
}

export interface VideoQueueProps {
    queue: QueueEntry[];
    onWaiting?: (waitId: string, queueIndex: number) => void;  // called when hitting a pause point
    onQueueComplete?: () => void;  // called when last entry finishes
    style?: React.CSSProperties;
}

export interface VideoQueueRef {
    advance: () => void;
    getCurrentIndex: () => number;
}

const VideoQueue = forwardRef<VideoQueueRef, VideoQueueProps>(({
    queue,
    onWaiting,
    onQueueComplete,
    style
}, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [index, setIndex] = useState(0);
    const [canvasVisible, setCanvasVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const indexRef = useRef(0);

    useEffect(() => { indexRef.current = index; }, [index]);

    // ─── Canvas bridge: freeze → swap → fade ───
    const bridgeTo = useCallback(async (nextIndex: number) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || isTransitioning) return;

        setIsTransitioning(true);

        // Step 1: Capture current frame
        const ctx = canvas.getContext('2d');
        if (ctx && video.readyState >= 2) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setCanvasVisible(true);
        }

        // Step 2: Load next
        const next = queue[nextIndex];
        video.src = next.src;
        video.loop = next.loop;
        video.load();

        // Step 3: Wait for ready
        await new Promise<void>((resolve) => {
            if (video.readyState >= 3) { resolve(); return; }
            video.addEventListener('canplay', () => resolve(), { once: true });
        });

        // Step 4: Play
        await video.play().catch(() => { });

        // Step 5: Wait for first frame paint
        await new Promise<void>((resolve) => {
            if ('requestVideoFrameCallback' in video) {
                (video as any).requestVideoFrameCallback(() => resolve());
            } else {
                setTimeout(resolve, 50);
            }
        });

        // Step 6: Fade canvas out
        if (canvas) {
            canvas.style.transition = 'opacity 200ms ease';
            canvas.style.opacity = '0';
            await new Promise(r => setTimeout(r, 250));
            canvas.style.transition = '';
            canvas.style.opacity = '1';
            setCanvasVisible(false);
        }

        // Step 7: Update state
        setIndex(nextIndex);
        setIsTransitioning(false);

        // Step 8: If this entry has a waitFor, notify parent
        if (next.waitFor) {
            onWaiting?.(next.waitFor, nextIndex);
        }
    }, [queue, isTransitioning, onWaiting]);

    // ─── Start first video on mount ───
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const first = queue[0];
        video.src = first.src;
        video.loop = first.loop;
        video.load();

        const onCanPlay = () => {
            video.play().catch(() => { });
            // If first entry is a wait point, notify immediately when loop starts
            if (first.waitFor) {
                onWaiting?.(first.waitFor, 0);
            }
        };
        video.addEventListener('canplay', onCanPlay, { once: true });
        return () => video.removeEventListener('canplay', onCanPlay);
    }, []);  // only on mount

    // ─── Handle video ended ───
    const handleEnded = useCallback(() => {
        const currentIndex = indexRef.current;
        const current = queue[currentIndex];

        // Looping videos don't end (browser handles it)
        // But as safety: if a loop somehow ends, restart
        if (current.loop) {
            const video = videoRef.current;
            if (video) {
                video.currentTime = 0;
                video.play().catch(() => { });
            }
            return;
        }

        // Non-loop video ended → advance
        const nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
            // Queue complete
            onQueueComplete?.();
            return;
        }

        // Bridge to next
        bridgeTo(nextIndex);
    }, [queue, bridgeTo, onQueueComplete]);

    // ─── Public method: advance past a wait point ───
    // Call this from parent when user makes their choice
    const advance = useCallback(() => {
        const currentIndex = indexRef.current;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= queue.length) {
            onQueueComplete?.();
            return;
        }

        bridgeTo(nextIndex);
    }, [queue, bridgeTo, onQueueComplete]);

    const getCurrentIndex = useCallback(() => indexRef.current, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        advance,
        getCurrentIndex,
    }), [advance, getCurrentIndex]);

    return (
        <>
            <video
                ref={videoRef}
                muted
                playsInline
                onEnded={handleEnded}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    ...style,
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: canvasVisible ? 1 : 0,
                    pointerEvents: 'none',
                    zIndex: 5,
                }}
            />
        </>
    );
});

VideoQueue.displayName = 'VideoQueue';

export default VideoQueue;

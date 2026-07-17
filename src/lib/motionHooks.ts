'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * OS-level reduced-motion preference, live-updating. The CSS side is already
 * gated globally in globals.css; this covers JS-driven effects (Tilt, rAF
 * number animation) that CSS can't reach.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
}

/**
 * Rolls an integer toward `value` over `duration` ms (ease-out) instead of
 * snapping — for prices and other watched numbers. Returns `value` directly
 * under reduced motion.
 */
export function useAnimatedNumber(value: number, duration = 300): number {
    const reduced = usePrefersReducedMotion();
    const [display, setDisplay] = useState(value);
    const displayRef = useRef(value);

    useEffect(() => {
        if (reduced || duration <= 0) {
            displayRef.current = value;
            setDisplay(value);
            return;
        }
        const from = displayRef.current;
        if (from === value) return;
        let raf: number;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const current = Math.round(from + (value - from) * eased);
            displayRef.current = current;
            setDisplay(current);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, duration, reduced]);

    return display;
}

'use client';

import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Route-level transition wrapper. Scoped deliberately to cross-route
 * navigation only (e.g. /home2 -> /build -> /order/[id]) — the internal
 * step/summary transitions within home2 and BariBaliBuilder already have
 * their own hand-tuned, gesture-coordinated animation logic that isn't
 * touched here to avoid regressing core interaction flows.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        // reducedMotion="user" makes every motion-driven animation in the app
        // (this transition, and any future use of the library) automatically
        // respect the OS prefers-reduced-motion setting — this is separate
        // from and complements the CSS-level !important override in
        // globals.css, which only catches plain CSS animation/transition,
        // not JS-driven motion library animations.
        <MotionConfig reducedMotion="user">
            {/* Deliberately short and opacity-only, and NOT mode="wait" (which
                would sequence exit-then-enter and add perceived navigation
                latency). Several pages already run their own, slower internal
                entrance fade (e.g. /build's 0.5s opacity/scale/blur reveal) —
                this only needs to smooth the outgoing page's exit, not
                compete with that. */}
            <AnimatePresence initial={false}>
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
}

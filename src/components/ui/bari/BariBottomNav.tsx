'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { House, Search, Star, ClipboardList, User, type LucideIcon } from 'lucide-react';

// href: null = not yet a real destination (no page to send them to).
// skipActive: "הזמנות" and "פרופיל" currently both resolve to /profile —
// there's no dedicated order-history view yet (tracked separately) — so
// only one of the two lights up as active to avoid two simultaneous pills.
const NAV_ITEMS: { href: string | null; Icon: LucideIcon; label: string; skipActive?: boolean }[] = [
    { href: '/home2', Icon: House, label: 'בית' },
    { href: null, Icon: Search, label: 'חיפוש' },
    { href: '/favorites', Icon: Star, label: 'מועדפים' },
    { href: '/profile', Icon: ClipboardList, label: 'הזמנות', skipActive: true },
    { href: '/profile', Icon: User, label: 'פרופיל' },
];

/**
 * Floating glassmorphic bottom dock. Self-contained — reads the active route
 * itself, so any page can drop this in with no props. Rendered under
 * PageTransition's <MotionConfig reducedMotion="user"> (see layout.tsx), so
 * the layoutId-driven sliding pill below already respects OS reduced-motion
 * with no extra gating here.
 */
export default function BariBottomNav() {
    const pathname = usePathname();
    const [ripple, setRipple] = useState<string | null>(null);

    return (
        <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '10px 20px max(28px, env(safe-area-inset-bottom))', animation: 'navIn 0.6s ease 0.2s both' }}>
            <style>{`
                @keyframes navIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
                @keyframes navRipple { 0%{transform:scale(0);opacity:0.5} 100%{transform:scale(1);opacity:0} }
                @keyframes navIconBounce { 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
            `}</style>
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(180deg, rgba(20,45,20,0.6), rgba(6,18,6,0.72))',
                    backdropFilter: 'blur(22px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.5)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    boxShadow: 'var(--shadow-card-glow), inset 0 0 0 2px rgba(240,200,50,0.12)',
                }}
            >
                {NAV_ITEMS.map(item => {
                    const active = !item.skipActive && pathname === item.href;
                    const content = (
                        <>
                            {/* Sliding active pill — layoutId makes motion animate it between items on route change */}
                            {active && (
                                <motion.div
                                    layoutId="nav-active-pill"
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(240,200,50,0.16)',
                                        boxShadow: '0 0 18px rgba(240,200,50,0.35)',
                                        zIndex: -1,
                                    }}
                                />
                            )}

                            {/* Tap ripple */}
                            {ripple === item.label && (
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    width: '48px', height: '48px',
                                    marginLeft: '-24px', marginTop: '-24px',
                                    borderRadius: '50%',
                                    background: 'rgba(240,200,50,0.25)',
                                    animation: 'navRipple 0.4s ease-out forwards',
                                    pointerEvents: 'none',
                                }} />
                            )}

                            <item.Icon
                                size={active ? 24 : 19}
                                color={active ? 'var(--color-gold-deep)' : '#fff'}
                                strokeWidth={2.3}
                                style={{
                                    filter: active ? 'drop-shadow(0 0 10px var(--color-gold-deep))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                                    animation: active ? 'navIconBounce 0.4s cubic-bezier(0.34,1.4,0.64,1)' : 'none',
                                    transition: 'width 0.25s ease, height 0.25s ease, filter 0.25s ease',
                                }}
                            />
                            <span style={{
                                fontSize: '11px', fontWeight: 700,
                                color: active ? 'var(--color-gold-deep)' : '#fff',
                                letterSpacing: '0.04em',
                                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                            }}>{item.label}</span>
                        </>
                    );
                    const itemStyle = {
                        position: 'relative' as const,
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, gap: '2px',
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        textDecoration: 'none',
                        cursor: item.href ? 'pointer' : 'default',
                        opacity: item.href ? 1 : 0.65,
                    };
                    const onTap = () => {
                        navigator.vibrate?.(8);
                        setRipple(item.label);
                        setTimeout(() => setRipple(null), 450);
                    };

                    return item.href ? (
                        <Link key={item.label} href={item.href} onClick={onTap} style={itemStyle}>
                            {content}
                        </Link>
                    ) : (
                        <div key={item.label} onClick={onTap} style={itemStyle}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

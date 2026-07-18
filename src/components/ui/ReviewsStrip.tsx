'use client';

import { useEffect, useRef, useState } from 'react';
import type { Review } from '@/app/api/reviews/route';

const INTERVAL = 4500;

function Stars({ n }: { n: number }) {
    return (
        <span style={{ color: '#f0c832', fontSize: '13px', letterSpacing: '1px', lineHeight: 1 }}>
            {'★'.repeat(n)}{'☆'.repeat(5 - n)}
        </span>
    );
}

export default function ReviewsStrip() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [idx, setIdx]         = useState(0);
    const [visible, setVisible] = useState(false);
    const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch once on mount
    useEffect(() => {
        fetch('/api/reviews')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d?.reviews?.length) {
                    setReviews(d.reviews);
                    setVisible(true);
                }
            })
            .catch(() => {});
    }, []);

    // Auto-cycle
    useEffect(() => {
        if (reviews.length < 2) return;
        timerRef.current = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIdx(i => (i + 1) % reviews.length);
                setVisible(true);
            }, 380);
        }, INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [reviews]);

    // Always render the fixed-size box so layout never shifts
    const r = reviews.length > 0 ? reviews[idx] : null;

    return (
        <div style={{
            position: 'relative', zIndex: 2,
            width: '100%', padding: '0 20px 10px',
            height: '96px', flexShrink: 0,
        }}>
            {r && (
                <div style={{
                    height: '100%',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(10,26,10,0.82), rgba(6,16,6,0.88))',
                    border: '1px solid rgba(240,200,50,0.14)',
                    backdropFilter: 'blur(12px)',
                    padding: '10px 14px',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.35s ease',
                    overflow: 'hidden',
                }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <Stars n={r.rating} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                                {r.author}
                            </span>
                            {r.time && (
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
                                    · {r.time}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Review text — fixed 2-line height */}
                    <p style={{
                        margin: 0,
                        fontSize: '12px', fontWeight: 500,
                        color: 'rgba(255,255,255,0.72)',
                        lineHeight: '18px',
                        height: '36px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        "{r.text}"
                    </p>

                    {/* Dot indicators */}
                    {reviews.length > 1 && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '2px' }}>
                            {reviews.slice(0, 6).map((_, i) => (
                                <div key={i}
                                    style={{
                                        width: i === idx ? '14px' : '5px', height: '5px', borderRadius: '3px',
                                        background: i === idx ? '#f0c832' : 'rgba(255,255,255,0.2)',
                                        transition: 'all 0.3s ease', cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        setVisible(false);
                                        setTimeout(() => { setIdx(i); setVisible(true); }, 350);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

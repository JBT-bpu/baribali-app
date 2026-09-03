'use client';

import { useEffect, useState } from 'react';
import type { Review } from '@/app/api/reviews/route';

type ReviewsResponse = {
    reviews?: unknown;
    source?: unknown;
};

function isHttpsUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;

    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

function isReview(value: unknown): value is Review {
    if (!value || typeof value !== 'object') return false;
    const review = value as Partial<Review>;
    return typeof review.author === 'string'
        && Boolean(review.author.trim())
        && isHttpsUrl(review.authorUri)
        && isHttpsUrl(review.authorPhotoUri)
        && typeof review.text === 'string'
        && Boolean(review.text.trim())
        && typeof review.time === 'string'
        && isHttpsUrl(review.reviewUri)
        && isHttpsUrl(review.reportUri)
        && typeof review.rating === 'number'
        && Number.isFinite(review.rating)
        && review.rating >= 1
        && review.rating <= 5;
}

function Stars({ n }: { n: number }) {
    const rating = Math.max(1, Math.min(5, Math.round(n)));
    return (
        <span role="img" aria-label={`דירוג ${rating} מתוך 5 כוכבים`}>
            <span aria-hidden="true" style={{ color: '#f0c832', fontSize: '13px', letterSpacing: '1px', lineHeight: 1 }}>
                {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </span>
        </span>
    );
}

const CARD_STYLE = {
    height: '100%',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(10,26,10,0.82), rgba(6,16,6,0.88))',
    border: '1px solid rgba(240,200,50,0.14)',
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
} as const;

export default function ReviewsStrip() {
    const [review, setReview] = useState<Review | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8_000);
        let active = true;

        fetch('/api/reviews', { cache: 'no-store', signal: controller.signal })
            .then(response => response.ok ? response.json() as Promise<ReviewsResponse> : null)
            .then(payload => {
                if (!active || payload?.source !== 'google' || !Array.isArray(payload.reviews)) return;
                const genuineReview = payload.reviews.find(isReview);
                if (genuineReview) setReview(genuineReview);
            })
            .catch(() => {})
            .finally(() => clearTimeout(timeoutId));

        return () => {
            active = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, []);

    return (
        <section
            aria-label={review ? 'ביקורת לקוח מ-Google Maps' : 'איך ההזמנה עובדת'}
            data-review-source={review ? 'google' : 'product'}
            style={{
                position: 'relative', zIndex: 2,
                width: '100%', padding: '0 16px 10px',
                height: '96px', flexShrink: 0,
            }}
        >
            {review ? (
                <article style={{ ...CARD_STYLE, padding: '7px 10px', display: 'grid', gridTemplateRows: '24px minmax(0, 1fr) 14px', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: '6px' }}>
                        <a
                            href={review.authorUri}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`הפרופיל של ${review.author} ב-Google Maps`}
                            style={{ flexShrink: 0, borderRadius: '50%' }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    display: 'block', width: '24px', height: '24px', borderRadius: '50%',
                                    background: `rgba(255,255,255,0.12) url(${review.authorPhotoUri}) center / cover no-repeat`,
                                }}
                            />
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                            <a
                                href={review.authorUri}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                            >
                                {review.author}
                            </a>
                            {review.time && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.48)', fontWeight: 500, whiteSpace: 'nowrap' }}>· {review.time}</span>}
                        </div>
                        <Stars n={review.rating} />
                    </div>
                    <a
                        href={review.reviewUri}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`פתיחת הביקורת של ${review.author} ב-Google Maps`}
                        style={{
                        margin: 0,
                        fontSize: '11px', fontWeight: 500,
                        color: 'rgba(255,255,255,0.76)',
                        lineHeight: '15px', height: '30px',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        textDecoration: 'none',
                    }}>
                        ״{review.text}״
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, lineHeight: 1 }}>
                        <a
                            href={review.reviewUri}
                            target="_blank"
                            rel="noreferrer"
                            translate="no"
                            lang="en"
                            style={{ color: '#fff', fontFamily: 'Roboto, sans-serif', fontSize: '12px', fontWeight: 400, whiteSpace: 'nowrap', textDecoration: 'none' }}
                        >
                            Google Maps
                        </a>
                        <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>מוצגת לפי רלוונטיות</span>
                        <a href={review.reportUri} target="_blank" rel="noreferrer" style={{ marginInlineStart: 'auto', color: 'rgba(255,255,255,0.62)', fontSize: '10px', whiteSpace: 'nowrap' }}>דיווח</a>
                    </div>
                </article>
            ) : (
                <div style={{ ...CARD_STYLE, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div aria-hidden="true" style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'rgba(240,200,50,0.1)', border: '1px solid rgba(240,200,50,0.22)', color: '#f0d060', fontSize: '18px' }}>₪</div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#f0d060', fontSize: '12px', fontWeight: 900, marginBottom: '3px' }}>המחיר מול העיניים</div>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', fontSize: '11.5px', fontWeight: 500, lineHeight: 1.45 }}>
                            בוחרים גודל ותוספות, ורואים את המחיר מתעדכן לפני שליחת ההזמנה.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

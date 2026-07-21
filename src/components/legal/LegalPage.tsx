import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared readable layout for the legal/content pages (privacy, terms).
 * Server-rendered static content — good for SEO and works with no JS.
 * Bracketed [PLACEHOLDER] tokens in the content are business-specific blanks
 * the owner must fill before these are relied upon.
 */
export default function LegalPage({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(155deg, #030a03 0%, #071a07 40%, #0a200a 70%, #071a07 100%)',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
            direction: 'rtl', color: 'rgba(255,255,255,0.85)',
            padding: '0 0 60px',
        }}>
            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px', paddingTop: 'max(32px, env(safe-area-inset-top))' }}>
                <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(200,168,78,0.85)', textDecoration: 'none' }}>
                    ← חזרה
                </Link>
                <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '20px 0 6px' }}>{title}</h1>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '28px' }}>
                    עודכן לאחרונה: {lastUpdated}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontSize: '15px', lineHeight: 1.8 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/** A titled section within a legal page. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <section>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-gold-light)', margin: '0 0 8px' }}>{heading}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'rgba(255,255,255,0.78)' }}>
                {children}
            </div>
        </section>
    );
}

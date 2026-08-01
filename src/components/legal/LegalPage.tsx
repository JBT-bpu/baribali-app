import Link from 'next/link';
import type { ReactNode } from 'react';

/** All legal/info documents, cross-linked from the footer of every page. */
export const LEGAL_PAGES: { href: string; label: string }[] = [
    { href: '/terms', label: 'תנאי שימוש' },
    { href: '/privacy', label: 'מדיניות פרטיות' },
    { href: '/cancellations', label: 'ביטולים והחזרים' },
    { href: '/allergens', label: 'אלרגנים' },
    { href: '/accessibility', label: 'נגישות' },
    { href: '/contact', label: 'יצירת קשר' },
];

/**
 * Shared readable layout for the legal/info pages. Server-rendered static
 * content — good for SEO, works with no JS. Bracketed [להשלים]/[לאימות] tokens
 * are business-specific fields the owner must verify before relying on these.
 */
export default function LegalPage({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) {
    return (
        <div style={{
            minHeight: '100dvh',
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

                {/* Cross-links to the other legal/info documents */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                    {LEGAL_PAGES.filter(p => p.label !== title).map(p => (
                        <Link key={p.href} href={p.href} style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(200,168,78,0.8)', textDecoration: 'none' }}>
                            {p.label}
                        </Link>
                    ))}
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

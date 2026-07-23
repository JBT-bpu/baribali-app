'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariPanel, BariBadge, BariButton } from '@/components/ui/bari';
import { useUser, getAccessToken } from '@/lib/auth';
import { buildReorderHref, stashReorder, type ReorderMode } from '@/lib/reorder';

interface HistoryOrder {
    id: string;
    order_num: string;
    items: { id: string; he: string; icon: string; price: number }[];
    total: number;
    size: string | null;
    pickup_time: string | null;
    status: string;
    payment_status: string;
    created_at: string;
}

const STATUS_HE: Record<string, string> = {
    waiting: 'התקבלה', preparing: 'בהכנה', ready: 'מוכן', collected: 'נאסף',
};

const bg: React.CSSProperties = {
    minHeight: '100vh',
    background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    direction: 'rtl', position: 'relative', overflow: 'hidden',
};

export default function OrdersPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const [orders, setOrders] = useState<HistoryOrder[] | null>(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        getAccessToken().then(token => {
            if (!token || cancelled) return;
            fetch('/api/my/orders', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : [])
                .then(data => { if (!cancelled) setOrders(data as HistoryOrder[]); })
                .catch(() => { if (!cancelled) setOrders([]); });
        });
        return () => { cancelled = true; };
    }, [user]);

    // Reorder — stash the item set and send the builder to reconstruct it.
    // 'same' jumps to the summary; 'edit' opens the builder to change things.
    const startReorder = useCallback((order: HistoryOrder, mode: ReorderMode) => {
        stashReorder(order.items.map(i => i.id), mode);
        router.push(buildReorderHref(order));
    }, [router]);

    if (loading) {
        return <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: 600 }}>טוען…</span>
        </div>;
    }

    // History requires an account — guests have none by definition.
    if (!user) {
        return (
            <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '20px' }}>
                <ParticleCanvas intensity="medium" />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', width: '100%' }}>
                    <div style={{ fontSize: '48px' }}>📋</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>ההזמנות שלי</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.7 }}>
                        התחברו כדי לראות את היסטוריית ההזמנות ולהזמין שוב בלחיצה.
                        <br />להזמין אפשר תמיד גם בלי חשבון.
                    </div>
                    <GoogleSignInButton fullWidth />
                    <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← חזרה לדף הבית</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...bg, padding: '0 0 60px' }}>
            <ParticleCanvas intensity="medium" />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '430px', margin: '0 auto', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 ההזמנות שלי
                </div>

                {orders === null && (
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: 'center', padding: '24px 0' }}>טוען הזמנות…</div>
                )}
                {orders?.length === 0 && (
                    <BariPanel className="p-5" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥗</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>עדיין אין הזמנות</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>ההזמנה הבאה שלכם תופיע כאן</div>
                        <Link href="/home2" style={{ display: 'inline-block', marginTop: '14px', fontSize: '14px', fontWeight: 800, color: 'var(--color-gold-light)', textDecoration: 'none' }}>
                            להזמנה חדשה ←
                        </Link>
                    </BariPanel>
                )}
                {orders?.map(o => (
                    <BariPanel key={o.id} className="p-3.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Tap the order body to view its live status */}
                        <div
                            onClick={() => router.push(`/order/${o.id}`)}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BariBadge>{o.order_num}</BariBadge>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                                    {STATUS_HE[o.status] ?? o.status}
                                </span>
                                <span style={{ marginRight: 'auto', fontSize: '15px', fontWeight: 900, color: 'var(--color-gold-light)' }}>₪{o.total}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                                {o.items.slice(0, 8).map(it => (
                                    <span key={it.id} style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>
                                        {it.icon && it.icon.startsWith('/')
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={it.icon} alt={it.he} style={{ width: '20px', height: '20px', objectFit: 'contain', verticalAlign: 'middle' }} />
                                            : it.icon}
                                    </span>
                                ))}
                                {o.items.length > 8 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>+{o.items.length - 8}</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {new Date(o.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                                {o.pickup_time ? ` · איסוף ${o.pickup_time}` : ''}
                            </div>
                        </div>

                        {/* Reorder actions — the concrete payoff of having history */}
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
                            <BariButton variant="primary" size="sm" style={{ flex: 1 }} onClick={() => startReorder(o, 'same')}>
                                הזמן שוב
                            </BariButton>
                            <BariButton variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => startReorder(o, 'edit')}>
                                שנה והזמן
                            </BariButton>
                        </div>
                    </BariPanel>
                ))}

                <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center', marginTop: '8px' }}>
                    ← חזרה לדף הבית
                </Link>
            </div>
        </div>
    );
}

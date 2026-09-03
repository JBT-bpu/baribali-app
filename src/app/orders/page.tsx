'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoldField from '@/components/ui/GoldField';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariPanel, BariBadge, BariBottomNav, BariButton } from '@/components/ui/bari';
import { useUser, getAccessToken } from '@/lib/auth';
import {
    buildReorderHref,
    detectOrderType,
    isOrderReorderable,
    stashReorder,
    type ReorderMode,
} from '@/lib/reorder';

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
    minHeight: '100dvh',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(1,8,1,0.68) 55%, rgba(2,10,2,0.88) 100%), url(/homepage-assets/BG_8K.webp) center top / cover no-repeat',
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    direction: 'rtl', position: 'relative', overflow: 'hidden',
};

export default function OrdersPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const [orders, setOrders] = useState<HistoryOrder[] | null>(null);
    // A failed load must not look like "you have no orders" — and must not leave
    // the page spinning forever if the access token never arrives.
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        getAccessToken()
            .then(token => {
                if (cancelled) return;
                if (!token) { setLoadError(true); setOrders([]); return; }
                return fetch('/api/my/orders', { headers: { Authorization: `Bearer ${token}` } })
                    .then(async r => {
                        if (cancelled) return;
                        if (!r.ok) { setLoadError(true); setOrders([]); return; }
                        const data = await r.json();
                        setOrders(Array.isArray(data) ? data as HistoryOrder[] : []);
                    });
            })
            .catch(() => { if (!cancelled) { setLoadError(true); setOrders([]); } });
        return () => { cancelled = true; };
    }, [user, reloadKey]);

    // Reorder — stash the item set and send the builder to reconstruct it.
    // 'same' jumps to the summary; 'edit' opens the builder to change things.
    const startReorder = useCallback((order: HistoryOrder, mode: ReorderMode) => {
        const product = detectOrderType(order.size);
        if (!product || !isOrderReorderable(order)) return;
        stashReorder(order.items.map(i => i.id), mode, product);
        router.push(buildReorderHref(order));
    }, [router]);

    if (loading) {
        return <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '14px', fontWeight: 600 }}>טוען…</span>
            <BariBottomNav />
        </div>;
    }

    // History requires an account — guests have none by definition.
    if (!user) {
        return (
            <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '20px', paddingBottom: 'calc(106px + env(safe-area-inset-bottom))' }}>
                <GoldField zIndex={0} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', width: '100%' }}>
                    <div style={{ fontSize: '48px' }}>📋</div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#fff' }}>ההזמנות שלי</h1>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.74)', textAlign: 'center', lineHeight: 1.7 }}>
                        התחברו כדי לראות את היסטוריית ההזמנות ולהזמין שוב בלחיצה.
                        <br />להזמין אפשר תמיד גם בלי חשבון.
                    </div>
                    <GoogleSignInButton fullWidth />
                </div>
                <BariBottomNav />
            </div>
        );
    }

    return (
        <div style={{ ...bg, padding: '0 0 calc(106px + env(safe-area-inset-bottom))' }}>
            <GoldField zIndex={0} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '430px', margin: '0 auto', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 ההזמנות שלי
                </h1>

                {orders === null && (
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: 'center', padding: '24px 0' }}>טוען הזמנות…</div>
                )}
                {/* Couldn't load — distinct from "no orders", which would tell a
                    returning customer their history had vanished. */}
                {loadError && orders?.length === 0 && (
                    <BariPanel className="p-5" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>לא הצלחנו לטעון את ההזמנות</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>ההיסטוריה שלכם שמורה — נסו שוב</div>
                        <BariButton variant="secondary" size="sm" style={{ marginTop: '14px' }} onClick={() => { setLoadError(false); setOrders(null); setReloadKey(k => k + 1); }}>
                            נסו שוב
                        </BariButton>
                    </BariPanel>
                )}
                {!loadError && orders?.length === 0 && (
                    <BariPanel className="p-5" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥗</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>עדיין אין הזמנות</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>ההזמנה הבאה שלכם תופיע כאן</div>
                        <Link href="/home2" style={{ display: 'inline-block', marginTop: '14px', fontSize: '14px', fontWeight: 800, color: 'var(--color-gold-light)', textDecoration: 'none' }}>
                            להזמנה חדשה ←
                        </Link>
                    </BariPanel>
                )}
                {orders?.map(o => {
                    const reorderable = isOrderReorderable(o);
                    return (
                        <BariPanel key={o.id} className="p-3.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* The order body is a real link so touch, keyboard and
                            assistive-technology users reach the same live status. */}
                        <Link
                            href={`/order/${encodeURIComponent(o.id)}`}
                            aria-label={`צפייה במעקב של הזמנה ${o.order_num}`}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
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
                                            ? <img src={it.icon} alt={it.he} style={{ width: '20px', height: '20px', objectFit: 'contain', verticalAlign: 'middle' }} />
                                            : it.icon}
                                    </span>
                                ))}
                                {o.items.length > 8 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>+{o.items.length - 8}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                <span>
                                    {new Date(o.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                                    {o.pickup_time ? ` · איסוף ${o.pickup_time}` : ''}
                                </span>
                                <span style={{ marginRight: 'auto', color: 'rgba(240,208,96,0.78)', fontWeight: 800 }}>למעקב ←</span>
                            </div>
                        </Link>

                        {/* Reorder actions — the concrete payoff of having history */}
                        {reorderable ? (
                            <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
                                <BariButton variant="primary" size="sm" style={{ flex: 1 }} onClick={() => startReorder(o, 'same')}>
                                    הזמן שוב
                                </BariButton>
                                <BariButton variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => startReorder(o, 'edit')}>
                                    שנה והזמן
                                </BariButton>
                            </div>
                        ) : (
                            <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(240,208,96,0.08)', color: 'rgba(255,248,220,0.68)', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                                המנה הזו אינה זמינה כרגע להזמנה חוזרת
                            </div>
                        )}
                        </BariPanel>
                    );
                })}

            </div>
            <BariBottomNav />
        </div>
    );
}

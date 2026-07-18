'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariPanel, BariBadge, BariButton } from '@/components/ui/bari';
import { useUser, signOut, displayName, avatarUrl, getAccessToken } from '@/lib/auth';

interface HistoryOrder {
    id: string;
    order_num: string;
    items: { id: string; he: string; icon: string; price: number }[];
    total: number;
    pickup_time: string | null;
    status: string;
    payment_status: string;
    created_at: string;
}

const STATUS_HE: Record<string, string> = {
    waiting: 'התקבלה', preparing: 'בהכנה', ready: 'מוכן', collected: 'נאסף',
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const [orders, setOrders] = useState<HistoryOrder[] | null>(null);

    // Order history — the concrete benefit of having an account.
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

    const bg: React.CSSProperties = {
        minHeight: '100vh',
        background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
        direction: 'rtl', position: 'relative', overflow: 'hidden',
    };

    if (loading) {
        return <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: 600 }}>טוען…</span>
        </div>;
    }

    if (!user) {
        return (
            <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '20px' }}>
                <ParticleCanvas intensity="medium" />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', width: '100%' }}>
                    <div style={{ fontSize: '48px' }}>👤</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>עדיין לא מחוברים</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.7 }}>
                        התחברו כדי לראות את היסטוריית ההזמנות שלכם.
                        <br />להזמין אפשר תמיד גם בלי חשבון.
                    </div>
                    <GoogleSignInButton fullWidth />
                    <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← חזרה לדף הבית</Link>
                </div>
            </div>
        );
    }

    const avatar = avatarUrl(user);

    return (
        <div style={{ ...bg, padding: '0 0 60px' }}>
            <ParticleCanvas intensity="medium" />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '430px', margin: '0 auto', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Identity card */}
                <BariPanel className="p-4" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid rgba(200,168,78,0.5)' }} />
                        : <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,168,78,0.2)', border: '2px solid rgba(200,168,78,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👤</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(user)}</div>
                        {user.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>}
                    </div>
                    <BariButton variant="ghost" size="sm" onClick={async () => { await signOut(); router.push('/home2'); }}>
                        התנתקות
                    </BariButton>
                </BariPanel>

                {/* Order history */}
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(200,168,78,0.8)', letterSpacing: '0.05em', marginTop: '4px' }}>
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
                    </BariPanel>
                )}
                {orders?.map(o => (
                    <Link key={o.id} href={`/order/${o.id}`} style={{ textDecoration: 'none' }}>
                        <BariPanel className="p-3.5" style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
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
                        </BariPanel>
                    </Link>
                ))}

                <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center', marginTop: '8px' }}>
                    ← חזרה לדף הבית
                </Link>
            </div>
        </div>
    );
}

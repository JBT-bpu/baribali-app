'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'collected';

interface Order {
    id: string;
    order_num: string;
    items: { id: string; he: string; icon: string; price: number }[];
    total: number;
    pickup_time: string | null;
    notes: string | null;
    status: OrderStatus;
    created_at: string;
}

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'waiting',   label: 'התקבלה',  icon: '📋' },
    { key: 'preparing', label: 'בהכנה',   icon: '👨‍🍳' },
    { key: 'ready',     label: 'מוכן!',   icon: '✅' },
    { key: 'collected', label: 'נאסף',    icon: '🎉' },
];

export default function OrderStatusPage({ params }: { params: { id: string } }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        // Initial load
        supabase
            .from('orders')
            .select('*')
            .eq('id', params.id)
            .single()
            .then(({ data, error }) => {
                if (error || !data) setNotFound(true);
                else setOrder(data as Order);
            });

        // Realtime subscription
        const channel = supabase
            .channel(`order-${params.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${params.id}`,
            }, payload => {
                setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<Order>) } : null);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [params.id]);

    if (notFound) return <NotFound />;
    if (!order) return <Loading />;

    const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
    const isReady = order.status === 'ready';

    return (
        <div style={P.root}>
            <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
            <div style={P.bg} />

            <div style={P.content}>
                {/* Header */}
                <div style={P.logo}>🥗 BariBali</div>
                <div style={P.orderNum}>{order.order_num}</div>

                {/* Status ring */}
                <div style={{ ...P.ring, ...(isReady ? P.ringReady : {}) }}>
                    <div style={P.ringIcon}>{STATUS_STEPS[currentStep]?.icon ?? '📋'}</div>
                </div>

                <div style={{ ...P.statusLabel, ...(isReady ? { color: '#4caf50', fontSize: '28px' } : {}) }}>
                    {STATUS_STEPS[currentStep]?.label}
                </div>

                {order.pickup_time && (
                    <div style={P.pickupTime}>
                        ⏰ זמן איסוף: <strong>{order.pickup_time}</strong>
                    </div>
                )}

                {/* Progress bar */}
                <div style={P.stepsRow}>
                    {STATUS_STEPS.slice(0, 3).map((step, i) => (
                        <div key={step.key} style={P.stepWrap}>
                            <div style={{
                                ...P.stepDot,
                                ...(i <= currentStep ? P.stepDotDone : {}),
                                ...(i === currentStep ? P.stepDotActive : {}),
                            }}>
                                {i < currentStep ? '✓' : step.icon}
                            </div>
                            <div style={{ ...P.stepLabel, ...(i === currentStep ? { color: '#fff', fontWeight: 800 } : {}) }}>
                                {step.label}
                            </div>
                            {i < 2 && <div style={{ ...P.stepLine, ...(i < currentStep ? P.stepLineDone : {}) }} />}
                        </div>
                    ))}
                </div>

                {/* Items */}
                <div style={P.itemsCard}>
                    <div style={P.itemsTitle}>הסלט שלכם</div>
                    <div style={P.itemsRow}>
                        {order.items.map(it => (
                            <span key={it.id} style={P.itemChip} title={it.he}>{it.icon}</span>
                        ))}
                    </div>
                    <div style={P.itemNames}>{order.items.map(i => i.he).join(' · ')}</div>
                    {order.notes && <div style={P.notes}>📝 {order.notes}</div>}
                    <div style={P.total}>₪{order.total}</div>
                </div>

                <div style={P.footer}>מתרענן אוטומטית · לא צריך לרענן</div>
            </div>

            <style>{`
                @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(76,175,80,0.4)} 50%{box-shadow:0 0 0 16px rgba(76,175,80,0)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
        </div>
    );
}

function Loading() {
    return (
        <div style={{ ...P.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', fontFamily: "'Heebo',sans-serif" }}>טוען הזמנה...</div>
        </div>
    );
}

function NotFound() {
    return (
        <div style={{ ...P.root, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>🤔</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontFamily: "'Heebo',sans-serif" }}>ההזמנה לא נמצאה</div>
        </div>
    );
}

const P: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', background: 'linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)', fontFamily: "'Heebo',sans-serif", direction: 'rtl', color: '#fff' },
    bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(200,168,78,0.06) 0%, transparent 70%)', pointerEvents: 'none' },
    content: { position: 'relative', zIndex: 1, maxWidth: '420px', margin: '0 auto', padding: '32px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },

    logo: { fontSize: '18px', fontWeight: 900, color: '#f0d060', letterSpacing: '0.04em', animation: 'fadeUp 0.4s ease both' },
    orderNum: { fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.08em', animation: 'fadeUp 0.4s ease 0.05s both' },

    ring: { width: '100px', height: '100px', borderRadius: '50%', border: '3px solid rgba(200,168,78,0.5)', background: 'rgba(200,168,78,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', transition: 'all 0.4s ease', animation: 'fadeUp 0.4s ease 0.1s both' },
    ringReady: { border: '3px solid #4caf50', background: 'rgba(76,175,80,0.12)', animation: 'fadeUp 0.4s ease 0.1s both, pulse 1.5s ease-in-out 0.5s 3' },
    ringIcon: { fontSize: '42px', lineHeight: 1 },

    statusLabel: { fontSize: '22px', fontWeight: 900, color: '#fff', animation: 'fadeUp 0.4s ease 0.15s both' },
    pickupTime: { fontSize: '14px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, animation: 'fadeUp 0.4s ease 0.2s both' },

    stepsRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', position: 'relative', marginTop: '8px', animation: 'fadeUp 0.4s ease 0.25s both' },
    stepWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, position: 'relative' },
    stepDot: { width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.3s ease' },
    stepDotDone: { background: 'rgba(200,168,78,0.2)', border: '2px solid rgba(200,168,78,0.6)', color: '#f0d060' },
    stepDotActive: { background: 'rgba(200,168,78,0.25)', border: '2px solid #f0d060', boxShadow: '0 0 16px rgba(200,168,78,0.3)' },
    stepLabel: { fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const },
    stepLine: { position: 'absolute', top: '18px', right: '-50%', width: '100%', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: -1 },
    stepLineDone: { background: 'rgba(200,168,78,0.5)' },

    itemsCard: { width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeUp 0.4s ease 0.3s both' },
    itemsTitle: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '10px', letterSpacing: '0.06em' },
    itemsRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '24px', marginBottom: '8px' },
    itemChip: { lineHeight: 1.2 },
    itemNames: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
    notes: { fontSize: '12px', color: 'rgba(255,200,100,0.7)', marginTop: '8px', fontWeight: 600 },
    total: { fontSize: '20px', fontWeight: 900, color: '#f0d060', marginTop: '12px', textAlign: 'right' as const },

    footer: { fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: '8px' },
};

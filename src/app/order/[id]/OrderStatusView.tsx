'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import { fireGoldConfetti } from '@/lib/confetti';

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

/* ── Celebration Sound (Web Audio API) ── */
function playCelebrationChime() {
    try {
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gain1 = ac.createGain();
        gain1.gain.setValueAtTime(0.18, ac.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
        gain1.connect(ac.destination);
        const osc1 = ac.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523, ac.currentTime); // C5
        osc1.connect(gain1);
        osc1.start(ac.currentTime);
        osc1.stop(ac.currentTime + 0.15);

        const gain2 = ac.createGain();
        gain2.gain.setValueAtTime(0.18, ac.currentTime + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.38);
        gain2.connect(ac.destination);
        const osc2 = ac.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659, ac.currentTime + 0.18); // E5
        osc2.connect(gain2);
        osc2.start(ac.currentTime + 0.18);
        osc2.stop(ac.currentTime + 0.38);

        // cleanup
        setTimeout(() => ac.close(), 500);
    } catch {
        // Audio not supported — silently ignore
    }
}

/* ── Haptic Vibration ── */
function fireHaptic() {
    try {
        navigator.vibrate?.([100, 50, 100, 50, 200]);
    } catch {
        // Not supported
    }
}

/* ── Countdown Hook ── */
function useCountdown(pickupTime: string | null) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!pickupTime) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [pickupTime]);

    if (!pickupTime) return null;

    // Parse pickup_time. It may be "HH:MM" or a full datetime string.
    let target: Date;
    if (/^\d{1,2}:\d{2}$/.test(pickupTime)) {
        const [h, m] = pickupTime.split(':').map(Number);
        target = new Date();
        target.setHours(h, m, 0, 0);
        // If the time already passed today, assume it's today (already past)
    } else {
        target = new Date(pickupTime);
    }

    const diffMs = target.getTime() - now;

    if (diffMs <= 0) {
        return { text: 'עכשיו!', urgent: false, arrived: true, diffMs: 0 };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const text = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')} נותרו`;
    const urgent = totalSec < 120;

    return { text, urgent, arrived: false, diffMs };
}

export default function OrderStatusView({ id }: { id: string }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [notFound, setNotFound] = useState(false);
    const prevStatusRef = useRef<OrderStatus | null>(null);
    const [ringScale, setRingScale] = useState(false);
    const [labelSlide, setLabelSlide] = useState(false);

    const countdown = useCountdown(order?.pickup_time ?? null);

    // Celebration trigger
    const triggerCelebration = useCallback(() => {
        fireGoldConfetti();
        fireHaptic();
        playCelebrationChime();
    }, []);

    // Ring scale-up animation trigger
    const triggerRingPop = useCallback(() => {
        setRingScale(true);
        setLabelSlide(true);
        setTimeout(() => setRingScale(false), 400);
        setTimeout(() => setLabelSlide(false), 500);
    }, []);

    useEffect(() => {
        // Polling replaces the old Realtime subscription, since anon-client
        // Realtime access relied on the RLS policies that are now locked down.
        // The order's UUID id acts as the capability token — no extra secret
        // needed to read it via /api/orders/[id].
        let cancelled = false;
        let initial = true;

        const load = () => {
            fetch(`/api/orders/${id}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (cancelled) return;
                    if (!data) {
                        if (initial) setNotFound(true);
                        return;
                    }
                    const d = data as Order;
                    setOrder(d);
                    if (prevStatusRef.current === null) prevStatusRef.current = d.status;
                })
                .catch(() => { if (!cancelled && initial) setNotFound(true); })
                .finally(() => { initial = false; });
        };

        load();
        const interval = setInterval(load, 4000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [id]);

    // Track status changes and fire effects
    useEffect(() => {
        if (!order) return;
        const prev = prevStatusRef.current;
        if (prev !== null && prev !== order.status) {
            // Status changed
            triggerRingPop();
            if (order.status === 'ready') {
                triggerCelebration();
            }
        }
        prevStatusRef.current = order.status;
    }, [order?.status, triggerCelebration, triggerRingPop, order]);

    if (notFound) return <NotFound />;
    if (!order) return <Loading />;

    const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
    const isReady = order.status === 'ready';

    const ringStyle: React.CSSProperties = {
        ...P.ring,
        ...(isReady ? P.ringReady : {}),
        ...(ringScale ? { transform: 'scale(1.15)', transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' } : { transform: 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' }),
    };

    const labelStyle: React.CSSProperties = {
        ...P.statusLabel,
        ...(isReady ? { color: '#4caf50', fontSize: '28px' } : {}),
        ...(labelSlide
            ? { animation: 'statusSlideIn 0.45s ease both' }
            : {}),
    };

    return (
        <div style={P.root}>
            <div style={P.bg} />
            <ParticleCanvas intensity="medium" />

            <div style={P.content}>
                {/* Header */}
                <div style={P.logo}>🥗 BariBali</div>
                <div style={P.orderNum}>{order.order_num}</div>

                {/* Status ring */}
                <div style={ringStyle}>
                    <div style={P.ringIcon}>{STATUS_STEPS[currentStep]?.icon ?? '📋'}</div>
                </div>

                <div style={labelStyle}>
                    {STATUS_STEPS[currentStep]?.label}
                </div>

                {/* Countdown */}
                {order.pickup_time && countdown && (
                    <div style={{
                        ...P.pickupTime,
                        ...(countdown.arrived ? P.countdownArrived : {}),
                        ...(countdown.urgent && !countdown.arrived ? P.countdownUrgent : {}),
                    }}>
                        {countdown.arrived ? (
                            <span style={P.countdownNow}>עכשיו!</span>
                        ) : (
                            <>⏰ {countdown.text}</>
                        )}
                    </div>
                )}

                {/* Static pickup time when no countdown active */}
                {order.pickup_time && !countdown && (
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
                            <span key={it.id} style={P.itemChip} title={it.he}>
                                {it.icon && it.icon.startsWith('/')
                                    ? <img src={it.icon} alt={it.he} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                    : it.icon}
                            </span>
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
                @keyframes statusSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmerMove { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes shimmerPulse { 0%,100%{opacity:0.4} 50%{opacity:0.15} }
                @keyframes countdownPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.04)} }
                @keyframes countdownGlow { 0%,100%{text-shadow:0 0 8px rgba(76,175,80,0.6)} 50%{text-shadow:0 0 20px rgba(76,175,80,0.9)} }
            `}</style>
        </div>
    );
}

/* ── Shimmer Loading State ── */
function Loading() {
    return (
        <div style={{ ...P.root, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={P.shimmerWrap}>
                {/* Circle placeholder for status ring */}
                <div style={P.shimmerCircle} />

                {/* Shimmer text bars */}
                <div style={{ ...P.shimmerBar, width: '140px' }} />
                <div style={{ ...P.shimmerBar, width: '100px' }} />
                <div style={{ ...P.shimmerBar, width: '180px' }} />
            </div>

            <style>{`
                @keyframes shimmerMove { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes shimmerPulse { 0%,100%{opacity:0.4} 50%{opacity:0.15} }
            `}</style>
        </div>
    );
}

function NotFound() {
    return (
        <div style={{ ...P.root, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>🤔</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>ההזמנה לא נמצאה</div>
            <Link href="/" style={{
                marginTop: '8px', padding: '12px 32px', borderRadius: '50px', textDecoration: 'none',
                background: 'linear-gradient(135deg,#c8a832 0%,#f0d060 45%,#ffe066 55%,#c8a832 100%)',
                color: '#0d2e0d', fontSize: '15px', fontWeight: 900,
                fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                boxShadow: '0 4px 20px rgba(200,168,78,0.4)',
            }}>חזרה לדף הבית</Link>
        </div>
    );
}

const shimmerGradient = 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%)';

const P: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)', fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl', color: '#fff' },
    bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(200,168,78,0.06) 0%, transparent 70%)', pointerEvents: 'none' },
    content: { position: 'relative', zIndex: 1, maxWidth: '420px', margin: '0 auto', padding: '32px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },

    logo: { fontSize: '18px', fontWeight: 900, color: '#f0d060', letterSpacing: '0.04em', animation: 'fadeUp 0.4s ease both' },
    orderNum: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.08em', animation: 'fadeUp 0.4s ease 0.05s both' },

    ring: { width: '100px', height: '100px', borderRadius: '50%', border: '3px solid rgba(200,168,78,0.5)', background: 'rgba(200,168,78,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', transition: 'all 0.4s ease', animation: 'fadeUp 0.4s ease 0.1s both' },
    ringReady: { border: '3px solid #4caf50', background: 'rgba(76,175,80,0.12)', animation: 'fadeUp 0.4s ease 0.1s both, pulse 1.5s ease-in-out 0.5s 3' },
    ringIcon: { fontSize: '42px', lineHeight: 1 },

    statusLabel: { fontSize: '22px', fontWeight: 900, color: '#fff', animation: 'fadeUp 0.4s ease 0.15s both' },
    pickupTime: { fontSize: '14px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, animation: 'fadeUp 0.4s ease 0.2s both' },

    countdownUrgent: { color: '#f0d060', fontWeight: 800, fontSize: '16px', animation: 'countdownPulse 1s ease-in-out infinite' },
    countdownArrived: { color: '#4caf50', fontWeight: 900, fontSize: '18px', animation: 'countdownGlow 1.5s ease-in-out infinite' },
    countdownNow: { textShadow: '0 0 12px rgba(76,175,80,0.7)' },

    stepsRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', position: 'relative', marginTop: '8px', animation: 'fadeUp 0.4s ease 0.25s both' },
    stepWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, position: 'relative' },
    stepDot: { width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.3s ease' },
    stepDotDone: { background: 'rgba(200,168,78,0.2)', border: '2px solid rgba(200,168,78,0.6)', color: '#f0d060' },
    stepDotActive: { background: 'rgba(200,168,78,0.25)', border: '2px solid #f0d060', boxShadow: '0 0 16px rgba(200,168,78,0.3)' },
    stepLabel: { fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center' as const },
    stepLine: { position: 'absolute', top: '18px', right: '-50%', width: '100%', height: '2px', background: 'rgba(255,255,255,0.28)', zIndex: -1 },
    stepLineDone: { background: 'rgba(200,168,78,0.5)' },

    itemsCard: { width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeUp 0.4s ease 0.3s both' },
    itemsTitle: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '10px', letterSpacing: '0.06em' },
    itemsRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '24px', marginBottom: '8px' },
    itemChip: { lineHeight: 1.2 },
    itemNames: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
    notes: { fontSize: '12px', color: 'rgba(255,200,100,0.7)', marginTop: '8px', fontWeight: 600 },
    total: { fontSize: '20px', fontWeight: 900, color: '#f0d060', marginTop: '12px', textAlign: 'right' as const },

    footer: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '8px' },

    /* Shimmer loading */
    shimmerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
    shimmerCircle: {
        width: '100px', height: '100px', borderRadius: '50%',
        background: shimmerGradient,
        backgroundSize: '200% 100%',
        animation: 'shimmerMove 0.85s linear infinite, shimmerPulse 1.4s ease-in-out infinite',
    },
    shimmerBar: {
        height: '14px', borderRadius: '7px',
        background: shimmerGradient,
        backgroundSize: '200% 100%',
        animation: 'shimmerMove 0.85s linear infinite',
    },
};

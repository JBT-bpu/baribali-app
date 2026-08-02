'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import BariBadge from '@/components/ui/bari/BariBadge';
import BariPlaque from '@/components/ui/bari/BariPlaque';
import { PLAQUE } from '@/components/ui/bari/plaqueGeometry';
import { fireGoldConfetti } from '@/lib/confetti';
import { orderSizeLabel } from '@/lib/reorder';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/**
 * The status ring's footprint on the pedestal, as a fraction of the plaque's
 * width. Not the cat's 0.66 — that would be a bordered circle around a 42px
 * glyph, mostly empty. 0.33 gives 98–124px across a 320–430 viewport, sitting
 * right around the old fixed 100px but scaling with the frame; it also puts the
 * glyph back at ~0.42 of the ring's diameter, the proportion the fixed 100px /
 * 42px pair had.
 */
const RING_WIDTH = 0.33;

type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'collected';

interface Order {
    id: string;
    order_num: string;
    items: { id: string; he: string; icon: string; price: number }[];
    total: number;
    size?: string | null;
    pickup_time: string | null;
    notes: string | null;
    status: OrderStatus;
    payment_status?: string;
    created_at: string;
}

/** What the customer needs to know about money, in their own terms. */
function paymentLabel(payment: string | undefined): { text: string; owed: boolean } | null {
    switch (payment) {
        case 'paid':
        case 'paid_unverified': return { text: 'שולם ✓', owed: false };
        case 'pay_at_pickup':   return { text: 'לתשלום באיסוף', owed: true };
        case 'pending':         return { text: 'ממתין לתשלום', owed: true };
        case 'failed':          return { text: 'התשלום נכשל — שלמו באיסוף', owed: true };
        default:                return null;
    }
}

// `sub` is the one line that says what to DO. The "ready" state in particular
// used to be a green tick and a cat, with nothing telling the customer to come
// to the counter or that the order number is what identifies them there.
const STATUS_STEPS: { key: OrderStatus; label: string; icon: string; sub: string }[] = [
    { key: 'waiting',   label: 'התקבלה',  icon: '📋',   sub: 'ההזמנה שלכם התקבלה במטבח' },
    { key: 'preparing', label: 'בהכנה',   icon: '👨‍🍳', sub: 'מכינים את הסלט שלכם עכשיו' },
    { key: 'ready',     label: 'מוכן!',   icon: '✅',   sub: 'גשו לדלפק ואמרו את מספר ההזמנה' },
    { key: 'collected', label: 'נאסף',    icon: '🎉',   sub: 'בתיאבון! נשמח לראותכם שוב' },
];

/* ── Celebration Sound (Web Audio API) ── */
function playCelebrationChime() {
    let ac: AudioContext | undefined;
    try {
        ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Arriving here from a payment redirect means no user gesture on this
        // page yet, so the context starts suspended and would produce silence.
        // Close it rather than leave one parked — browsers cap them at ~6.
        if (ac.state === 'suspended') { ac.close().catch(() => {}); return; }
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
        setTimeout(() => ac?.close().catch(() => {}), 500);
    } catch {
        // Audio not supported — silently ignore
        try { ac?.close(); } catch { /* already gone */ }
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

/**
 * Resolves a stored pickup_time to a Date. In practice it is always "HH:MM"
 * (the slot ids the picker produces, and what the schema documents), but the
 * full-datetime branch is kept — and an unparseable value now returns null
 * rather than an Invalid Date, which used to render a "NaN:NaN" countdown.
 */
function pickupTarget(pickupTime: string | null): Date | null {
    if (!pickupTime) return null;
    if (/^\d{1,2}:\d{2}$/.test(pickupTime)) {
        const [h, m] = pickupTime.split(':').map(Number);
        if (h > 23 || m > 59) return null;
        const t = new Date();
        t.setHours(h, m, 0, 0);
        return t;
    }
    const t = new Date(pickupTime);
    return Number.isNaN(t.getTime()) ? null : t;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/* ── Countdown Hook ── */
function useCountdown(pickupTime: string | null, frozen: boolean) {
    const target = useMemo(() => pickupTarget(pickupTime), [pickupTime]);
    // Lazy initialiser: Date.now() as a bare argument re-evaluates on every
    // render (and is an impure call during render).
    const [now, setNow] = useState(() => Date.now());

    // Only tick while there is something left to count down. Once the slot has
    // arrived the readout is a static "now", and once the order is collected
    // nothing about it can change again — either way a 1Hz re-render loop runs
    // on a phone that is by then back in someone's pocket.
    const ticking = !!target && !frozen && target.getTime() > now;

    useEffect(() => {
        if (!ticking) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [ticking]);

    if (!target) return null;

    // The clock time is the thing the customer actually planned around, and
    // until now it appeared nowhere on this page: the only branch that rendered
    // it was unreachable, because this hook returns null solely when there is
    // no pickup time at all.
    const clock = hhmm(target);
    const diffMs = target.getTime() - now;

    if (diffMs <= 0) return { clock, text: 'עכשיו!', urgent: false, arrived: true };

    const totalSec = Math.floor(diffMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const text = `עוד ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    return { clock, text, urgent: totalSec < 120, arrived: false };
}

export default function OrderStatusView({ id }: { id: string }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [notFound, setNotFound] = useState(false);
    // Set while we can't reach the API. Distinct from `notFound`, which now
    // means only that the server said 404.
    const [offline, setOffline] = useState(false);
    const [settled, setSettled] = useState(false); // polling stopped for good
    const prevStatusRef = useRef<OrderStatus | null>(null);
    const [ringScale, setRingScale] = useState(false);
    const [labelSlide, setLabelSlide] = useState(false);
    // Same celebratory cat used in the order-confirmation screen — reused
    // here rather than inventing a second animation for the "ready" moment.
    const [readyAnim, setReadyAnim] = useState<object | null>(null);
    useEffect(() => { fetch('/cat-salad-final.json').then(r => r.json()).then(setReadyAnim).catch(() => {}); }, []);

    const countdown = useCountdown(order?.pickup_time ?? null, order?.status === 'collected');

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
        let stopped = false;   // terminal: the order is collected, or gone
        let inFlight = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        // Visible: 4s, so a kitchen "ready" lands almost at once for someone
        // watching. Hidden: 20s — the tab-title flash below still needs polling
        // to run in the background, but at 4s a page parked through an afternoon
        // was making ~900 requests an hour to notice a single change.
        const nextDelay = () => (document.hidden ? 20_000 : 4_000);

        const schedule = () => {
            if (stopped || cancelled) return;
            timer = setTimeout(load, nextDelay());
        };

        const load = async () => {
            if (inFlight || stopped || cancelled) return;
            inFlight = true;
            try {
                const res = await fetch(`/api/orders/${id}`);
                if (cancelled) return;
                // Only a 404 means the order genuinely isn't there. Every other
                // failure — a 500, a rate limit, a dropped mobile connection on
                // the way back from the payment page — used to land on the same
                // screen, telling someone who had just paid that their order did
                // not exist. Those are now retried instead.
                if (res.status === 404) { stopped = true; setNotFound(true); return; }
                if (!res.ok) throw new Error(String(res.status));
                const d = (await res.json()) as Order;
                if (cancelled) return;
                setOffline(false);
                setOrder(d);
                if (prevStatusRef.current === null) prevStatusRef.current = d.status;
                // 'collected' is terminal — nothing will change again.
                if (d.status === 'collected') { stopped = true; setSettled(true); }
            } catch {
                if (!cancelled) setOffline(true);
            } finally {
                inFlight = false;
                schedule();
            }
        };

        // Coming back to the tab should show the current state immediately
        // rather than sitting on stale data for the rest of a hidden interval.
        const onVisibility = () => {
            if (document.hidden || stopped || cancelled) return;
            if (timer) clearTimeout(timer);
            load();
        };
        document.addEventListener('visibilitychange', onVisibility);

        load();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
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

    // Flash the tab title when the order becomes ready while this tab is
    // hidden — customers park this page in the background while waiting.
    // Stops and restores the title the moment they come back.
    useEffect(() => {
        if (order?.status !== 'ready' || !document.hidden) return;
        const baseTitle = document.title;
        let on = true;
        document.title = '🎉 ההזמנה מוכנה!';
        const interval = setInterval(() => {
            on = !on;
            document.title = on ? '🎉 ההזמנה מוכנה!' : baseTitle;
        }, 1200);
        const stop = () => {
            if (!document.hidden) {
                clearInterval(interval);
                document.title = baseTitle;
            }
        };
        document.addEventListener('visibilitychange', stop);
        return () => {
            clearInterval(interval);
            document.title = baseTitle;
            document.removeEventListener('visibilitychange', stop);
        };
    }, [order?.status]);

    if (notFound) return <NotFound />;
    if (!order) return <Loading offline={offline} />;

    // Clamped: an unrecognised status made findIndex return -1, which rendered
    // the status label as an empty string — a blank page where the state goes.
    const stepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
    const currentStep = stepIndex === -1 ? 0 : stepIndex;
    const step = STATUS_STEPS[currentStep];
    const isReady = order.status === 'ready';
    const isCollected = order.status === 'collected';
    const bowl = orderSizeLabel(order.size);

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

    const pay = paymentLabel(order.payment_status);

    return (
        <div style={P.root}>
            <div style={P.bg} aria-hidden="true" />

            {/* When the order is ready the ring is replaced by the same cat that
                appears on the confirmation screen, on the same pedestal — so the
                customer sees a familiar object arrive at the moment their food
                does. The footprint grows with it, which reads as a reveal rather
                than a resize; and because the pedestal slot is a fixed-aspect
                box, the swap cannot move anything below it. */}
            <BariPlaque
                pedestal={
                    <div style={ringStyle}>
                        {isReady && readyAnim
                            ? <Lottie animationData={readyAnim} loop autoplay style={{ width: '84%', height: '84%' }} />
                            : <div style={P.ringIcon}>{step.icon}</div>}
                    </div>
                }
                pedestalWidth={isReady && readyAnim ? PLAQUE.pedestalArt : RING_WIDTH}
                title={
                    <>
                        <div style={labelStyle}>{step.label}</div>
                        <div style={{ ...P.statusSub, ...(isReady ? P.statusSubReady : {}) }}>
                            {step.sub}
                        </div>
                    </>
                }
            >
                <div style={P.bodyStack}>
                    {/* The order number is what the customer says at the counter,
                        so it takes the hero position under the divider that the
                        price holds on the confirmation screen. */}
                    <div style={{ animation: 'plaqueFadeUp 0.4s ease 0.05s both' }}>
                        <BariBadge>{order.order_num}</BariBadge>
                    </div>

                    {/* Pickup time — the clock time first, since that is what the
                        customer planned around, then how long is left. Once the
                        order is collected the remaining-time half is dropped: it is
                        frozen by then, and counting down to a collection that has
                        already happened reads as a stuck page. */}
                    {countdown && (
                        <div style={P.pickupTimeCard}>
                            <span>⏰ איסוף <strong style={P.pickupClock}>{countdown.clock}</strong></span>
                            {!isCollected && <>
                                <span style={P.pickupSep}>·</span>
                                <span style={{
                                    ...(countdown.arrived ? { ...P.countdownArrived, ...P.countdownNow } : {}),
                                    ...(countdown.urgent && !countdown.arrived ? P.countdownUrgent : {}),
                                }}>
                                    {countdown.text}
                                </span>
                            </>}
                        </div>
                    )}

                    <div style={P.hairline} />

                    {/* No card chrome here any more: a bordered box inside a
                        bordered frame is what made the summary panel feel
                        cramped, and its own padding double-inset against the
                        plaque's, costing the ingredient names a line. */}
                    <div style={P.items}>
                        <div style={P.itemsTitle}>
                            הסלט שלכם{bowl ? <span style={P.itemsBowl}> · {bowl}</span> : null}
                        </div>
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
                        {pay && (
                            <div style={{ ...P.payPill, ...(pay.owed ? P.payOwed : P.payDone) }}>
                                <span>{pay.owed ? '💳' : '✓'}</span>
                                <span>{pay.text}</span>
                            </div>
                        )}
                    </div>

                    {/* The footer used to promise "refreshes automatically" even
                        when the polling had stopped or was failing — the one moment
                        that claim matters is exactly when it stopped being true. */}
                    <div style={{ ...P.footer, ...(offline ? P.footerOffline : {}) }}>
                        {offline ? 'אין חיבור — מנסים שוב…'
                            : settled ? 'ההזמנה הושלמה'
                                : 'מתרענן אוטומטית · לא צריך לרענן'}
                    </div>

                    {/* Opened from a saved link this page had no way out of itself. */}
                    <Link href="/" style={P.homeLink}>← חזרה לתפריט</Link>
                </div>
            </BariPlaque>

            <style>{`
                @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(76,175,80,0.4)} 50%{box-shadow:0 0 0 16px rgba(76,175,80,0)} }
                @keyframes statusSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmerMove { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes shimmerPulse { 0%,100%{opacity:0.4} 50%{opacity:0.15} }
                @keyframes countdownPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.04)} }
                @keyframes countdownGlow { 0%,100%{text-shadow:0 0 8px rgba(76,175,80,0.6)} 50%{text-shadow:0 0 20px rgba(76,175,80,0.9)} }
            `}</style>
        </div>
    );
}

/* ── Shimmer Loading State ──
   Framed, so the plaque is already in place when the data lands and only the
   interior swaps — and so the frame art starts downloading immediately. The
   skeleton sits in the same slots the real content will: the circle where the
   ring goes, at the ring's own width, so nothing above the body moves. */
function Loading({ offline }: { offline: boolean }) {
    return (
        <div style={P.root}>
            <div style={P.bg} aria-hidden="true" />

            <BariPlaque
                pedestal={<div style={P.shimmerCircle} />}
                pedestalWidth={RING_WIDTH}
                title={
                    <>
                        <div style={{ ...P.shimmerBar, width: '120px', height: '20px' }} />
                        <div style={{ ...P.shimmerBar, width: '160px', marginTop: '10px' }} />
                    </>
                }
            >
                {/* This block must stay at least 0.2905 * plaque-width tall or the
                    frame's fixed bands overflow and the bottom ornament renders
                    outside the frame — see scripts/verify-plaque.ts. At 109px for
                    the widest plaque, three thin bars were not enough. */}
                <div style={{ ...P.bodyStack, gap: '16px' }}>
                    <div style={{ ...P.shimmerBar, width: '140px' }} />
                    <div style={{ ...P.shimmerBar, width: '100%', height: '46px', borderRadius: '10px' }} />
                    <div style={{ ...P.shimmerBar, width: '180px' }} />
                    <div style={{ ...P.shimmerBar, width: '100%', height: '40px', borderRadius: '10px' }} />

                    {/* A first load that keeps failing is now named, and keeps
                        retrying, instead of shimmering silently for ever. */}
                    {offline && (
                        <div style={{ ...P.footer, ...P.footerOffline, textAlign: 'center' }}>
                            אין חיבור — מנסים שוב…
                        </div>
                    )}
                </div>
            </BariPlaque>

            <style>{`
                @keyframes shimmerMove { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes shimmerPulse { 0%,100%{opacity:0.4} 50%{opacity:0.15} }
            `}</style>
        </div>
    );
}

// Deliberately unframed, following the precedent set for the payment-failure
// screen: a dead end with three elements, not something to dress in the plaque.
// It also avoids pulling 250KB of frame art on a 404.
function NotFound() {
    return (
        <div style={{ ...P.root, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={P.bg} aria-hidden="true" />
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
    // `min-height` + flex, NOT the confirmation screen's `position:fixed;
    // overflow-y:auto`. On a normal page an inner scroll container stops mobile
    // browser chrome auto-hiding and makes 100dvh meaningless. Because this is a
    // minimum rather than a fixed height, the flex free space is zero once the
    // plaque overflows, so `margin:auto` cannot strand its top off-screen.
    root: { position: 'relative', minHeight: '100dvh', display: 'flex', background: '#030a03', fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl', color: '#fff' },
    // The glitter photo and the GoldField particle canvas are gone from this
    // page: the plaque was designed against a flat, photo-free backdrop so its
    // gold rails are the only detail on screen, and this is the one page people
    // deliberately leave open — a permanent requestAnimationFrame particle loop
    // is the last thing it needs. Fixed, not on the root: a 155deg gradient
    // stretches over a document taller than the viewport, and
    // `background-attachment: fixed` is unreliable on iOS Safari.
    bg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `${PLAQUE.glow}, ${PLAQUE.backdrop}` },

    // Scales with the plaque (see RING_WIDTH) — a fixed 100px circle inside a
    // 238px-tall pedestal zone reads as a lost dot.
    ring: { width: '100%', height: '100%', borderRadius: '50%', border: '3px solid rgba(200,168,78,0.5)', background: 'rgba(200,168,78,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s ease', animation: 'plaqueFadeUp 0.4s ease 0.1s both' },
    ringReady: { border: '3px solid #4caf50', background: 'rgba(76,175,80,0.12)', animation: 'plaqueFadeUp 0.4s ease 0.1s both, pulse 1.5s ease-in-out 0.5s 3' },
    // Clamped, not a percentage: a % font-size resolves against the parent's
    // font-size, not its width, so it would not scale with the plaque at all.
    ringIcon: { fontSize: 'clamp(38px, 13vw, 54px)', lineHeight: 1 },

    // Line heights are pinned because the title zone scales with the plaque
    // width while this type does not: at Heebo's default (~1.5) the ready state
    // overflows the zone on a 320px phone and runs over the engraved divider.
    statusLabel: { fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.1, animation: 'plaqueFadeUp 0.4s ease 0.15s both' },
    statusSub: { fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'center' as const, lineHeight: 1.3, marginTop: '4px', animation: 'plaqueFadeUp 0.4s ease 0.18s both' },
    statusSubReady: { color: '#a5d6a7', fontSize: '14px', fontWeight: 800 },

    // The body slot is a plain block in BariPlaque so margin-driven callers stay
    // untouched; this page wants gap-based spacing, so it brings its own column.
    bodyStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' },

    pickupTimeCard: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, animation: 'plaqueFadeUp 0.4s ease 0.2s both', padding: '8px 18px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' },
    pickupClock: { color: '#f0d060', fontWeight: 900 },
    pickupSep: { color: 'rgba(255,255,255,0.25)' },

    countdownUrgent: { color: '#f0d060', fontWeight: 800, fontSize: '16px', animation: 'countdownPulse 1s ease-in-out infinite' },
    countdownArrived: { color: '#4caf50', fontWeight: 900, fontSize: '18px', animation: 'countdownGlow 1.5s ease-in-out infinite' },
    countdownNow: { textShadow: '0 0 12px rgba(76,175,80,0.7)' },

    hairline: { width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)', flexShrink: 0 },

    items: { width: '100%', animation: 'plaqueFadeUp 0.4s ease 0.3s both' },
    itemsTitle: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '10px', letterSpacing: '0.06em' },
    itemsBowl: { color: 'rgba(240,208,96,0.65)', fontWeight: 800 },
    itemsRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', fontSize: '24px', marginBottom: '8px' },
    itemChip: { lineHeight: 1.2 },
    itemNames: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
    notes: { fontSize: '12px', color: 'rgba(255,200,100,0.7)', marginTop: '8px', fontWeight: 600 },
    total: { fontSize: '20px', fontWeight: 900, color: '#f0d060', marginTop: '12px' },
    payPill: { marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 800 },
    payOwed: { background: 'rgba(255,183,77,0.14)', border: '1px solid rgba(255,183,77,0.42)', color: '#ffcc80' },
    payDone: { background: 'rgba(102,187,106,0.14)', border: '1px solid rgba(102,187,106,0.42)', color: '#a5d6a7' },

    footer: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
    footerOffline: { color: 'rgba(255,183,77,0.85)' },
    // Takes the shape and position the confirmation screen's terminal action
    // has, and the plaque's 17% bottom padding is what clears it of the ornament.
    homeLink: { display: 'block', width: '100%', padding: '12px 22px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: 'rgba(240,208,96,0.85)', textDecoration: 'none', textAlign: 'center' as const, border: '1px solid rgba(200,168,78,0.30)', background: 'rgba(200,168,78,0.10)' },

    /* Shimmer loading */
    shimmerCircle: {
        width: '100%', height: '100%', borderRadius: '50%',
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

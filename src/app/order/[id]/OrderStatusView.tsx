'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import GoldField from '@/components/ui/GoldField';
import BariGlowBackground from '@/components/ui/bari/BariGlowBackground';
import { fireGoldConfetti } from '@/lib/confetti';
import { orderSizeLabel } from '@/lib/reorder';
import { TRACK, slot, xPct, yPct } from './trackingArt';

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
//
// `medallion` is the full ornate art, for the hero ring at ~96px. `railIcon` is
// the same art cropped to its inner disc, for the 32px rail circles: at that
// size the ornate rim is what eats the space, and the full medallions are
// indistinguishable gold blobs. Cropped to the subject — and with the artwork's
// own circle supplying the rim — the clipboard, bowl, cloche and bag stay
// telling at 32px.
const STATUS_STEPS: { key: OrderStatus; label: string; rail: string; medallion: string; railIcon: string; sub: string }[] = [
    { key: 'waiting',   label: 'התקבלה', rail: 'התקבלה', medallion: '/builder-assets/track-seen.webp',   railIcon: '/builder-assets/track-seen-sm.webp',   sub: 'ההזמנה שלכם התקבלה במטבח' },
    { key: 'preparing', label: 'בהכנה',  rail: 'בהכנה',  medallion: '/builder-assets/track-making.webp', railIcon: '/builder-assets/track-making-sm.webp', sub: 'מכינים את הסלט שלכם עכשיו' },
    { key: 'ready',     label: 'מוכן!',  rail: 'מוכן',   medallion: '/builder-assets/track-ready.webp',  railIcon: '/builder-assets/track-ready-sm.webp',  sub: 'גשו לדלפק ואמרו את מספר ההזמנה' },
    { key: 'collected', label: 'נאסף',   rail: 'נאסף',   medallion: '/builder-assets/track-picked.webp', railIcon: '/builder-assets/track-picked-sm.webp', sub: 'בתיאבון! נשמח לראותכם שוב' },
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
    const prevStatusRef = useRef<OrderStatus | null>(null);
    const [ringScale, setRingScale] = useState(false);
    const [labelSlide, setLabelSlide] = useState(false);
    // The celebratory cat Lottie is gone from this page: the "ready" state now
    // shows its own medallion, so all four of the step artworks get used and the
    // set stays coherent. That also drops lottie-react and a JSON fetch from a
    // route people deliberately leave open. The ready moment is still marked —
    // confetti, chime, haptic and the ring pop all still fire.
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
                // 'collected' is terminal — nothing will change again. The UI
                // says so via the step's own line, so no extra state is needed.
                if (d.status === 'collected') stopped = true;
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

    const labelStyle: React.CSSProperties = {
        ...P.statusLabel,
        ...(isReady ? P.statusLabelReady : {}),
        ...(labelSlide ? { animation: 'statusSlideIn 0.45s ease both' } : {}),
    };

    const pay = paymentLabel(order.payment_status);

    return (
        <div style={P.root}>
            <BariGlowBackground />
            <GoldField zIndex={0} />

            <div style={P.board}>
                {/* Order number — what the customer says at the counter. */}
                <div style={{ ...slot(TRACK.nameplate.top, TRACK.nameplate.height, TRACK.nameplate.left, TRACK.nameplate.right), ...P.nameplate }}>
                    {order.order_num}
                </div>

                {/* The hero ring. The medallion for the current step lives here
                    and nowhere else — it is the only slot in the art big enough
                    to read one. It changes as the order progresses, so the
                    picture itself carries the state. */}
                <div style={{ ...P.heroRing, ...(ringScale ? P.heroPop : undefined) }}>
                    <img key={step.key} src={step.medallion} alt="" style={P.medallion} />
                </div>

                {/* The four circles the art draws, running RIGHT to LEFT — the
                    step order is in trackingArt's `centres`, so this just walks
                    the steps. Progress reads from the icons themselves: reached
                    steps are full colour, steps still to come are dimmed and
                    desaturated, and the current one carries the glow. This
                    artwork leaves no room for labels under them, so the card
                    names the current step instead. */}
                {STATUS_STEPS.map((s, i) => {
                    const reached = i <= currentStep;
                    const active = i === currentStep;
                    return (
                        <div
                            key={s.key}
                            title={s.rail}
                            style={{
                                ...P.railDot,
                                left: xPct(TRACK.rail.centres[i] - TRACK.rail.size / 2),
                                ...(active ? P.railActive : {}),
                            }}
                        >
                            <img
                                src={s.railIcon}
                                alt={s.rail}
                                style={{ ...P.railImg, ...(reached ? {} : P.railImgPending) }}
                            />
                        </div>
                    );
                })}

                {/* ── The card: one open field carrying the whole order. Every
                       row is clamped rather than allowed to grow, because the
                       card is a fixed slot in the artwork. ── */}
                <div style={{ ...slot(TRACK.card.top, TRACK.card.height, TRACK.card.left, TRACK.card.right), ...P.band }}>
                    <div style={labelStyle}>{step.label}</div>

                    {/* One line, priority-ordered, because the artwork has room
                        for exactly one and these never all matter at once:
                          1. a lost connection — nothing else is trustworthy
                          2. "ready", the only state with something to DO
                          3. the pickup time, which is what people planned around
                        The clock leads the countdown, and the remaining-time half
                        is dropped once collected, when it is frozen anyway. */}
                    {offline ? (
                        <div style={{ ...P.statusSub, ...P.statusSubOffline }}>
                            <span style={{ ...P.liveDot, ...P.liveDotOffline }} /> אין חיבור — מנסים שוב…
                        </div>
                    ) : isReady ? (
                        <div style={{ ...P.statusSub, ...P.statusSubReady }}>{step.sub}</div>
                    ) : countdown && !isCollected ? (
                        <div style={P.pickupRow}>
                            <span>⏰ איסוף <strong style={P.pickupClock}>{countdown.clock}</strong></span>
                            <span style={P.pickupSep}>·</span>
                            <span style={{
                                ...(countdown.arrived ? { ...P.countdownArrived, ...P.countdownNow } : {}),
                                ...(countdown.urgent && !countdown.arrived ? P.countdownUrgent : {}),
                            }}>
                                {countdown.text}
                            </span>
                        </div>
                    ) : (
                        <div style={P.statusSub}>{step.sub}</div>
                    )}

                    <div style={P.itemsRow}>
                        {order.items.map(it => (
                            <span key={it.id} style={P.itemChip} title={it.he}>
                                {it.icon && it.icon.startsWith('/')
                                    ? <img src={it.icon} alt={it.he} style={P.itemImg} />
                                    : it.icon}
                            </span>
                        ))}
                    </div>

                    {/* A note squeezes the names to one line rather than pushing
                        the card open — both are the customer's own words, and
                        seeing the note echoed back is worth more than a second
                        line of ingredients they just chose. */}
                    <div style={{ ...P.itemNames, WebkitLineClamp: order.notes ? 1 : 2 }}>
                        {order.items.map(i => i.he).join(' · ')}
                    </div>
                    {order.notes && <div style={P.notes}>📝 {order.notes}</div>}

                    {/* Total and payment share a line — the card has room for
                        five rows, not six. */}
                    <div style={P.moneyRow}>
                        <span style={P.total}>₪{order.total}</span>
                        {bowl && <span style={P.bowlLabel}>· {bowl}</span>}
                        {pay && (
                            <span style={{ ...P.payTag, ...(pay.owed ? P.payOwed : P.payDone) }}>
                                {pay.owed ? '💳' : '✓'} {pay.text}
                            </span>
                        )}
                    </div>
                </div>

                {/* The footer used to promise "refreshes automatically" even when
                    the polling had stopped or was failing — the one moment that
                    claim matters is exactly when it stopped being true. */}
                {/* Opened from a saved link this page had no way out of itself. */}
                <Link
                    href="/"
                    style={{ ...slot(TRACK.bottomPill.top, TRACK.bottomPill.height, TRACK.bottomPill.left, TRACK.bottomPill.right), ...P.bottomPill }}
                >
                    ← חזרה לתפריט
                </Link>
            </div>

            <style>{`
                @keyframes statusSlideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                @keyframes medallionIn { from{opacity:0;transform:scale(0.72) rotate(-6deg)} to{opacity:1;transform:none} }
                @keyframes railPulse { 0%,100%{box-shadow:0 0 10px rgba(240,208,96,0.55)} 50%{box-shadow:0 0 20px rgba(240,208,96,0.95)} }
                @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.8)} }
                @keyframes shimmerMove { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes shimmerPulse { 0%,100%{opacity:0.4} 50%{opacity:0.15} }
                @keyframes countdownPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.04)} }
                @keyframes countdownGlow { 0%,100%{text-shadow:0 0 8px rgba(76,175,80,0.6)} 50%{text-shadow:0 0 20px rgba(76,175,80,0.9)} }
            `}</style>
        </div>
    );
}

/* ── Shimmer Loading State ──
   Shows the board itself with shimmer in the slots, so the artwork is already
   in place when the data lands and only the contents swap. Because every slot
   is absolutely positioned, nothing moves at all on that transition. */
function Loading({ offline }: { offline: boolean }) {
    const bar = (top: number, height: number, left: number, right: number) => ({
        ...slot(top, height, left, right), ...P.shimmerBar,
    });
    return (
        <div style={P.root}>
            <BariGlowBackground />
            <GoldField zIndex={0} />

            <div style={P.board}>
                <div style={{ ...P.heroRing }}>
                    <div style={P.shimmerCircle} />
                </div>
                <div style={bar(TRACK.nameplate.top + 0.010, TRACK.nameplate.height - 0.020, 0.42, 1 - 0.58)} />
                <div style={bar(TRACK.card.top + 0.035, 0.028, 0.36, 1 - 0.64)} />
                <div style={bar(TRACK.card.top + 0.170, 0.028, 0.20, 1 - 0.80)} />
                <div style={bar(TRACK.card.top + 0.240, 0.022, 0.26, 1 - 0.74)} />
                <div style={bar(TRACK.card.top + 0.310, 0.030, 0.34, 1 - 0.66)} />

                {/* A first load that keeps failing is named, and keeps retrying,
                    instead of shimmering silently for ever. It takes the card's
                    second line — the same place the loaded page reports it. */}
                {offline && (
                    <div style={{
                        ...slot(TRACK.card.top + 0.090, 0.045, TRACK.card.left, TRACK.card.right),
                        ...P.statusSub, ...P.statusSubOffline,
                    }}>
                        <span style={{ ...P.liveDot, ...P.liveDotOffline }} /> אין חיבור — מנסים שוב…
                    </div>
                )}
                {!offline && <div style={bar(TRACK.card.top + 0.100, 0.022, 0.24, 1 - 0.76)} />}
            </div>

            <style>{`
                @keyframes plaqueFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
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
            <BariGlowBackground />
            <GoldField zIndex={0} />
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
    // The tracking artwork is keyed, so everything outside its frame and filled
    // slots is transparent — the site's own backdrop and particle field are
    // meant to show through it. Hence the full background here rather than the
    // flat one the confirmation overlay uses.
    root: { position: 'relative', minHeight: '100dvh', display: 'flex', background: 'url(/homepage-assets/BG_8K.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)', fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl', color: '#fff' },

    // The artwork, locked to its own ratio. Everything below is absolutely
    // positioned into a slot the art already drew, so all the geometry lives in
    // trackingArt.ts and none of it is guessed here.
    board: {
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: `${TRACK.maxWidth}px`,
        aspectRatio: TRACK.aspect,
        margin: 'auto',
        backgroundImage: `url(${TRACK.art})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        borderRadius: '10px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.55)',
        animation: 'plaqueFadeUp 0.5s ease both',
    },

    // Type is sized in vw against the board's own width (which tracks the
    // viewport below its 400px cap) because every slot scales with the art while
    // fixed px would not — the same trap the confirmation screen's title hit.
    nameplate: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(10px, 3.1vw, 13px)', fontWeight: 900, color: '#f0d060', letterSpacing: '0.04em' },

    heroRing: {
        position: 'absolute',
        top: yPct(TRACK.heroRing.top), height: yPct(TRACK.heroRing.size),
        left: xPct(0.5 - TRACK.heroRing.size / 2), width: xPct(TRACK.heroRing.size),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    },
    heroPop: { transform: 'scale(1.12)', transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' },
    // Deliberately larger than the ring the art draws, so the medallion's own
    // gold rim lands ON it and the two read as one object. Sized smaller they
    // sit as two concentric rings with a gap, which looks like a mistake. It
    // overflows the slot symmetrically because the parent centres it. `key` on
    // the img restarts the entrance on every status change.
    medallion: { width: '118%', height: '118%', objectFit: 'contain', flexShrink: 0, animation: 'medallionIn 0.5s cubic-bezier(0.34,1.5,0.64,1) both' },

    statusLabel: { fontSize: 'clamp(14px, 4.4vw, 18px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, textShadow: '0 1px 6px rgba(0,0,0,0.6)' },
    statusLabelReady: { color: '#8ee08e' },

    // Overlays the circles the art draws, which supply the gold rim — hence the
    // cropped icons, which carry no rim of their own.
    railDot: {
        position: 'absolute',
        top: yPct(TRACK.rail.top), height: yPct(TRACK.rail.size), width: xPct(TRACK.rail.size),
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.35s ease',
    },
    railActive: { boxShadow: '0 0 14px rgba(240,208,96,0.75)', animation: 'railPulse 1.8s ease-in-out infinite' },
    railImg: { width: '86%', height: '86%', objectFit: 'contain', transition: 'opacity 0.35s ease, filter 0.35s ease' },
    // Steps still to come read as "not yet" without needing a second symbol.
    railImgPending: { opacity: 0.32, filter: 'grayscale(0.75) brightness(0.75)' },

    // The card is one fixed slot holding five rows, so the sizes below are
    // budgeted against its 0.4043 W for the worst case: 14 ingredients wrapping
    // the icon row to two lines, plus a note. The clamp MINIMA matter as much as
    // the maxima — on a 320px phone the card shrinks with the art while fixed
    // type floors would not, which is where this overflows first.
    band: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', overflow: 'hidden', padding: '0 3%' },

    statusSub: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: 'clamp(8px, 3.0vw, 12px)', fontWeight: 600, color: 'rgba(255,255,255,0.62)', textAlign: 'center' as const, lineHeight: 1.25 },
    statusSubReady: { color: '#a5d6a7', fontWeight: 800 },
    statusSubOffline: { color: '#ffc266', fontWeight: 700 },

    pickupRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'clamp(8px, 3.1vw, 12px)', color: 'rgba(255,255,255,0.68)', fontWeight: 600, lineHeight: 1.25 },
    pickupClock: { color: '#f0d060', fontWeight: 900 },
    pickupSep: { color: 'rgba(255,255,255,0.25)' },

    countdownUrgent: { color: '#f0d060', fontWeight: 800, animation: 'countdownPulse 1s ease-in-out infinite' },
    countdownArrived: { color: '#7ed07e', fontWeight: 900, animation: 'countdownGlow 1.5s ease-in-out infinite' },
    countdownNow: { textShadow: '0 0 12px rgba(76,175,80,0.7)' },

    // 14 ingredients do not fit one row inside the card, so the row wraps and is
    // capped at two — beyond that the icons are cut off rather than the band
    // overflowing and clipping the names underneath them.
    itemsRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '3px', fontSize: 'clamp(12px, 4.8vw, 19px)', lineHeight: 1.1, maxHeight: '2.4em', overflow: 'hidden' },
    itemChip: { lineHeight: 1.1 },
    itemImg: { width: '1em', height: '1em', objectFit: 'contain', display: 'block' },
    // Clamped: the card is a fixed slot in the artwork, so a long ingredient
    // list must be cut off rather than pushing the composition apart.
    itemNames: {
        fontSize: 'clamp(8px, 2.7vw, 10px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.35, textAlign: 'center' as const,
        display: '-webkit-box', WebkitBoxOrient: 'vertical' as unknown as undefined, WebkitLineClamp: 2, overflow: 'hidden',
    },
    notes: {
        fontSize: 'clamp(8px, 2.7vw, 10px)', color: 'rgba(255,200,100,0.85)', fontWeight: 600, textAlign: 'center' as const,
        display: '-webkit-box', WebkitBoxOrient: 'vertical' as unknown as undefined, WebkitLineClamp: 1, overflow: 'hidden',
    },

    // Total, size and payment share one line — the card has room for five rows,
    // not six.
    moneyRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', flexWrap: 'nowrap', lineHeight: 1.1 },
    total: { fontSize: 'clamp(15px, 5.0vw, 20px)', fontWeight: 900, color: '#f0d060' },
    bowlLabel: { fontSize: 'clamp(8px, 2.7vw, 10px)', color: 'rgba(240,208,96,0.6)', fontWeight: 700, whiteSpace: 'nowrap' },
    payTag: { fontSize: 'clamp(8px, 2.9vw, 11px)', fontWeight: 800, whiteSpace: 'nowrap' },
    payOwed: { color: '#ffd08a' },
    payDone: { color: '#b6e6b6' },

    footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: 'clamp(8px, 2.7vw, 11px)', color: 'rgba(255,255,255,0.62)', fontWeight: 600, textShadow: '0 1px 6px rgba(0,0,0,0.9)' },

    // Green and breathing while polling, amber when the connection is gone,
    // steady gold once collected.
    liveDot: {
        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        background: '#7ed07e', boxShadow: '0 0 6px rgba(126,208,126,0.9)',
        animation: 'livePulse 2s ease-in-out infinite',
    },
    liveDotOffline: { background: '#ffb74d', boxShadow: '0 0 6px rgba(255,183,77,0.9)', animation: 'none' },

    // Sits on the green pill the art draws at the bottom.
    bottomPill: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(11px, 3.5vw, 14px)', fontWeight: 800, color: '#ffe9a8', textDecoration: 'none', letterSpacing: '0.02em' },

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

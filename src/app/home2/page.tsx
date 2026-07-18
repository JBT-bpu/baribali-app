'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Tilt from 'react-parallax-tilt';
import ReviewsStrip from '@/components/ui/ReviewsStrip';
import CatPopup from '@/components/ui/CatPopup';
import { BariButton, BariModal, BariGlowBackground, BariBottomNav } from '@/components/ui/bari';
import { usePrefersReducedMotion } from '@/lib/motionHooks';

// ─── Config ───────────────────────────────────────────────────────────────────
// Order = swipe/reading order (RTL, so this reads right-to-left visually).
// Login/guest leads so new visitors are prompted to unlock privileges before
// anything else; salad is the working build flow; tortilla is a placeholder
// for a flow that isn't built yet, so it's flagged comingSoon instead of
// wired to a route. More cards (e.g. Bari loyalty cards) are expected to
// join this array later.
const MAIN_CARDS = [
    { id: 'login',    img: '/homepage-assets/card-login.png',    label: 'כניסה / פרופיל', sub: 'שמור סלטים · קבל המלצות והטבות' },
    { id: 'salad',    img: '/homepage-assets/card-salad.png',    label: 'בנה סלט',     sub: 'בחר מרכיבים · בחר גודל · הגש' },
    { id: 'tortilla', img: '/homepage-assets/card-tortilla.png', label: 'בנה טורטיה',  sub: 'קמח מחיטה מלאה · בריא · טעים', comingSoon: true },
];

const SIZE_CARDS = [
    { id: 'S', img: '/homepage-assets/size-s.png', tag: 'לתיאבון קליל', sub: '₪54 · 1-2 מנות' },
    { id: 'M', img: '/homepage-assets/size-m.png', tag: 'המאוזן המושלם', sub: '₪59 · 2-3 מנות' },
    { id: 'L', img: '/homepage-assets/size-l.png', tag: 'לרעבים אמיתיים', sub: '₪72 · 3-4 מנות' },
];

// Relative visual heights for the size-comparison scale below the title —
// not to scale with real ml, just enough of a size cue to read at a glance.
const SIZE_SCALE_HEIGHTS = [26, 38, 52];

// Main carousel — card dimensions
const M_W = 192;   // card width px
const M_H = 268;   // card height px

// Size carousel — card dimensions
const S_W = 210;
const S_H = 272;

// ─── Particles ────────────────────────────────────────────────────────────────
// Pre-renders one glow sprite per color once and drawImage()s it per particle —
// per-frame ctx.shadowBlur (the slowest canvas op) and per-frame gradient
// creation were the two most expensive things on this page. Same look.
function makeGlowSprite(col: string, hardStop: number): HTMLCanvasElement {
    const size = 64;
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const sctx = s.getContext('2d')!;
    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, col);
    g.addColorStop(hardStop, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, size, size);
    return s;
}

function Particles() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d')!;
        const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);
        // Palette matches the design tokens in globals.css (gold-deep/light/
        // bright, cream) — literal hex here since canvas fillStyle can't
        // resolve CSS custom properties.
        const sparkCols = ['#c8a832', '#f0d060', '#ffe066', '#c8a84e', '#fffacc'];
        const bokehCols = ['#c8a832', '#f0d060', '#ffe066', '#c8a84e'];
        // Tight core + wide falloff reads like the old shadowBlur glow.
        const sparkSprites = sparkCols.map(col => makeGlowSprite(col, 0.18));
        const bokehSprites = bokehCols.map(col => makeGlowSprite(col, 0.55));
        // Fewer particles on small screens — less overdraw on weaker GPUs.
        const small = window.innerWidth < 480;
        const SPARKS = small ? 64 : 120;
        const BOKEH = small ? 14 : 26;
        type Spark = { x: number; y: number; r: number; s: number; o: number; sp: number; d: number; ph: number };
        type Bokeh = { x: number; y: number; r: number; s: number; o: number; sp: number; ph: number };
        const sparks: Spark[] = Array.from({ length: SPARKS }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            r: Math.random() * 2.8 + 0.5, s: Math.random() * 0.65 + 0.18,
            o: Math.random() * 0.45 + 0.12, sp: Math.floor(Math.random() * sparkSprites.length),
            d: (Math.random() - 0.5) * 0.32, ph: Math.random() * Math.PI * 2,
        }));
        const bokeh: Bokeh[] = Array.from({ length: BOKEH }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            r: Math.random() * 54 + 18, s: Math.random() * 0.14 + 0.03,
            o: Math.random() * 0.10 + 0.04, sp: Math.floor(Math.random() * bokehSprites.length),
            ph: Math.random() * Math.PI * 2,
        }));
        let raf: number, t = 0;
        const draw = () => {
            t += 0.013; ctx.clearRect(0, 0, c.width, c.height);
            for (const b of bokeh) {
                b.y -= b.s; b.x += Math.sin(t * 0.35 + b.ph) * 0.28;
                b.o = 0.04 + Math.sin(t * 0.45 + b.ph) * 0.07 + 0.04;
                if (b.y < -b.r * 2) { b.y = c.height + b.r; b.x = Math.random() * c.width; }
                ctx.globalAlpha = Math.min(0.22, Math.max(0, b.o));
                ctx.drawImage(bokehSprites[b.sp], b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
            }
            for (const p of sparks) {
                p.y -= p.s; p.x += p.d + Math.sin(t + p.ph) * 0.16;
                p.o = 0.08 + Math.sin(t * 0.9 + p.ph) * 0.28 + 0.12;
                if (p.y < -6) { p.y = c.height + 6; p.x = Math.random() * c.width; }
                if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
                ctx.globalAlpha = Math.min(0.75, Math.max(0, p.o));
                // Sprite drawn at ~4.5x the core radius so the falloff shows.
                const d = p.r * 4.5;
                ctx.drawImage(sparkSprites[p.sp], p.x - d / 2, p.y - d / 2, d, d);
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />;
}

// ─── Size Picker ──────────────────────────────────────────────────────────────
function SizePicker({ onSelect, onBack }: { onSelect: (s: string) => void; onBack: () => void }) {
    const reducedMotion = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(1);
    const [dragX, setDragX]         = useState(0);
    const [out, setOut]             = useState(false);
    const [glowCard, setGlowCard]   = useState<number | null>(null);
    const dragging = useRef(false);
    const startX   = useRef(0);
    const dragged  = useRef(false);

    const snapTo = (idx: number) => {
        if (idx < 0 || idx >= SIZE_CARDS.length) return;
        navigator.vibrate?.(8);
        setActiveIdx(idx);
        setGlowCard(idx);
        setTimeout(() => setGlowCard(null), 600);
    };

    const onDown = (e: React.PointerEvent) => {
        dragging.current = true; dragged.current = false;
        startX.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        const d = e.clientX - startX.current;
        if (Math.abs(d) > 4) dragged.current = true;
        setDragX(d);
    };
    const onUp = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        const delta = e.clientX - startX.current;
        setDragX(0);
        if (delta < -42) snapTo(activeIdx + 1);
        else if (delta > 42) snapTo(activeIdx - 1);
    };

    const handleCardTap = (idx: number) => {
        if (dragged.current) return;
        if (idx !== activeIdx) { snapTo(idx); return; }
        doConfirm();
    };

    const doConfirm = () => {
        if (navigator.vibrate) navigator.vibrate([20, 50, 40]);
        setOut(true);
        setTimeout(() => onSelect(SIZE_CARDS[activeIdx].id), 280);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(3,8,3,0.88)',
            backdropFilter: 'blur(28px) saturate(1.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 'min(12px, 2vh)', direction: 'rtl',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            overflowY: 'auto',
            animation: out ? 'sizePickerOut 0.28s ease forwards' : 'sizePickerIn 0.45s cubic-bezier(0.22,1.4,0.36,1) both',
        }}>

            {/* Step breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>בנה סלט</span>
                <span style={{ fontSize: '10px', color: 'rgba(240,200,50,0.45)' }}>←</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-gold-deep)', letterSpacing: '0.06em', animation: 'stepGlow 2.2s ease-in-out infinite' }}>בחר גודל</span>
            </div>

            {/* Thin gold divider */}
            <div style={{ width: '44px', height: '1.5px', background: 'linear-gradient(90deg,transparent,rgba(240,200,50,0.35),transparent)', marginBottom: '-2px' }} />

            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>כמה אתם רעבים?</div>

            {/* Size-comparison scale — relative visual cue between S/M/L, tap to jump */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginTop: '2px', marginBottom: '2px' }}>
                {SIZE_CARDS.map((c, i) => {
                    const isOn = i === activeIdx;
                    return (
                        <div key={c.id} onClick={() => snapTo(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <div style={{
                                width: '30px', height: `${SIZE_SCALE_HEIGHTS[i]}px`,
                                borderRadius: '45% 45% 14% 14%',
                                background: isOn
                                    ? 'linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-deep))'
                                    : 'rgba(255,255,255,0.12)',
                                border: isOn ? '1px solid var(--color-gold-light)' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: isOn ? '0 0 16px rgba(240,200,50,0.55)' : 'none',
                                transition: 'all 0.35s cubic-bezier(0.34,1.4,0.64,1)',
                            }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: isOn ? 'var(--color-gold-deep)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s ease' }}>{c.id}</span>
                        </div>
                    );
                })}
            </div>

            {/* Stage */}
            <div
                style={{ position: 'relative', width: '100%', height: 'clamp(210px, 40vh, 310px)', cursor: 'grab', touchAction: 'none', overflow: 'visible' }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            >
                {SIZE_CARDS.map((card, i) => {
                    const eff    = (i - activeIdx) + dragX / 148;
                    const absEff = Math.abs(eff);
                    const isActive = i === activeIdx && !dragging.current;

                    const tx   = eff * 138;
                    const ry   = eff * 46;
                    const sc   = 1 - Math.min(absEff, 1) * 0.44;
                    const op   = 1 - Math.min(absEff, 1) * 0.68;   // more dramatic fade on sides
                    const zIdx = Math.round(10 - absEff * 5);
                    const tr   = dragging.current ? 'none'
                        : 'transform 0.46s cubic-bezier(0.34,1.56,0.64,1), opacity 0.36s ease';

                    const isGlowing = glowCard === i;
                    const glowShadow = isGlowing ? ', 0 0 32px rgba(240,200,50,0.5)' : '';

                    return (
                        // Outer: coverflow positioning + opacity/zIndex
                        <div
                            key={card.id}
                            onClick={() => handleCardTap(i)}
                            style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                width: `${S_W}px`, height: `${S_H}px`,
                                marginLeft: `${-S_W / 2}px`, marginTop: `${-S_H / 2}px`,
                                transform: `perspective(800px) translateX(${tx}px) rotateY(${ry}deg) scale(${sc})`,
                                opacity: op,
                                zIndex: zIdx,
                                cursor: 'pointer',
                                transition: tr,
                            }}
                        >
                            {/* Inner: entrance animation + visual styling + tilt/glare */}
                            <Tilt
                                tiltEnable={!reducedMotion}
                                glareEnable={!reducedMotion}
                                tiltMaxAngleX={6}
                                tiltMaxAngleY={6}
                                glareMaxOpacity={0.16}
                                glareColor="var(--color-gold-deep)"
                                glarePosition="all"
                                glareBorderRadius="16px"
                                transitionSpeed={400}
                                onEnter={() => navigator.vibrate?.(8)}
                                style={{
                                width: '100%', height: '100%',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: isActive ? '1.5px solid rgba(240,200,50,0.65)' : '1px solid rgba(255,255,255,0.22)',
                                boxShadow: isActive
                                    ? 'var(--shadow-card-glow), var(--shadow-gold-glow-lg)' + glowShadow
                                    : '0 6px 20px rgba(0,0,0,0.5)',
                                animation: `cardCascade 0.45s cubic-bezier(0.22,1.2,0.36,1) ${i * 75}ms both`,
                                position: 'relative',
                            }}>
                                <Image
                                    src={card.img} alt={`גודל ${card.id}`} width={S_W} height={S_H}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }}
                                />

                                {/* Price badge — re-animates when this card becomes active */}
                                {isActive && (
                                    <div key={`price-${activeIdx}`} style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        display: 'flex', justifyContent: 'center',
                                        paddingBottom: '14px',
                                        animation: 'priceBadge 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
                                    }}>
                                        <div style={{
                                            padding: '7px 20px', borderRadius: '20px',
                                            background: 'linear-gradient(135deg,rgba(20,8,0,0.92),rgba(8,4,0,0.96))',
                                            border: '1px solid rgba(240,200,50,0.45)',
                                            backdropFilter: 'blur(8px)',
                                            whiteSpace: 'nowrap', textAlign: 'center',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                        }}>
                                            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-gold-bright)', marginBottom: '1px' }}>{card.tag}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-gold-deep)' }}>{card.sub}</div>
                                        </div>
                                    </div>
                                )}
                            </Tilt>
                        </div>
                    );
                })}
            </div>

            {/* No dots row here — the size cups above and the carousel itself
                already show the active size; a third indicator was redundant. */}
            <BariButton
                variant="primary"
                onClick={doConfirm}
                style={{
                    marginTop: '4px',
                    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                    opacity: out ? 0 : 1,
                    transition: 'opacity 0.2s',
                }}
            >
                בנה סלט ←
            </BariButton>

            <BariButton
                variant="ghost"
                size="sm"
                onClick={onBack}
                style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", marginTop: '-4px', borderRadius: '20px' }}
            >
                ← חזרה
            </BariButton>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeV2() {
    const router = useRouter();
    const reducedMotion = usePrefersReducedMotion();

    // ── Carousel state ──
    const [activeIdx, setActiveIdx]   = useState(1);   // placeholder — resolved to login/salad by auth-state effect before reveal
    const [dragX, setDragX]           = useState(0);
    const [glowCard, setGlowCard]     = useState<number | null>(null);
    const dragging = useRef(false);
    const startX   = useRef(0);
    const dragged  = useRef(false);

    // ── Screen state ──
    const [sizePicker, setSizePicker] = useState(false);
    const [loginSheet, setLoginSheet] = useState(false);
    const [curtain, setCurtain]       = useState(false);
    const [ready, setReady]           = useState(false);
    const [toast, setToast]           = useState<string | null>(null);
    const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Swipe hint — only show on first visit ──
    const [showSwipeHint, setShowSwipeHint] = useState(false);
    useEffect(() => {
        if (!localStorage.getItem('bb-swipe-hint-seen')) {
            setShowSwipeHint(true);
            const t = setTimeout(() => {
                localStorage.setItem('bb-swipe-hint-seen', '1');
                setShowSwipeHint(false);
            }, 6200); // ~2 cycles of 3s animation + 0.8s delay
            return () => clearTimeout(t);
        }
    }, []);

    // ── Cat welcome popup — only show on first visit ──
    const [showCatPopup, setShowCatPopup] = useState(false);
    useEffect(() => {
        if (!localStorage.getItem('bb-cat-popup-seen')) {
            const t = setTimeout(() => setShowCatPopup(true), 900);
            return () => clearTimeout(t);
        }
    }, []);
    const dismissCatPopup = useCallback(() => {
        localStorage.setItem('bb-cat-popup-seen', '1');
        setShowCatPopup(false);
    }, []);

    useEffect(() => {
        // First-time/guest visitors land on the login/guest card; once
        // they've continued (as guest or via Google — see completeAuth),
        // that choice persists and future visits skip straight to salad.
        const authed = localStorage.getItem('bb-user-authed');
        setActiveIdx(MAIN_CARDS.findIndex(c => c.id === (authed ? 'salad' : 'login')));
        setReady(true);
        router.prefetch('/build');
    }, [router]);

    const snapTo = useCallback((idx: number) => {
        if (idx < 0 || idx >= MAIN_CARDS.length) return;
        navigator.vibrate?.(8);
        setActiveIdx(idx);
        setGlowCard(idx);
        setTimeout(() => setGlowCard(null), 600);
    }, []);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToast(null), 1800);
    }, []);

    // Guest and Google both just unlock the "signed in" state for now — no
    // real auth backend exists yet (see kitchenAuth.ts / login stub). Skips
    // the login card on future visits until it's cleared (e.g. sign-out).
    const completeAuth = useCallback(() => {
        localStorage.setItem('bb-user-authed', '1');
        navigator.vibrate?.(12);
        setLoginSheet(false);
        snapTo(MAIN_CARDS.findIndex(c => c.id === 'salad'));
    }, [snapTo]);

    const onDown = (e: React.PointerEvent) => {
        dragging.current = true; dragged.current = false;
        startX.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        const d = e.clientX - startX.current;
        if (Math.abs(d) > 5) dragged.current = true;
        setDragX(d);
    };
    const onUp = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        const delta = e.clientX - startX.current;
        setDragX(0);
        if (Math.abs(delta) > 42) {
            // RTL: swipe right → lower index, swipe left → higher index
            snapTo(delta < 0 ? activeIdx + 1 : activeIdx - 1);
        }
    };

    const handleCardTap = (idx: number) => {
        if (dragged.current) return;
        if (idx !== activeIdx) { snapTo(idx); return; }
        const mc = MAIN_CARDS[idx];
        if (mc.comingSoon) {
            navigator.vibrate?.(10);
            showToast(`${mc.label} — בקרוב...`);
            return;
        }
        // Active card — trigger its action. Single tap for salad/login —
        // the size picker itself is salad's confirmation step, so no
        // tap-again-to-confirm needed.
        if (navigator.vibrate) navigator.vibrate(18);
        if (mc.id === 'salad') setSizePicker(true);
        else if (mc.id === 'login') setLoginSheet(true);
    };

    const handleSizeSelect = useCallback((size: string) => {
        setSizePicker(false);
        setCurtain(true);
        if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
        setTimeout(() => {
            if ('startViewTransition' in document) {
                const transition = (document as unknown as { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition(() => router.push(`/build?size=${size}`));
                // "Transition was skipped" AbortErrors are expected/benign here
                // (e.g. rapid navigation) — nothing to handle, just don't let
                // them surface as unhandled rejections in the console.
                transition.ready.catch(() => {});
            } else {
                router.push(`/build?size=${size}`);
            }
        }, 260);
    }, [router]);

    if (!ready) return <div style={{ minHeight: '100dvh', background: '#020a02' }} />;

    const card = MAIN_CARDS[activeIdx];

    return (
        <div style={{
            minHeight: '100dvh', width: '100%', position: 'relative',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', overflowX: 'hidden', overflowY: 'auto', userSelect: 'none',
            background: 'url(/homepage-assets/BG_8K.webp) center center / cover no-repeat, #020a02',
        }}>
            <style>{`
                /* On short viewports the logo+carousel+reviews+nav stack can
                   exceed the visible height (real mobile browsers report a
                   viewport shorter than the device screen once chrome/home-
                   indicator space is subtracted). globals.css locks body
                   scroll app-wide for the gesture-heavy pages; override it
                   here so the nav is always reachable by scroll instead of
                   being clipped. */
                html, body { height: auto !important; min-height: 100%; overflow-y: auto !important; }
                @keyframes pageIn   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
                @keyframes pageOut  { to{opacity:0;transform:scale(0.96)} }
                @keyframes logoIn   { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }
                @keyframes labelIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
                @keyframes burst    { from{transform:scale(0)} to{transform:scale(55)} }
                @keyframes swipeHint{ 0%,100%{transform:translateX(0);opacity:0.55} 40%{transform:translateX(-7px);opacity:0.9} 65%{transform:translateX(7px);opacity:0.9} }
                @keyframes swipeHintFade{ 0%,80%{opacity:1} 100%{opacity:0} }
                @keyframes glowFade { 0%,100%{opacity:0.5} 50%{opacity:1} }
                @keyframes snapGlow      { 0%{box-shadow:0 0 30px rgba(240,200,50,0.4)} 100%{box-shadow:0 0 0px rgba(240,200,50,0)} }
                @keyframes toastIn       { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
                @keyframes sizePickerIn  { from{opacity:0;transform:scale(0.93) translateY(24px)} to{opacity:1;transform:none} }
                @keyframes sizePickerOut { to{opacity:0;transform:scale(0.96) translateY(-10px)} }
                @keyframes cardCascade   { from{opacity:0;transform:translateY(26px) scale(0.86)} to{opacity:1;transform:none} }
                @keyframes priceBadge    { from{opacity:0;transform:translateY(8px) scale(0.75)} to{opacity:1;transform:none} }
                @keyframes stepGlow      { 0%,100%{opacity:0.55} 50%{opacity:1} }
            `}</style>

            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.2) 50%,rgba(0,0,0,0.62) 100%)' }} />
            </div>

            <Particles />

            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 2, padding: '44px 20px 0', paddingTop: 'max(44px, env(safe-area-inset-top))', animation: 'logoIn 0.6s cubic-bezier(0.34,1.3,0.64,1) both' }}>
                <Image src="/homepage-assets/logo.webp" alt="BariBali" width={220} height={140}
                    style={{ width: '180px', height: 'auto', filter: 'drop-shadow(0 0 32px rgba(240,200,50,0.5)) drop-shadow(0 4px 14px rgba(0,0,0,0.65))' }} priority />
            </div>

            {/* ── Card Carousel — main menu ── */}
            <div style={{ position: 'relative', zIndex: 2, width: '100%', flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                {/* Stage: position:relative is the containing block; left:50% on each card = guaranteed center */}
                <div
                    style={{
                        position: 'relative', width: '100%', height: '290px',
                        cursor: 'grab', touchAction: 'none', overflow: 'visible',
                        animation: 'pageIn 0.7s cubic-bezier(0.34,1.15,0.64,1) 0.08s both',
                    }}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                >
                    {MAIN_CARDS.map((mc, i) => {
                        // eff: fractional offset from center. 0 = center, ±1 = side, between during drag
                        const eff = (i - activeIdx) + dragX / 152;
                        const absEff = Math.abs(eff);
                        const isActive = i === activeIdx && !dragging.current;

                        // Transform components — perspective() is per-element so no shared vanishing point issues
                        const tx   = eff * 138;                                  // px left/right
                        const ry   = eff * 46;                                   // coverflow tilt: side cards face inward toward center
                        const sc   = 1 - Math.min(absEff, 1) * 0.44;            // 1.0 → 0.56
                        const op   = 1 - Math.min(absEff, 1.1) * 0.55;          // 1.0 → 0.45
                        const zIdx = Math.round(10 - absEff * 5);

                        const tr = dragging.current ? 'none'
                            : 'transform 0.46s cubic-bezier(0.34,1.56,0.64,1), opacity 0.36s ease, border-color 0.3s, box-shadow 0.6s';

                        const isGlowing = glowCard === i;
                        const glowShadow = isGlowing ? ', 0 0 30px rgba(240,200,50,0.4)' : '';

                        return (
                            <div
                                key={mc.id}
                                onClick={() => handleCardTap(i)}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    width: `${M_W}px`, height: `${M_H}px`,
                                    marginLeft: `${-M_W / 2}px`, marginTop: `${-M_H / 2}px`,
                                    // perspective() inline = each card has its own vanishing point, always centered
                                    transform: `perspective(800px) translateX(${tx}px) rotateY(${ry}deg) scale(${sc})`,
                                    opacity: op,
                                    zIndex: zIdx,
                                    cursor: 'pointer',
                                    transition: tr,
                                }}
                            >
                                {/* Pulsing halo behind the active card — a static radial
                                    gradient whose OPACITY animates (compositor-only), replacing
                                    the old glowPulse filter:drop-shadow keyframes which forced
                                    a full repaint every frame. */}
                                {isActive && (
                                    <div aria-hidden style={{
                                        position: 'absolute', inset: '-28px', zIndex: -1,
                                        borderRadius: '40px', pointerEvents: 'none',
                                        background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(240,200,50,0.5) 0%, rgba(240,200,50,0.16) 50%, transparent 72%)',
                                        animation: 'glowFade 2.4s ease-in-out infinite',
                                    }} />
                                )}
                                {/* Tilt/glare wrapper — kept on a separate node from the coverflow
                                    transform above so the two don't fight over the same style. */}
                                <Tilt
                                    tiltEnable={!reducedMotion}
                                    glareEnable={!reducedMotion}
                                    tiltMaxAngleX={8}
                                    tiltMaxAngleY={8}
                                    glareMaxOpacity={0.18}
                                    glareColor="var(--color-gold-deep)"
                                    glarePosition="all"
                                    glareBorderRadius="18px"
                                    transitionSpeed={400}
                                    onEnter={() => navigator.vibrate?.(8)}
                                    style={{
                                        width: '100%', height: '100%',
                                        borderRadius: '18px',
                                        overflow: 'hidden',
                                        border: isActive
                                            ? '1.5px solid rgba(240,200,50,0.55)'
                                            : '1px solid rgba(255,255,255,0.22)',
                                        boxShadow: isActive
                                            ? 'var(--shadow-card-glow)' + glowShadow
                                            : '0 6px 20px rgba(0,0,0,0.5)',
                                        position: 'relative',
                                    }}
                                >
                                    <Image
                                        src={mc.img} alt={mc.label} width={M_W} height={M_H}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block' }}
                                    />
                                    {mc.comingSoon && (
                                        <div aria-hidden style={{
                                            position: 'absolute', top: '10px', left: '-6px',
                                            padding: '3px 14px',
                                            background: 'linear-gradient(135deg, var(--color-gold-deep), var(--color-gold-bright))',
                                            color: 'var(--color-green-ink)',
                                            fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                            transform: 'rotate(-8deg)',
                                        }}>בקרוב</div>
                                    )}
                                </Tilt>
                            </div>
                        );
                    })}
                </div>

                {/* Dynamic card label — re-animates on each idx change */}
                <div key={`label-${activeIdx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '10px', animation: 'labelIn 0.28s ease both' }}>
                    <div style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '27px', fontWeight: 400, color: '#fff', letterSpacing: '0.01em', textShadow: '0 2px 14px rgba(0,0,0,0.9), 0 0 26px rgba(200,168,78,0.4)' }}>
                        {card.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
                        {card.sub}
                    </div>
                </div>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                    {MAIN_CARDS.map((_, i) => (
                        <div key={i} onClick={() => snapTo(i)} style={{
                            width: i === activeIdx ? '22px' : '7px', height: '7px', borderRadius: '4px',
                            background: i === activeIdx ? 'var(--color-gold-deep)' : 'rgba(255,255,255,0.45)',
                            transition: 'all 0.3s cubic-bezier(0.34,1.4,0.64,1)',
                            boxShadow: i === activeIdx ? '0 0 10px rgba(240,200,50,0.6)' : 'none',
                            cursor: 'pointer',
                        }} />
                    ))}
                </div>

                {/* Swipe hint — only on first visit, gold gradient arrow, fades after 2 cycles */}
                {showSwipeHint && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginTop: '10px',
                        animation: 'swipeHint 3s ease-in-out 0.8s 2 both, swipeHintFade 6.2s ease 0.8s forwards',
                    }}>
                        <span style={{
                            fontSize: '16px',
                            background: 'linear-gradient(135deg, var(--color-gold-deep), var(--color-gold-bright), var(--color-gold-light))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 900,
                        }}>{'◂'}</span>
                        <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                            background: 'linear-gradient(135deg, var(--color-gold-deep), var(--color-gold-bright))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>גרור לסיבוב</span>
                        <span style={{
                            fontSize: '16px',
                            background: 'linear-gradient(135deg, var(--color-gold-light), var(--color-gold-bright), var(--color-gold-deep))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 900,
                        }}>{'▸'}</span>
                    </div>
                )}
            </div>

            {/* Reviews strip */}
            <ReviewsStrip />

            {/* Bottom Nav */}
            <BariBottomNav />

            {/* Coming-soon toast — tortilla tap feedback */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 'max(20px, env(safe-area-inset-top))', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 210,
                    padding: '10px 22px', borderRadius: '999px',
                    background: 'linear-gradient(135deg,rgba(20,8,0,0.94),rgba(8,4,0,0.97))',
                    border: '1px solid rgba(240,200,50,0.45)',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
                    color: 'var(--color-gold-bright)', fontSize: '13px', fontWeight: 800,
                    whiteSpace: 'nowrap', animation: 'toastIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both',
                }}>{toast}</div>
            )}

            {/* Gold curtain burst */}
            {curtain && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'radial-gradient(ellipse,#ffe066 0%,#c8a832 50%,#2a5008 100%)', boxShadow: '0 0 70px 18px rgba(240,200,50,0.65)', animation: 'burst 0.42s cubic-bezier(0.4,0,0.2,1) forwards' }} />
                </div>
            )}

            {/* Cat popup — first-visit welcome */}
            {showCatPopup && <CatPopup onClose={dismissCatPopup} />}

            {/* Size picker overlay */}
            {sizePicker && <SizePicker onSelect={handleSizeSelect} onBack={() => setSizePicker(false)} />}

            {/* Login bottom sheet */}
            <BariModal open={loginSheet} onClose={() => setLoginSheet(false)} variant="sheet">
                <div style={{
                    position: 'relative',
                    padding: '8px 24px max(28px, env(safe-area-inset-bottom))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                }}>
                    <BariGlowBackground />
                    <Image src="/homepage-assets/card-login.png" alt="" width={160} height={200} style={{ width: '110px', height: 'auto', position: 'relative' }} />
                    <div style={{ position: 'relative', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7, maxWidth: '250px', fontWeight: 600 }}>
                        שמור סלטים · ראה היסטוריה · קבל המלצות והטבות
                    </div>
                    <button type="button" onClick={completeAuth} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 28px', borderRadius: '50px', background: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 800, color: '#1a1a1a', fontFamily: "var(--font-heebo), 'Heebo', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
                        <span style={{ fontSize: '17px', fontWeight: 900, color: '#4285F4' }}>G</span>
                        המשך עם Google
                    </button>
                    <BariButton
                        variant="secondary"
                        onClick={completeAuth}
                        fullWidth
                        style={{ position: 'relative', fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}
                    >
                        המשך כאורח
                    </BariButton>
                    <BariButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setLoginSheet(false)}
                        style={{ position: 'relative', border: 'none', color: 'rgba(255,255,255,0.4)', fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}
                    >
                        ביטול
                    </BariButton>
                </div>
            </BariModal>
        </div>
    );
}

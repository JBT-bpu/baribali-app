'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Tilt from 'react-parallax-tilt';
import { User } from 'lucide-react';
import ReviewsStrip from '@/components/ui/ReviewsStrip';
import CatPopup from '@/components/ui/CatPopup';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariButton, BariModal, BariGlowBackground, BariBottomNav } from '@/components/ui/bari';
import { usePrefersReducedMotion } from '@/lib/motionHooks';
import { useUser, avatarUrl } from '@/lib/auth';

// ─── Config ───────────────────────────────────────────────────────────────────
// Salad first — under RTL it renders on the right, where reading starts.
// Login is no longer a "product": it lives in the welcome step, the header
// profile chip, and the bottom nav instead.
const PRODUCT_CARDS = [
    { id: 'salad',    img: '/homepage-assets/card-salad.png',    label: 'בנה סלט',    sub: 'בחר מרכיבים · בחר גודל' },
    { id: 'tortilla', img: '/homepage-assets/card-tortilla.png', label: 'בנה טורטיה', sub: 'קמח מחיטה מלאה · בריא' },
];

const SIZE_CARDS = [
    { id: 'S', img: '/homepage-assets/size-s.png', tag: 'לתיאבון קליל', sub: '₪54 · 1-2 מנות' },
    { id: 'M', img: '/homepage-assets/size-m.png', tag: 'המאוזן המושלם', sub: '₪59 · 2-3 מנות' },
    { id: 'L', img: '/homepage-assets/size-l.png', tag: 'לרעבים אמיתיים', sub: '₪72 · 3-4 מנות' },
];

// Relative visual heights for the size-comparison scale below the title —
// not to scale with real ml, just enough of a size cue to read at a glance.
const SIZE_SCALE_HEIGHTS = [26, 38, 52];

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
    const { user } = useUser();

    // ── Screen state ──
    const [sizePicker, setSizePicker] = useState(false);
    const [loginSheet, setLoginSheet] = useState(false);
    const [curtain, setCurtain]       = useState(false);
    const [ready, setReady]           = useState(false);

    // The guest-or-Google gate now lives on the app's front door (src/app/page.tsx),
    // not as an overlay here.

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

    useEffect(() => { setReady(true); router.prefetch('/build'); }, [router]);

    const handleProductTap = (id: string) => {
        if (navigator.vibrate) navigator.vibrate(18);
        if (id === 'tortilla') router.push('/build?type=tortilla');
        else setSizePicker(true);
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

    if (!ready) return <div style={{ minHeight: '100vh', background: '#020a02' }} />;

    const avatar = user ? avatarUrl(user) : null;

    return (
        <div style={{
            minHeight: '100vh', width: '100%', position: 'relative',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', overflow: 'hidden', userSelect: 'none',
            background: 'url(/homepage-assets/BG_8K.webp) center center / cover no-repeat, #020a02',
        }}>
            <style>{`
                @keyframes pageIn   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
                @keyframes pageOut  { to{opacity:0;transform:scale(0.96)} }
                @keyframes logoIn   { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }
                @keyframes labelIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
                @keyframes burst    { from{transform:scale(0)} to{transform:scale(55)} }
                @keyframes glowFade { 0%,100%{opacity:0.5} 50%{opacity:1} }
                @keyframes snapGlow      { 0%{box-shadow:0 0 30px rgba(240,200,50,0.4)} 100%{box-shadow:0 0 0px rgba(240,200,50,0)} }
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

            {/* Header: profile chip + centered logo (spacer balances the chip so the logo stays centered) */}
            <div style={{
                position: 'relative', zIndex: 2, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))',
                animation: 'logoIn 0.6s cubic-bezier(0.34,1.3,0.64,1) both',
            }}>
                <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(8); user ? router.push('/profile') : setLoginSheet(true); }}
                    aria-label={user ? 'הפרופיל שלי' : 'התחברות'}
                    style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        border: '2px solid rgba(200,168,78,0.4)', cursor: 'pointer',
                        background: avatar ? `url(${avatar}) center / cover` : 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    }}
                >
                    {!avatar && <User size={17} color="rgba(255,255,255,0.65)" strokeWidth={2.3} />}
                </button>

                <Image src="/homepage-assets/logo.webp" alt="BariBali" width={220} height={140}
                    style={{ width: '150px', height: 'auto', filter: 'drop-shadow(0 0 32px rgba(240,200,50,0.5)) drop-shadow(0 4px 14px rgba(0,0,0,0.65))' }} priority />

                <div style={{ width: '38px', flexShrink: 0 }} aria-hidden />
            </div>

            {/* ── Product pick — salad and tortilla, both visible, one tap ── */}
            <div style={{ position: 'relative', zIndex: 2, width: '100%', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    display: 'flex', gap: '16px', width: '100%', padding: '0 20px', justifyContent: 'center',
                    animation: 'pageIn 0.7s cubic-bezier(0.34,1.15,0.64,1) 0.08s both',
                }}>
                    {PRODUCT_CARDS.map((p, i) => (
                        <div
                            key={p.id}
                            onClick={() => handleProductTap(p.id)}
                            style={{
                                flex: '1 1 0', maxWidth: '172px', cursor: 'pointer',
                                animation: `cardCascade 0.5s cubic-bezier(0.22,1.2,0.36,1) ${i * 90}ms both`,
                            }}
                        >
                            <div style={{ position: 'relative' }}>
                                {/* Ambient halo — same compositor-only opacity pulse as the old active-card glow */}
                                <div aria-hidden style={{
                                    position: 'absolute', inset: '-16px', zIndex: -1,
                                    borderRadius: '34px', pointerEvents: 'none',
                                    background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(240,200,50,0.35) 0%, rgba(240,200,50,0.1) 50%, transparent 72%)',
                                    animation: 'glowFade 2.8s ease-in-out infinite',
                                }} />
                                <Tilt
                                    tiltEnable={!reducedMotion}
                                    glareEnable={!reducedMotion}
                                    tiltMaxAngleX={7}
                                    tiltMaxAngleY={7}
                                    glareMaxOpacity={0.18}
                                    glareColor="var(--color-gold-deep)"
                                    glarePosition="all"
                                    glareBorderRadius="18px"
                                    transitionSpeed={400}
                                    onEnter={() => navigator.vibrate?.(8)}
                                    style={{
                                        borderRadius: '18px', overflow: 'hidden', position: 'relative',
                                        border: '1.5px solid rgba(240,200,50,0.45)',
                                        boxShadow: 'var(--shadow-card-glow)',
                                    }}
                                >
                                    <Image
                                        src={p.img} alt={p.label} width={172} height={230}
                                        style={{ width: '100%', height: 'auto', objectFit: 'cover', pointerEvents: 'none', display: 'block' }}
                                    />
                                </Tilt>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <div style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '19px', fontWeight: 400, color: '#fff', letterSpacing: '0.01em', textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(200,168,78,0.4)' }}>
                                    {p.label}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em', marginTop: '2px' }}>
                                    {p.sub}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reviews strip */}
            <ReviewsStrip />

            {/* Bottom Nav */}
            <BariBottomNav />

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

            {/* Login bottom sheet — a quick, in-place offer, never a gate.
                Reachable from the header profile chip; ordering never routes
                through here. */}
            <BariModal open={loginSheet} onClose={() => setLoginSheet(false)} variant="sheet">
                <div style={{
                    position: 'relative',
                    padding: '8px 24px max(28px, env(safe-area-inset-bottom))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                }}>
                    <BariGlowBackground />
                    <Image src="/homepage-assets/card-login.png" alt="" width={160} height={200} style={{ width: '110px', height: 'auto', position: 'relative' }} />
                    <div style={{ position: 'relative', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7, maxWidth: '250px', fontWeight: 600 }}>
                        שמור היסטוריית הזמנות · כניסה מהירה בפעם הבאה
                    </div>
                    <GoogleSignInButton />
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

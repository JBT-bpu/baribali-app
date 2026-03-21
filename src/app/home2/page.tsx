'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ─── Config ───────────────────────────────────────────────────────────────────
const MAIN_CARDS = [
    { id: 'tortilla', img: '/homepage-assets/card-tortilla.png', label: 'בנה טורטיה',  sub: 'קמח מחיטה מלאה · בריא · טעים' },
    { id: 'salad',    img: '/homepage-assets/card-salad.png',    label: 'בנה סלט',     sub: 'בחר מרכיבים · בחר גודל · הגש' },
    { id: 'login',    img: '/homepage-assets/card-login.png',    label: 'כניסה / פרופיל', sub: 'שמור סלטים · קבל המלצות' },
];

const SIZE_CARDS = [
    { id: 'S', img: '/homepage-assets/size-s.png', sub: '₪54 · 1-2 מנות' },
    { id: 'M', img: '/homepage-assets/size-m.png', sub: '₪59 · 2-3 מנות' },
    { id: 'L', img: '/homepage-assets/size-l.png', sub: '₪72 · 3-4 מנות' },
];

// Main carousel — card dimensions
const M_W = 192;   // card width px
const M_H = 268;   // card height px

// Size carousel — card dimensions
const S_W = 210;
const S_H = 272;

// ─── useTwoTap ────────────────────────────────────────────────────────────────
function useTwoTap(onConfirm: () => void) {
    const [tapped, setTapped] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const tap = useCallback(() => {
        if (tapped) {
            if (timer.current) clearTimeout(timer.current);
            setTapped(false);
            onConfirm();
            if (navigator.vibrate) navigator.vibrate([20, 40, 60]);
        } else {
            setTapped(true);
            if (navigator.vibrate) navigator.vibrate(18);
            timer.current = setTimeout(() => setTapped(false), 3500);
        }
    }, [tapped, onConfirm]);

    const reset = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setTapped(false);
    }, []);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return { tapped, tap, reset };
}

// ─── Particles ────────────────────────────────────────────────────────────────
function Particles() {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d')!;
        const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);
        const sparkCols = ['#f0c832', '#ffe066', '#f0a820', '#c8d830', '#fffacc'];
        const bokehCols = ['#c8a832', '#f0d060', '#ffe066', '#d4a820'];
        type Spark = { x: number; y: number; r: number; s: number; o: number; col: string; d: number; ph: number };
        type Bokeh = { x: number; y: number; r: number; s: number; o: number; col: string; ph: number };
        const sparks: Spark[] = Array.from({ length: 55 }, () => ({
            x: Math.random() * c.width, y: Math.random() * c.height,
            r: Math.random() * 2.2 + 0.5, s: Math.random() * 0.5 + 0.12,
            o: Math.random() * 0.35 + 0.08, col: sparkCols[Math.floor(Math.random() * sparkCols.length)],
            d: (Math.random() - 0.5) * 0.24, ph: Math.random() * Math.PI * 2,
        }));
        const bokeh: Bokeh[] = Array.from({ length: 10 }, () => ({
            x: Math.random() * c.width, y: c.height * 0.4 + Math.random() * c.height * 0.6,
            r: Math.random() * 28 + 14, s: Math.random() * 0.08 + 0.02,
            o: Math.random() * 0.06 + 0.02, col: bokehCols[Math.floor(Math.random() * bokehCols.length)],
            ph: Math.random() * Math.PI * 2,
        }));
        let raf: number, t = 0;
        const draw = () => {
            t += 0.012; ctx.clearRect(0, 0, c.width, c.height);
            for (const b of bokeh) {
                b.y -= b.s; b.x += Math.sin(t * 0.4 + b.ph) * 0.18;
                b.o = 0.02 + Math.sin(t * 0.5 + b.ph) * 0.04 + 0.025;
                if (b.y < -b.r * 2) { b.y = c.height + b.r; b.x = Math.random() * c.width; }
                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
                grad.addColorStop(0, b.col); grad.addColorStop(1, 'transparent');
                ctx.save(); ctx.globalAlpha = Math.min(0.12, Math.max(0, b.o));
                ctx.fillStyle = grad; ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            for (const p of sparks) {
                p.y -= p.s; p.x += p.d + Math.sin(t + p.ph) * 0.12;
                p.o = 0.06 + Math.sin(t * 0.9 + p.ph) * 0.22 + 0.1;
                if (p.y < -6) { p.y = c.height + 6; p.x = Math.random() * c.width; }
                if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
                ctx.save(); ctx.globalAlpha = Math.min(0.65, Math.max(0, p.o));
                ctx.shadowBlur = p.r * 6; ctx.shadowColor = p.col;
                ctx.fillStyle = p.col; ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />;
}

// ─── Size Picker ──────────────────────────────────────────────────────────────
function SizePicker({ onSelect, onBack }: { onSelect: (s: string) => void; onBack: () => void }) {
    const [activeIdx, setActiveIdx] = useState(1);
    const [dragX, setDragX]         = useState(0);
    const [out, setOut]             = useState(false);
    const dragging = useRef(false);
    const startX   = useRef(0);
    const dragged  = useRef(false);

    const snapTo = (idx: number) => {
        if (idx < 0 || idx >= SIZE_CARDS.length) return;
        if (navigator.vibrate) navigator.vibrate(16);
        setActiveIdx(idx);
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
            background: 'rgba(2,6,2,0.95)', backdropFilter: 'blur(24px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', direction: 'rtl',
            fontFamily: "'Heebo',sans-serif",
            animation: out ? 'pageOut 0.28s ease forwards' : 'pageIn 0.4s cubic-bezier(0.34,1.3,0.64,1) both',
        }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(240,200,50,0.65)', letterSpacing: '0.16em' }}>בחר גודל</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>כמה אתם רעבים?</div>

            {/* Stage — same reliable centering as main carousel */}
            <div
                style={{ position: 'relative', width: '100%', height: '310px', cursor: 'grab', touchAction: 'none', overflow: 'visible' }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            >
                {SIZE_CARDS.map((card, i) => {
                    const eff    = (i - activeIdx) + dragX / 148;
                    const absEff = Math.abs(eff);
                    const isActive = i === activeIdx && !dragging.current;

                    const tx  = eff * 138;
                    const ry  = eff * 46;                              // coverflow: face inward
                    const sc  = 1 - Math.min(absEff, 1) * 0.44;
                    const op  = 1 - Math.min(absEff, 1.1) * 0.55;
                    const zIdx = Math.round(10 - absEff * 5);
                    const tr  = dragging.current ? 'none'
                        : 'transform 0.46s cubic-bezier(0.34,1.2,0.64,1), opacity 0.36s ease, border-color 0.3s, box-shadow 0.3s';

                    return (
                        <div key={card.id} onClick={() => handleCardTap(i)} style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: `${S_W}px`, height: `${S_H}px`,
                            marginLeft: `${-S_W / 2}px`, marginTop: `${-S_H / 2}px`,
                            transform: `perspective(800px) translateX(${tx}px) rotateY(${ry}deg) scale(${sc})`,
                            opacity: op,
                            zIndex: zIdx,
                            cursor: 'pointer',
                            transition: tr,
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: isActive ? '1.5px solid rgba(240,200,50,0.6)' : '1px solid rgba(255,255,255,0.07)',
                            boxShadow: isActive
                                ? '0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(240,200,50,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                                : '0 6px 20px rgba(0,0,0,0.5)',
                        }}>
                            <Image src={card.img} alt={`גודל ${card.id}`} width={S_W} height={S_H}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }} />
                        </div>
                    );
                })}
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '-8px' }}>
                {SIZE_CARDS.map((_, i) => (
                    <div key={i} onClick={() => snapTo(i)} style={{
                        width: i === activeIdx ? '22px' : '7px', height: '7px', borderRadius: '4px',
                        background: i === activeIdx ? '#f0c832' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.3s cubic-bezier(0.34,1.4,0.64,1)',
                        boxShadow: i === activeIdx ? '0 0 10px rgba(240,200,50,0.6)' : 'none', cursor: 'pointer',
                    }} />
                ))}
            </div>

            <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', minHeight: '20px' }}>
                {SIZE_CARDS[activeIdx].sub}
            </div>

            <button type="button" onClick={doConfirm} style={{
                padding: '14px 52px', borderRadius: '50px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#c8a832 0%,#f0d060 45%,#ffe066 55%,#c8a832 100%)',
                color: '#0d2e0d', fontSize: '17px', fontWeight: 900, fontFamily: "'Heebo',sans-serif",
                boxShadow: '0 0 40px rgba(240,200,50,0.5),0 4px 20px rgba(0,0,0,0.4)',
                opacity: out ? 0 : 1, transition: 'opacity 0.2s',
            }}>
                בנה סלט ←
            </button>

            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Heebo',sans-serif", marginTop: '-4px' }}>
                ← חזרה
            </button>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeV2() {
    const router = useRouter();

    // ── Carousel state ──
    const [activeIdx, setActiveIdx]   = useState(1);   // salad in center by default
    const [dragX, setDragX]           = useState(0);
    const dragging = useRef(false);
    const startX   = useRef(0);
    const dragged  = useRef(false);

    // ── Screen state ──
    const [sizePicker, setSizePicker] = useState(false);
    const [loginSheet, setLoginSheet] = useState(false);
    const [curtain, setCurtain]       = useState(false);
    const [ready, setReady]           = useState(false);

    // ── Salad two-tap ──
    const { tapped: saladTapped, tap: saladTap, reset: saladReset } = useTwoTap(() => setSizePicker(true));

    useEffect(() => { setReady(true); router.prefetch('/build'); }, [router]);

    const snapTo = useCallback((idx: number) => {
        if (idx < 0 || idx >= MAIN_CARDS.length) return;
        if (navigator.vibrate) navigator.vibrate(12);
        setActiveIdx(idx);
        if (idx !== 1) saladReset();
    }, [saladReset]);

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
            // RTL: swipe right → go to lower index (tortilla), swipe left → higher (login)
            snapTo(delta < 0 ? activeIdx + 1 : activeIdx - 1);
        }
    };

    const handleCardTap = (idx: number) => {
        if (dragged.current) return;
        if (idx !== activeIdx) { snapTo(idx); return; }
        // Active card — trigger its action
        if (navigator.vibrate) navigator.vibrate(18);
        if (idx === 0) { /* tortilla — coming soon, no-op */ }
        else if (idx === 1) saladTap();
        else if (idx === 2) setLoginSheet(true);
    };

    const handleSizeSelect = useCallback((size: string) => {
        setSizePicker(false);
        setCurtain(true);
        if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
        setTimeout(() => {
            if ('startViewTransition' in document) {
                (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => router.push(`/build?size=${size}`));
            } else {
                router.push(`/build?size=${size}`);
            }
        }, 260);
    }, [router]);

    if (!ready) return <div style={{ minHeight: '100vh', background: '#020a02' }} />;

    const card = MAIN_CARDS[activeIdx];

    return (
        <div style={{
            minHeight: '100vh', width: '100%', position: 'relative',
            fontFamily: "'Heebo',sans-serif", direction: 'rtl',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', overflow: 'hidden', userSelect: 'none',
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800;900&display=swap" rel="stylesheet" />
            <style>{`
                @keyframes pageIn   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
                @keyframes pageOut  { to{opacity:0;transform:scale(0.96)} }
                @keyframes logoIn   { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }
                @keyframes labelIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
                @keyframes navIn    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
                @keyframes burst    { from{transform:scale(0)} to{transform:scale(55)} }
                @keyframes hint     { 0%,100%{opacity:1} 50%{opacity:0.45} }
                @keyframes sheetUp  { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:none} }
                @keyframes swipeHint{ 0%,100%{transform:translateX(0);opacity:0.35} 40%{transform:translateX(-7px);opacity:0.7} 65%{transform:translateX(7px);opacity:0.7} }
                @keyframes glowPulse{ 0%,100%{filter:drop-shadow(0 0 22px rgba(240,200,50,.7)) drop-shadow(0 0 55px rgba(240,200,50,.3))} 50%{filter:drop-shadow(0 0 40px rgba(240,200,50,1)) drop-shadow(0 0 90px rgba(240,200,50,.55))} }
                @keyframes greenGlow{ 0%,100%{filter:drop-shadow(0 0 22px rgba(90,220,40,.7)) drop-shadow(0 0 55px rgba(90,220,40,.3))} 50%{filter:drop-shadow(0 0 42px rgba(90,220,40,1)) drop-shadow(0 0 95px rgba(90,220,40,.6))} }
            `}</style>

            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Image src="/homepage-assets/bg.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center top' }} priority />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.2) 50%,rgba(0,0,0,0.62) 100%)' }} />
            </div>

            <Particles />

            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 2, padding: '44px 20px 0', animation: 'logoIn 0.6s cubic-bezier(0.34,1.3,0.64,1) both' }}>
                <Image src="/homepage-assets/logo.png" alt="BariBali" width={220} height={140}
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
                        const isSaladActive = i === 1 && saladTapped;

                        // Transform components — perspective() is per-element so no shared vanishing point issues
                        const tx   = eff * 138;                                  // px left/right
                        const ry   = eff * 46;                                   // coverflow tilt: side cards face inward toward center
                        const sc   = 1 - Math.min(absEff, 1) * 0.44;            // 1.0 → 0.56
                        const op   = 1 - Math.min(absEff, 1.1) * 0.55;          // 1.0 → 0.45
                        const zIdx = Math.round(10 - absEff * 5);

                        const tr = dragging.current ? 'none'
                            : 'transform 0.46s cubic-bezier(0.34,1.2,0.64,1), opacity 0.36s ease, border-color 0.3s, box-shadow 0.3s';

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
                                    borderRadius: '18px',
                                    overflow: 'hidden',
                                    border: isActive
                                        ? (isSaladActive ? '1.5px solid rgba(90,220,40,0.6)' : '1.5px solid rgba(240,200,50,0.55)')
                                        : '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: isActive
                                        ? '0 20px 60px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)'
                                        : '0 6px 20px rgba(0,0,0,0.5)',
                                    animation: isActive
                                        ? (isSaladActive ? 'greenGlow 1.4s ease-in-out infinite' : 'glowPulse 2.4s ease-in-out infinite')
                                        : undefined,
                                }}
                            >
                                <Image
                                    src={mc.img} alt={mc.label} width={M_W} height={M_H}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block' }}
                                />

                                {/* Two-tap hint on salad */}
                                {isSaladActive && (
                                    <div style={{
                                        position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
                                        fontSize: '11px', fontWeight: 800, color: '#fff',
                                        background: 'rgba(0,0,0,0.78)', padding: '5px 14px', borderRadius: '20px',
                                        whiteSpace: 'nowrap', animation: 'hint 0.85s ease-in-out infinite',
                                        backdropFilter: 'blur(6px)', border: '1px solid rgba(90,220,40,0.5)', zIndex: 10,
                                    }}>
                                        ← הקש שוב לאישור
                                    </div>
                                )}

                                {/* Coming soon badge on tortilla */}
                                {i === 0 && isActive && (
                                    <div style={{
                                        position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)',
                                        fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)',
                                        background: 'rgba(0,0,0,0.6)', padding: '3px 12px', borderRadius: '20px',
                                        backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap',
                                    }}>
                                        בקרוב...
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Dynamic card label — re-animates on each idx change */}
                <div key={`label-${activeIdx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '10px', animation: 'labelIn 0.28s ease both' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '0.01em', textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}>
                        {card.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.04em' }}>
                        {card.sub}
                    </div>
                </div>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                    {MAIN_CARDS.map((_, i) => (
                        <div key={i} onClick={() => snapTo(i)} style={{
                            width: i === activeIdx ? '22px' : '7px', height: '7px', borderRadius: '4px',
                            background: i === activeIdx ? '#f0c832' : 'rgba(255,255,255,0.2)',
                            transition: 'all 0.3s cubic-bezier(0.34,1.4,0.64,1)',
                            boxShadow: i === activeIdx ? '0 0 10px rgba(240,200,50,0.6)' : 'none',
                            cursor: 'pointer',
                        }} />
                    ))}
                </div>

                {/* Swipe hint — fades after 2 loops */}
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginTop: '10px', letterSpacing: '0.08em', animation: 'swipeHint 3s ease-in-out 0.8s 2 both' }}>
                    ← גרור לסיבוב →
                </div>
            </div>

            {/* Bottom Nav */}
            <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '10px 18px 28px', animation: 'navIn 0.6s ease 0.2s both' }}>
                <div style={{ position: 'relative', borderRadius: '50px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                    <Image src="/homepage-assets/nav-bg.png" alt="" width={1290} height={300}
                        style={{ width: '100%', height: '58px', objectFit: 'cover', objectPosition: 'center', display: 'block', opacity: 0.45 }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 8px' }}>
                        {[
                            { icon: '🏠', label: 'בית',      active: true  },
                            { icon: '🔍', label: 'חיפוש',    active: false },
                            { icon: '⭐', label: 'מועדפים',  active: false },
                            { icon: '📋', label: 'הזמנות',   active: false },
                            { icon: '👤', label: 'פרופיל',   active: false },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', opacity: item.active ? 1 : 0.45, cursor: 'pointer', padding: '4px 8px' }}>
                                <span style={{ fontSize: '20px', filter: item.active ? 'drop-shadow(0 0 10px #f0c832)' : 'none' }}>{item.icon}</span>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: item.active ? '#f0c832' : '#fff', letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gold curtain burst */}
            {curtain && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'radial-gradient(ellipse,#ffe066 0%,#c8a832 50%,#2a5008 100%)', boxShadow: '0 0 70px 18px rgba(240,200,50,0.65)', animation: 'burst 0.42s cubic-bezier(0.4,0,0.2,1) forwards' }} />
                </div>
            )}

            {/* Size picker overlay */}
            {sizePicker && <SizePicker onSelect={handleSizeSelect} onBack={() => { setSizePicker(false); saladReset(); }} />}

            {/* Login bottom sheet */}
            {loginSheet && (
                <div onClick={() => setLoginSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(3,12,3,0.97)', backdropFilter: 'blur(22px)',
                        borderRadius: '24px 24px 0 0', border: '1px solid rgba(240,200,50,0.12)',
                        padding: '24px 24px 44px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                        animation: 'sheetUp 0.35s cubic-bezier(0.34,1.4,0.64,1) both',
                    }}>
                        <div style={{ width: '38px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
                        <Image src="/homepage-assets/card-login.png" alt="" width={160} height={200} style={{ width: '110px', height: 'auto' }} />
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 1.7, maxWidth: '250px', fontWeight: 600 }}>
                            שמור סלטים · ראה היסטוריה · קבל המלצות אישיות
                        </div>
                        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 28px', borderRadius: '50px', background: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 800, color: '#1a1a1a', fontFamily: "'Heebo',sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
                            <span style={{ fontSize: '17px', fontWeight: 900, color: '#4285F4' }}>G</span>
                            המשך עם Google
                        </button>
                        <button type="button" onClick={() => setLoginSheet(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Heebo',sans-serif" }}>ביטול</button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { BariButton } from '@/components/ui/bari';
import GoldField from '@/components/ui/GoldField';
import { DropPour, POUR_END, SWEEP } from '@/components/transition/BowlDrop';
import { usePrefersReducedMotion } from '@/lib/motionHooks';
import { effectiveSizePrice } from '@/lib/menuConfig';

/**
 * Salad size picker — the single place the app asks "which size?".
 *
 * Shared deliberately: it is opened both from the landing roster (/home2, after
 * choosing the salad hero) and from the builder when someone lands on /build
 * without a size (deep link, bookmark). Previously the builder had its own plain
 * list, so the same decision had two different UIs — this component is the fix.
 *
 * Motion matches the hero selector: a DISCRETE coverflow where a swipe steps the
 * index and CSS transitions glide the cards once per step (no per-pointermove
 * re-render), plus a gold sheen + rim flash as each card lands. Prices come from
 * the effective-price layer, so the manager admin drives them.
 *
 * `onSelect` receives the card id ('S' | 'M' | 'L'). With `dive`, confirming
 * plays the dive transition here — from this screen's own field, since this is
 * where the interaction happened — and `onSelect` fires at the hand-off so the
 * next page can pick the motion up. (The overlay owns its own stacking context,
 * so the transition has to live inside it to layer over the cards at all.)
 */

const SIZE_CARDS = [
    { id: 'S', ml: 750,  img: '/homepage-assets/size-s.png', tag: 'לתיאבון קליל', sub: `₪${effectiveSizePrice(750)} · 1-2 מנות` },
    { id: 'M', ml: 1000, img: '/homepage-assets/size-m.png', tag: 'המאוזן המושלם', sub: `₪${effectiveSizePrice(1000)} · 2-3 מנות` },
    { id: 'L', ml: 1500, img: '/homepage-assets/size-l.png', tag: 'לרעבים אמיתיים', sub: `₪${effectiveSizePrice(1500)} · 3-4 מנות` },
];

// Relative visual heights for the size-comparison cups — not to scale with real
// ml, just enough of a size cue to read at a glance.
const SIZE_SCALE_HEIGHTS = [26, 38, 52];

const S_W = 210;
const S_H = 272;
const NS = SIZE_CARDS.length;

export default function SizePicker({ onSelect, onBack, dive = false }: { onSelect: (s: string) => void; onBack: () => void; dive?: boolean }) {
    const reducedMotion = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(1); // default to M
    const [out, setOut] = useState(false);
    const [diving, setDiving] = useState(false);
    const startX = useRef<number | null>(null);
    const moved = useRef(false);
    const impulseRef = useRef(0); // swipe gust, shared with the field
    const dropRef = useRef(0);    // 0→1 rushes the field outward for the dive

    // `dir` (+1 / -1) gusts the gold field the way the cards moved, so a swipe
    // stirs the whole scene — same behaviour as the menu roster.
    const go = (idx: number, dir = 0) => {
        const next = ((idx % NS) + NS) % NS;
        if (next === activeIdx) return;
        navigator.vibrate?.(8);
        if (dir) impulseRef.current = dir * 26;
        setActiveIdx(next);
    };

    const onDown = (e: React.PointerEvent) => { startX.current = e.clientX; moved.current = false; };
    const onMove = (e: React.PointerEvent) => {
        if (startX.current !== null && Math.abs(e.clientX - startX.current) > 8) moved.current = true;
    };
    const onUp = (e: React.PointerEvent) => {
        if (startX.current === null) return;
        const delta = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(delta) < 36) return;
        go(delta > 0 ? activeIdx - 1 : activeIdx + 1, delta > 0 ? 1 : -1);
    };

    const handleCardTap = (idx: number) => {
        if (moved.current) return;
        if (idx !== activeIdx) { go(idx, idx > activeIdx ? 1 : -1); return; }
        doConfirm();
    };

    const doConfirm = () => {
        if (diving || out) return;
        navigator.vibrate?.([20, 50, 40]);
        if (!dive) { setOut(true); setTimeout(() => onSelect(SIZE_CARDS[activeIdx].id), 280); return; }
        // The field itself carries the transition: the motes accelerate upward
        // into trails while a veil closes, and the next page picks them up still
        // moving and slows them down. (Negative = upward.)
        setDiving(true);
        dropRef.current = SWEEP;
        setTimeout(() => onSelect(SIZE_CARDS[activeIdx].id), POUR_END + 30);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(3,8,3,0.88)',
            backdropFilter: 'blur(28px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 'min(12px, 2vh)', direction: 'rtl',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            overflowY: 'auto',
            animation: out ? 'sizePickerOut 0.28s ease forwards' : 'sizePickerIn 0.45s cubic-bezier(0.22,1.4,0.36,1) both',
        }}>
            <style>{KF}</style>

            {/* The same gold field as the menu, so the step doesn't look like a
                different app — and it reacts to swipes the same way. Normally
                behind the cards (above this overlay's scrim); during the dive it
                lifts over everything and rushes outward. */}
            <GoldField impulseRef={impulseRef} dropRef={dropRef} zIndex={diving ? 201 : -1} persistKey={dive ? 'bb-field' : undefined} />

            {/* Step breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>בנה סלט</span>
                <span style={{ fontSize: '10px', color: 'rgba(240,200,50,0.45)' }}>←</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-gold-deep)', letterSpacing: '0.06em', animation: 'stepGlow 2.2s ease-in-out infinite' }}>בחר גודל</span>
            </div>

            {/* Thin gold divider */}
            <div style={{ width: '44px', height: '1.5px', background: 'linear-gradient(90deg,transparent,rgba(240,200,50,0.35),transparent)', marginBottom: '-2px' }} />

            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>כמה אתם רעבים?</div>

            {/* Size-comparison cups — relative visual cue between S/M/L, tap to jump */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginTop: '2px', marginBottom: '2px' }}>
                {SIZE_CARDS.map((c, i) => {
                    const isOn = i === activeIdx;
                    return (
                        <div key={c.id} onClick={() => go(i, i > activeIdx ? 1 : -1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
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

            {/* Stage — discrete smooth coverflow (matches the hero menu) */}
            <div
                style={{ position: 'relative', width: '100%', height: 'clamp(210px, 40vh, 310px)', perspective: '900px', cursor: 'grab', touchAction: 'pan-y', overflow: 'visible' }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { startX.current = null; }}
            >
                {SIZE_CARDS.map((card, i) => {
                    let rel = i - activeIdx;
                    if (rel > NS / 2) rel -= NS;
                    if (rel < -NS / 2) rel += NS;
                    const isActive = rel === 0;
                    const side = rel > 0 ? -1 : 1;
                    const transform = isActive
                        ? 'translateX(0) translateZ(34px) rotateY(0deg) scale(1)'
                        : `translateX(${side * 140}px) translateZ(-104px) rotateY(${-side * 22}deg) scale(0.66)`;
                    const hidden = reducedMotion && !isActive;

                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardTap(i)}
                            style={{
                                position: 'absolute', top: '50%', left: '50%',
                                width: `${S_W}px`, height: `${S_H}px`,
                                marginLeft: `${-S_W / 2}px`, marginTop: `${-S_H / 2}px`,
                                transformOrigin: '50% 80%',
                                transform: reducedMotion ? (isActive ? 'none' : 'scale(0.9)') : transform,
                                opacity: hidden ? 0 : (isActive ? 1 : 0.5),
                                filter: isActive ? 'none' : 'brightness(0.8)',
                                zIndex: isActive ? 4 : 2,
                                pointerEvents: hidden ? 'none' : 'auto',
                                cursor: 'pointer',
                                transition: reducedMotion ? 'none' : 'transform 0.5s cubic-bezier(0.2,0.85,0.25,1.15), opacity 0.4s ease, filter 0.4s ease',
                            }}
                        >
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative',
                                border: isActive ? '1.5px solid rgba(240,200,50,0.65)' : '1px solid rgba(255,255,255,0.22)',
                                boxShadow: isActive ? 'var(--shadow-card-glow), var(--shadow-gold-glow-lg)' : '0 6px 20px rgba(0,0,0,0.5)',
                                background: 'linear-gradient(165deg, rgba(16,42,16,0.5), rgba(6,18,6,0.55))',
                            }}>
                                <Image
                                    src={card.img} alt={`גודל ${card.id}`} width={S_W} height={S_H}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }}
                                />

                                {/* Price badge — re-animates when this card becomes active */}
                                {isActive && (
                                    <div key={`price-${activeIdx}`} style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        display: 'flex', justifyContent: 'center', paddingBottom: '14px',
                                        animation: reducedMotion ? 'none' : 'priceBadge 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
                                    }}>
                                        <div style={{
                                            padding: '7px 20px', borderRadius: '20px',
                                            background: 'linear-gradient(135deg,rgba(20,8,0,0.92),rgba(8,4,0,0.96))',
                                            border: '1px solid rgba(240,200,50,0.45)', backdropFilter: 'blur(8px)',
                                            whiteSpace: 'nowrap', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                        }}>
                                            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-gold-bright)', marginBottom: '1px' }}>{card.tag}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-gold-deep)' }}>{card.sub}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Landing feedback — gold sheen sweep + rim flash on each new active card */}
                                {isActive && !reducedMotion && (
                                    <>
                                        <div key={`ssheen-${activeIdx}`} style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
                                            <div style={{ position: 'absolute', top: 0, bottom: 0, width: '55%', background: 'linear-gradient(105deg, transparent 0%, rgba(255,246,210,0) 38%, rgba(255,248,222,0.4) 50%, rgba(255,246,210,0) 62%, transparent 100%)', mixBlendMode: 'screen', animation: 'sizeSheen 0.9s ease 0.05s both' }} />
                                        </div>
                                        <div key={`srim-${activeIdx}`} style={{ position: 'absolute', inset: 0, borderRadius: '16px', zIndex: 5, pointerEvents: 'none', animation: 'sizeRim 0.6s ease both' }} aria-hidden />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* The cups above and the carousel itself already show the active size —
                no third indicator row. */}
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

            {/* Dive lives inside this overlay so it layers over the cards (an
                overlay's stacking context can't be entered from outside). */}
            {diving && <DropPour />}
        </div>
    );
}

const KF = `
@keyframes sizePickerIn  { from{opacity:0;transform:scale(0.93) translateY(24px)} to{opacity:1;transform:none} }
@keyframes sizePickerOut { to{opacity:0;transform:scale(0.96) translateY(-10px)} }
@keyframes priceBadge    { from{opacity:0;transform:translateY(8px) scale(0.75)} to{opacity:1;transform:none} }
@keyframes stepGlow      { 0%,100%{opacity:0.55} 50%{opacity:1} }
@keyframes sizeSheen     { from{transform:translateX(-160%) skewX(-16deg)} to{transform:translateX(300%) skewX(-16deg)} }
@keyframes sizeRim       { 0%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} 45%{box-shadow:inset 0 0 20px 1px rgba(240,200,50,0.5)} 100%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} }
`;

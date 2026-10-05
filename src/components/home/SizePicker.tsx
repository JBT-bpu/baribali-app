'use client';

import { useEffect, useRef, useState } from 'react';
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
    { id: 'S', name: 'קטן', ml: 750,  img: '/homepage-assets/salad-bowl-s-v2.webp', tag: 'קומפקטי', price: effectiveSizePrice(750) },
    { id: 'M', name: 'בינוני', ml: 1000, img: '/homepage-assets/salad-bowl-m-v2.webp', tag: 'הקלאסי', price: effectiveSizePrice(1000) },
    { id: 'L', name: 'גדול', ml: 1500, img: '/homepage-assets/salad-bowl-l-v2.webp', tag: 'הכי גדול שלנו', price: effectiveSizePrice(1500) },
];

const S_W = 210;
const S_H = 272;
const NS = SIZE_CARDS.length;

export default function SizePicker({ onSelect, onBack, dive = false, initialSize = 'M' }: { onSelect: (s: string) => void; onBack: () => void; dive?: boolean; initialSize?: string }) {
    const reducedMotion = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(() => {
        const initialIndex = SIZE_CARDS.findIndex(card => card.id === initialSize.toUpperCase());
        return initialIndex >= 0 ? initialIndex : 1;
    }); // default to M for an absent or invalid value
    const [out, setOut] = useState(false);
    const [diving, setDiving] = useState(false);
    const [closing, setClosing] = useState(false);
    const startX = useRef<number | null>(null);
    const moved = useRef(false);
    const impulseRef = useRef(0); // swipe gust, shared with the field
    const dropRef = useRef(0);    // 0→1 rushes the field outward for the dive
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restoreFocusRef = useRef(true);
    const interactionLockRef = useRef(false);

    // This is a real modal even though its visual treatment is a full-screen
    // overlay: keep keyboard focus inside it, stop the page behind it scrolling,
    // and return focus to the exact control that opened it when it is dismissed.
    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const frame = requestAnimationFrame(() => cardRefs.current[activeIdx]?.focus({ preventScroll: true }));

        return () => {
            cancelAnimationFrame(frame);
            if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
            document.body.style.overflow = previousOverflow;
            if (restoreFocusRef.current && previousFocus?.isConnected) {
                previousFocus.focus({ preventScroll: true });
            }
        };
        // `activeIdx` deliberately stays at its initial value here. Later
        // changes move focus only when the user uses the keyboard arrows.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // `dir` (+1 / -1) gusts the gold field the way the cards moved, so a swipe
    // stirs the whole scene — same behaviour as the menu roster.
    const go = (idx: number, dir = 0, focusCard = false) => {
        if (interactionLockRef.current || diving || out || closing) return;
        const next = ((idx % NS) + NS) % NS;
        if (next === activeIdx) return;
        navigator.vibrate?.(8);
        if (dir) impulseRef.current = dir * 26;
        setActiveIdx(next);
        if (focusCard) requestAnimationFrame(() => cardRefs.current[next]?.focus({ preventScroll: true }));
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

    const handleCardTap = (idx: number, event: React.MouseEvent) => {
        // A pointer-generated click follows pointerup after a swipe. Keyboard
        // activation has detail=0 and must remain usable even after a swipe.
        if (moved.current && event.detail !== 0) return;
        if (idx !== activeIdx) go(idx, idx > activeIdx ? 1 : -1);
    };

    const doConfirm = () => {
        if (interactionLockRef.current || diving || out || closing) return;
        interactionLockRef.current = true;
        const selected = SIZE_CARDS[activeIdx].id;
        restoreFocusRef.current = false;
        navigator.vibrate?.([20, 50, 40]);
        if (reducedMotion) {
            // Even without an exit animation, expose the hand-off state while
            // router navigation completes instead of leaving controls that
            // look enabled but are blocked by the synchronous interaction lock.
            setClosing(true);
            onSelect(selected);
            return;
        }
        if (!dive) {
            setOut(true);
            handoffTimerRef.current = setTimeout(() => onSelect(selected), 280);
            return;
        }
        // The field itself carries the transition: the motes accelerate upward
        // into trails while a veil closes, and the next page picks them up still
        // moving and slows them down. (Negative = upward.)
        setDiving(true);
        dropRef.current = SWEEP;
        handoffTimerRef.current = setTimeout(() => onSelect(selected), POUR_END + 30);
    };

    const handleBack = () => {
        if (interactionLockRef.current || diving || out || closing) return;
        interactionLockRef.current = true;
        setClosing(true);
        onBack();
    };

    const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            handleBack();
            return;
        }

        if (!closing && !diving && !out && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
            event.preventDefault();
            // The higher index is the card visually to the left in this RTL
            // coverflow, so the physical arrow direction stays intuitive.
            const delta = event.key === 'ArrowLeft' ? 1 : -1;
            go(activeIdx + delta, event.key === 'ArrowLeft' ? -1 : 1, true);
            return;
        }

        if (event.key !== 'Tab') return;
        const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]') ?? [],
        ).filter(element => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const current = document.activeElement;
        if (event.shiftKey && (current === first || !dialogRef.current?.contains(current))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-picker-title"
            aria-describedby="size-picker-instructions"
            aria-busy={closing || out || diving}
            onKeyDown={handleDialogKeyDown}
            style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(3,8,3,0.88)',
            backdropFilter: 'blur(28px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            // `safe center` — plain `center` centres the stack and then puts the
            // overflow equally above and below on a short screen, and the part
            // above the top edge cannot be scrolled to. `safe` falls back to
            // start-alignment the moment it would overflow, so the breadcrumb
            // and title stay reachable on a small phone.
            justifyContent: 'safe center', gap: 'min(12px, 2vh)', direction: 'rtl',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
            animation: reducedMotion ? 'none' : (out ? 'sizePickerOut 0.28s ease forwards' : 'sizePickerIn 0.45s cubic-bezier(0.22,1.4,0.36,1) both'),
        }}>
            <style>{KF}</style>
            <span id="size-picker-instructions" style={SR_ONLY}>
                בחרו גודל. אפשר להשתמש בחצים ימינה ושמאלה, ואז בכפתור בנה סלט כדי להמשיך.
            </span>
            <span aria-live="polite" style={SR_ONLY}>
                נבחר גודל {SIZE_CARDS[activeIdx].name}, {SIZE_CARDS[activeIdx].ml} מיליליטר
            </span>

            {/* The same gold field as the menu, so the step doesn't look like a
                different app — and it reacts to swipes the same way. Normally
                behind the cards (above this overlay's scrim); during the dive it
                lifts over everything and rushes outward. */}
            <GoldField impulseRef={impulseRef} dropRef={dropRef} density={0.55} zIndex={diving ? 201 : -1} persistKey={dive ? 'bb-field' : undefined} />

            {/* Step breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em' }}>בנה סלט</span>
                <span style={{ fontSize: '10px', color: 'rgba(240,200,50,0.45)' }}>←</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e6d18b', letterSpacing: '0.04em' }}>בחר גודל</span>
            </div>

            {/* Thin gold divider */}
            <div style={{ width: '44px', height: '1.5px', background: 'linear-gradient(90deg,transparent,rgba(240,200,50,0.35),transparent)', marginBottom: '-2px' }} />

            <h2 id="size-picker-title" style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#fff' }}>כמה אתם רעבים?</h2>

            {/* Size-comparison cups — relative visual cue between S/M/L, tap to jump */}
            <div role="group" aria-label="בחירת גודל מהירה" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginTop: '2px', marginBottom: '2px' }}>
                {SIZE_CARDS.map((c, i) => {
                    const isOn = i === activeIdx;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            className="sizePickerCup"
                            aria-label={`בחרו גודל ${c.name} (${c.id}), ${c.ml} מיליליטר`}
                            aria-pressed={isOn}
                            disabled={closing || out || diving}
                            onClick={() => go(i, i > activeIdx ? 1 : -1)}
                            style={{
                                minWidth: '48px', minHeight: '64px', padding: '4px 8px', border: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                                gap: '6px', cursor: 'pointer', color: 'inherit', background: 'transparent', position: 'relative',
                            }}
                        >
                            <Image src={c.img} alt="" aria-hidden width={48} height={40} sizes="48px" style={{ width: '48px', height: '40px', objectFit: 'contain', opacity: isOn ? 1 : 0.65 }} />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isOn ? '#fff0b0' : '#c9d7c5', transition: 'color 0.3s ease' }}>{c.id}</span>
                            {isOn && <span aria-hidden style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '10px', fontWeight: 900, color: '#fff3a8' }}>✓</span>}
                        </button>
                    );
                })}
            </div>

            {/* Stage — discrete smooth coverflow (matches the hero menu) */}
            <div
                style={{ position: 'relative', width: '100%', height: 'clamp(210px, 40vh, 310px)', perspective: '900px', cursor: 'grab', touchAction: 'pan-y pinch-zoom', overflow: 'visible' }}
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
                        <button
                            key={card.id}
                            ref={element => { cardRefs.current[i] = element; }}
                            type="button"
                            className="sizePickerCard"
                            aria-label={`גודל ${card.name} (${card.id}), ${card.ml} מיליליטר, ${card.tag}, ${card.price} שקלים${isActive ? ', נבחר' : ''}`}
                            aria-pressed={isActive}
                            aria-hidden={hidden || undefined}
                            tabIndex={isActive ? 0 : -1}
                            disabled={closing || out || diving}
                            onClick={(event) => handleCardTap(i, event)}
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
                                border: 0, padding: 0, color: 'inherit', background: 'transparent',
                                transition: reducedMotion ? 'none' : 'transform 0.5s cubic-bezier(0.2,0.85,0.25,1.15), opacity 0.4s ease, filter 0.4s ease',
                            }}
                        >
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative',
                                border: isActive ? '1.5px solid rgba(240,200,50,0.65)' : '1px solid rgba(255,255,255,0.22)',
                                boxShadow: isActive ? 'var(--shadow-card-glow), var(--shadow-gold-glow-lg)' : '0 6px 20px rgba(0,0,0,0.5)',
                                background: '#0b2113',
                            }}>
                                <Image
                                    src={card.img} alt="" aria-hidden width={S_W} height={S_H} sizes="210px"
                                    style={{ width: '100%', height: '58%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }}
                                />

                                {/* Food-only artwork. Every size, price and volume
                                    is native text from the effective-price layer. */}
                                <div style={{
                                    position: 'absolute', zIndex: 3, left: 0, right: 0, bottom: 0, height: '42%',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: '7px 10px 10px', textAlign: 'center',
                                    background: '#081b10',
                                    borderTop: '1px solid rgba(225,200,117,0.2)',
                                }}>
                                    <div
                                        key={isActive ? `live-price-${activeIdx}` : `live-price-${card.id}`}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            animation: isActive && !reducedMotion ? 'priceBadge 0.32s cubic-bezier(0.34,1.4,0.64,1) both' : 'none',
                                        }}
                                    >
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff3ce' }}>{card.name} · {card.id}</div>
                                        <div style={{ fontSize: '30px', lineHeight: 1.05, fontWeight: 950, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                                            ₪{card.price}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#c9d7c5', marginTop: '4px' }}>
                                            {card.ml} מ״ל · {card.tag}
                                        </div>
                                    </div>
                                </div>

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
                        </button>
                    );
                })}
            </div>

            {/* The cups above and the carousel itself already show the active size —
                no third indicator row. */}
            <BariButton
                type="button"
                variant="primary"
                onClick={doConfirm}
                disabled={closing || out || diving}
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
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={closing || out || diving}
                style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", marginTop: '-4px', borderRadius: '20px' }}
            >
                חזרה →
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
.sizePickerCup:focus-visible,
.sizePickerCard:focus-visible { outline: 3px solid #fff3a8; outline-offset: 4px; border-radius: 16px; }
`;

const SR_ONLY: React.CSSProperties = {
    position: 'absolute', width: '1px', height: '1px', padding: 0,
    margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap', border: 0,
};

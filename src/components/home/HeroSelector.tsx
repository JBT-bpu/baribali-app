'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { BariButton } from '@/components/ui/bari';
import { usePrefersReducedMotion } from '@/lib/motionHooks';
import {
    isOrderableProduct,
    isOrderProduct,
    type OrderProduct,
} from '@/lib/orderRules';

/**
 * Product "hero select" — a game-style character-select roster for the menu.
 * Availability comes from the same product switch enforced by the route and
 * pricing layers. The veiled third hero remains a local coming-soon concept.
 *
 * Motion model is DISCRETE (this is what makes it feel smooth): each card sits
 * in a fixed slot — active center, or a rotated/receded side — derived purely
 * from its offset to `activeIndex`. A swipe just steps the index; CSS
 * transitions tween transform/opacity once per step. No per-pointermove
 * re-renders, no finger-tracked rubber-banding, no tilt lib — that churn was
 * what made the earlier coverflow feel janky. Real depth comes from the stage's
 * `perspective` + each card's `translateZ` + `transform-origin: 50% 80%`.
 *
 * Parent owns product navigation, so this stays presentational via
 * `onChooseProduct`. Reduced-motion collapses to a single static active card.
 * Built entirely in the BariBali design system — no new deps.
 */

interface Hero {
    id: OrderProduct | 'mystery';
    img: string | null;
    title: string;
    copy: string;      // card subtitle
    status: string;    // selection-panel status chip
    detail: string;    // selection-panel one-liner
    locked: boolean;
}

const HEROES: Hero[] = [
    {
        id: 'salad', img: '/homepage-assets/salad-bowl-m-v2.webp',
        title: 'הסלט שלכם',
        copy: isOrderableProduct('salad') ? 'בחירת גודל · הרכבה חופשית' : 'חוזר לתפריט בקרוב',
        status: isOrderableProduct('salad') ? 'זמין עכשיו' : 'בקרוב',
        detail: isOrderableProduct('salad')
            ? 'בחרו גודל, ואז הרכיבו אותו בדיוק כמו שאתם אוהבים.'
            : 'אנחנו מסיימים להכין אותו מחדש. שווה לחכות.',
        locked: !isOrderableProduct('salad'),
    },
    {
        id: 'tortilla', img: '/homepage-assets/card-tortilla.png',
        title: 'טורטייה',
        copy: isOrderableProduct('tortilla') ? 'הרכבה חופשית' : 'הגיבור הבא של התפריט',
        status: isOrderableProduct('tortilla') ? 'זמין עכשיו' : 'בקרוב',
        detail: isOrderableProduct('tortilla')
            ? 'הרכיבו אותה בדיוק כמו שאתם אוהבים.'
            : 'עוד רגע מצטרפת לתפריט. שווה לחכות.',
        locked: !isOrderableProduct('tortilla'),
    },
    {
        id: 'mystery', img: null,
        title: 'מנת הפתעה', copy: 'סוד קטן מהמטבח',
        status: 'בקרוב', detail: 'מקום שמור למנה הבאה. נגלה בקרוב.',
        locked: true,
    },
];

const N = HEROES.length;
const C_W = 210;
const C_H = 286;

export default function HeroSelector({
    onChooseProduct,
    onNudge,
    onActiveChange,
}: {
    onChooseProduct: (product: OrderProduct) => void;
    onNudge?: (dir: number) => void;
    onActiveChange?: (idx: number) => void;
}) {
    const reducedMotion = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(0);
    const startX = useRef<number | null>(null);
    const moved = useRef(false);

    // `dir` (+1 / -1) lets the parent gust the background particles the way the
    // roster moves, so a swipe feels like it stirs the whole scene.
    const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const go = (idx: number, dir = 0, focusCard = false) => {
        const next = ((idx % N) + N) % N; // wrap so the roster always shows both flanks
        if (next === activeIdx) return;
        navigator.vibrate?.(8);
        if (dir) onNudge?.(dir);
        onActiveChange?.(next);
        setActiveIdx(next);
        if (focusCard) requestAnimationFrame(() => cardRefs.current[next]?.focus({ preventScroll: true }));
    };

    // Swipe = discrete step decided on release. A lightweight pointermove only
    // flips a ref (no state, no re-render) so a drag doesn't fire a tap.
    const onDown = (e: React.PointerEvent) => { startX.current = e.clientX; moved.current = false; };
    const onMove = (e: React.PointerEvent) => {
        if (startX.current !== null && Math.abs(e.clientX - startX.current) > 8) moved.current = true;
    };
    const onUp = (e: React.PointerEvent) => {
        if (startX.current === null) return;
        const delta = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(delta) < 36) return;
        const dir = delta > 0 ? 1 : -1;   // gust follows the finger
        // If a mouse/pen swipe started from the focused card, keep focus aligned
        // with the newly active roving-tab-stop instead of stranding it on the
        // old card. Pure touch gestures do not acquire focus unnecessarily.
        const moveFocus = e.currentTarget.contains(document.activeElement);
        go(delta > 0 ? activeIdx - 1 : activeIdx + 1, dir, moveFocus); // RTL: drag right → previous
    };

    const handleCardTap = (i: number, event: React.MouseEvent) => {
        // Pointer clicks follow pointerup after a swipe. Keyboard activation has
        // detail=0, so it must remain available even after a dragged gesture.
        if (moved.current && event.detail !== 0) return;
        if (i !== activeIdx) {
            go(i, i > activeIdx ? 1 : -1);
            return;
        }
        // On short phones the explanatory panel sits below the first viewport.
        // The active, visibly tappable card is therefore also a direct route to
        // its action instead of becoming a dead tap.
        if (!HEROES[i].locked) confirmChoice();
    };

    const confirmChoice = () => {
        const selected = HEROES[activeIdx];
        if (selected.locked || !isOrderProduct(selected.id)) return;
        navigator.vibrate?.([20, 50, 40]);
        onChooseProduct(selected.id);
    };

    const handleStageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        // The higher index is visually to the left in this RTL coverflow.
        const delta = event.key === 'ArrowLeft' ? 1 : -1;
        go(activeIdx + delta, event.key === 'ArrowLeft' ? -1 : 1, true);
    };

    const active = HEROES[activeIdx];

    return (
        <div className="hero-selector" style={{ ...S.wrap, animation: reducedMotion ? 'none' : S.wrap.animation }}>
            <style>{KF}</style>

            <h1 id="hero-selector-title" style={S.promptTitle}>בחרו את המנה שלכם</h1>
            <p className="hero-selector__prompt-hint" id="hero-selector-hint" style={S.promptHint}>החליקו · השתמשו בחצים · או לחצו על מנה מהצד</p>

            {/* Coverflow stage */}
            <div
                role="group"
                aria-labelledby="hero-selector-title"
                aria-describedby="hero-selector-hint"
                className="hero-selector__stage"
                style={S.stage}
                onKeyDown={handleStageKeyDown}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => { startX.current = null; moved.current = false; }}
            >
                {/* Parallax backdrop — a far gold nebula that drifts as you browse the roster, for depth */}
                <div
                    style={{
                        ...S.backdrop,
                        transform: `translate(-50%, -50%) translateX(${(activeIdx - (N - 1) / 2) * 26}px) translateZ(-140px) scale(1.3)`,
                        transition: reducedMotion ? 'none' : 'transform 0.6s cubic-bezier(0.2,0.85,0.25,1)',
                    }}
                    aria-hidden
                />
                <div style={S.stageGlow} aria-hidden />
                {HEROES.map((hero, i) => {
                    // Offset to the active card, wrapped to [-1, 0, 1] for a 3-card loop.
                    let rel = i - activeIdx;
                    if (rel > N / 2) rel -= N;
                    if (rel < -N / 2) rel += N;
                    const isActive = rel === 0;
                    const side = rel > 0 ? -1 : 1; // rel>0 sits on the RTL "next" (left) side

                    const transform = isActive
                        ? 'translateX(0) translateZ(40px) rotateY(0deg) scale(1)'
                        : `translateX(${side * 138}px) translateZ(-118px) rotateY(${-side * 22}deg) scale(0.64)`;
                    const hidden = reducedMotion && !isActive;

                    return (
                        <button
                            className="hero-selector__card"
                            key={hero.id}
                            ref={element => { cardRefs.current[i] = element; }}
                            type="button"
                            aria-pressed={isActive}
                            aria-hidden={hidden || undefined}
                            aria-label={`${hero.title}, ${hero.locked ? 'בקרוב' : 'זמין עכשיו'}${isActive ? hero.locked ? ', נבחרה' : ', נבחרה — לחצו לבחירת גודל' : ''}`}
                            tabIndex={isActive ? 0 : -1}
                            onClick={event => handleCardTap(i, event)}
                            style={{
                                position: 'absolute', top: '50%', left: '50%',
                                width: `${C_W}px`, height: `${C_H}px`,
                                marginLeft: `${-C_W / 2}px`, marginTop: `${-C_H / 2}px`,
                                padding: 0, border: 0, appearance: 'none', color: 'inherit',
                                font: 'inherit', background: 'transparent',
                                transformOrigin: '50% 80%',
                                transform: reducedMotion ? (isActive ? 'none' : 'scale(0.9)') : transform,
                                opacity: hidden ? 0 : (isActive ? 1 : 0.52),
                                filter: isActive ? 'none' : 'brightness(0.82)',
                                zIndex: isActive ? 4 : 2,
                                pointerEvents: hidden ? 'none' : 'auto',
                                cursor: 'pointer',
                                transition: reducedMotion ? 'none' : 'transform 0.5s cubic-bezier(0.2,0.85,0.25,1.15), opacity 0.4s ease, filter 0.4s ease',
                            }}
                        >
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '18px', overflow: 'hidden', position: 'relative',
                                border: isActive ? '1.5px solid rgba(240,200,50,0.7)' : '1px solid rgba(255,255,255,0.16)',
                                boxShadow: isActive ? '0 18px 42px rgba(0,0,0,0.5), 0 0 20px rgba(240,200,50,0.16)' : '0 8px 22px rgba(0,0,0,0.4)',
                                background: '#0b2113',
                            }}>
                                {/* Status badge */}
                                <div style={{ position: 'absolute', top: '10px', insetInlineStart: '10px', zIndex: 4 }}>
                                    <span style={{ ...S.badge, ...(hero.locked ? S.badgeLocked : S.badgeLive) }}>
                                        {hero.locked ? 'בקרוב' : 'זמין'}
                                    </span>
                                </div>

                                {/* Art */}
                                {hero.img ? (
                                    <Image
                                        src={hero.img} alt="" aria-hidden width={C_W} height={C_H}
                                        sizes="210px"
                                        priority={hero.id === 'salad'}
                                        style={{ width: '100%', height: hero.id === 'salad' ? '74%' : '100%', marginTop: hero.id === 'salad' ? '8px' : 0, objectFit: hero.id === 'salad' ? 'contain' : 'cover', pointerEvents: 'none', display: 'block', filter: hero.locked ? 'saturate(0.45) brightness(0.66)' : 'none' }}
                                    />
                                ) : (
                                    <div style={S.veilArt} aria-hidden>
                                        <Sparkles size={38} color="#ecd583" />
                                    </div>
                                )}

                                {/* Locked emblem */}
                                {hero.locked && (
                                    <div style={S.lockWash} aria-hidden>
                                        <span style={S.lockEmblem}><LockKeyhole size={22} color="#ecd583" /></span>
                                    </div>
                                )}

                                {/* Bottom copy */}
                                <div className="hero-selector__copy" style={S.cardCopy}>
                                    <div className="hero-selector__title" style={S.cardTitle}>{hero.title}</div>
                                    <div className="hero-selector__subtitle" style={S.cardSub}>{hero.copy}</div>
                                </div>

                                {/* Landing feedback — a gold sheen sweep + rim flash, re-fired each
                                    time this card becomes active (keyed on activeIdx). */}
                                {isActive && !reducedMotion && (
                                    <>
                                        <div key={`sheen-${activeIdx}`} style={S.sheenBox} aria-hidden>
                                            <div style={S.sheenBar} />
                                        </div>
                                        <div key={`rim-${activeIdx}`} style={S.rimPulse} aria-hidden />
                                    </>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Pips */}
            <div className="hero-selector__pips" role="group" aria-label="מעבר מהיר בין מנות" style={S.pips}>
                {/* The dot stays small, but every shortcut keeps a full 44px
                    touch target and exposes the currently previewed choice. */}
                {HEROES.map((h, i) => (
                    <button
                        key={h.id}
                        type="button"
                        onClick={() => go(i, i > activeIdx ? 1 : -1)}
                        aria-label={`הצג ${h.title}${h.locked ? ', בקרוב' : ''}`}
                        aria-pressed={i === activeIdx}
                        style={S.pipHit}
                    >
                        <span aria-hidden style={{ ...S.pip, ...(i === activeIdx ? S.pipOn : {}) }} />
                    </button>
                ))}
            </div>

            {/* Selection panel */}
            <div style={S.selection} aria-live="polite">
                <div style={{ ...S.statusChip, color: active.locked ? '#c4d2bf' : 'var(--color-gold-light)' }}>
                    {active.locked ? <LockKeyhole size={14} aria-hidden /> : <Sparkles size={14} aria-hidden />}
                    <span>{active.status}</span>
                </div>
                <div style={S.selDetail}>{active.detail}</div>
                {active.locked ? (
                    <div style={S.lockedCta}>בקרוב 🔒</div>
                ) : (
                    <BariButton type="button" variant="primary" fullWidth onClick={confirmChoice} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                        בחרתי — בואו נבנה ←
                    </BariButton>
                )}
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    wrap: { position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'heroIn 0.6s ease both' },
    promptTitle: { margin: 0, fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '20px', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.7), 0 0 20px rgba(200,168,78,0.35)' },
    promptHint: { fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.03em', margin: '3px 0 0' },
    stage: { position: 'relative', width: '100%', height: '304px', marginTop: '8px', perspective: '950px', touchAction: 'pan-y pinch-zoom', overflow: 'visible', cursor: 'grab' },
    backdrop: { position: 'absolute', top: '46%', left: '50%', width: '340px', height: '260px', pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(240,200,50,0.16), rgba(120,90,20,0.05) 45%, transparent 72%)', filter: 'blur(10px)' },
    stageGlow: { position: 'absolute', left: '50%', bottom: '24px', width: '230px', height: '66px', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,200,50,0.3), transparent 70%)', filter: 'blur(12px)', pointerEvents: 'none' },
    sheenBox: { position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none' },
    sheenBar: { position: 'absolute', top: 0, bottom: 0, width: '55%', background: 'linear-gradient(105deg, transparent 0%, rgba(255,246,210,0) 38%, rgba(255,248,222,0.42) 50%, rgba(255,246,210,0) 62%, transparent 100%)', mixBlendMode: 'screen', animation: 'heroSheen 0.9s ease 0.05s both' },
    rimPulse: { position: 'absolute', inset: 0, borderRadius: '18px', zIndex: 5, pointerEvents: 'none', animation: 'heroRim 0.6s ease both' },
    badge: { padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 900, letterSpacing: '0.04em', backdropFilter: 'blur(6px)' },
    badgeLive: { background: 'linear-gradient(135deg, #c8a832, #f0d060)', color: '#1a0e00', boxShadow: '0 2px 8px rgba(240,200,50,0.4)' },
    badgeLocked: { background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' },
    veilArt: { width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 40%, rgba(240,200,50,0.16), transparent 55%), linear-gradient(165deg, rgba(20,50,20,0.92), rgba(5,16,5,0.96))' },
    veilSparkle: { fontSize: '40px', opacity: 0.7, filter: 'drop-shadow(0 0 16px rgba(240,200,50,0.5))' },
    lockWash: { position: 'absolute', inset: 0, zIndex: 3, display: 'grid', placeItems: 'center', background: 'rgba(3,8,3,0.28)', pointerEvents: 'none' },
    lockEmblem: { display: 'grid', placeItems: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(3,8,3,0.72)', border: '1px solid rgba(240,200,50,0.3)', fontSize: '21px', boxShadow: '0 0 24px rgba(0,0,0,0.5)' },
    cardCopy: { position: 'absolute', insetInline: 0, bottom: 0, zIndex: 4, padding: '13px 10px 15px', textAlign: 'center', background: '#081b10', borderTop: '1px solid rgba(225,200,117,0.2)' },
    cardTitle: { fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '20px', color: '#fff8df' },
    cardSub: { fontSize: '12px', fontWeight: 500, color: '#c9d7c5', marginTop: '3px' },
    // The visual dot stays compact while the button meets the mobile hit target.
    pips: { display: 'flex', gap: 0, marginTop: 0, marginBottom: 0 },
    pipHit: { width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' },
    pip: { display: 'block', width: '8px', height: '8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.22)', transition: 'width 0.28s ease, background 0.28s ease' },
    pipOn: { width: '26px', background: 'linear-gradient(90deg, #c8a832, #f0d060)' },
    selection: { textAlign: 'center', width: '100%', maxWidth: '320px', padding: '0 12px 4px' },
    statusChip: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.02em' },
    selDetail: { fontSize: '13px', color: '#c9d7c5', lineHeight: 1.6, minHeight: '34px', marginTop: '6px', marginBottom: '10px', fontWeight: 500 },
    lockedCta: { width: '100%', padding: '13px 0', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontWeight: 800, letterSpacing: '0.03em' },
};

const KF = `
@keyframes heroIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes heroSheen { from{transform:translateX(-160%) skewX(-16deg)} to{transform:translateX(300%) skewX(-16deg)} }
@keyframes heroRim { 0%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} 45%{box-shadow:inset 0 0 20px 1px rgba(240,200,50,0.5)} 100%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} }
@media (max-height: 640px) {
  .hero-selector__stage { height: 228px !important; margin-top: 2px !important; }
  .hero-selector__card { width: 162px !important; height: 220px !important; margin-left: -81px !important; margin-top: -110px !important; }
  .hero-selector__prompt-hint { margin-top: 1px !important; font-size: 11px !important; }
  .hero-selector__pips { display: none !important; }
}
@media (max-height: 560px) {
  .hero-selector__prompt-hint { display: none !important; }
  .hero-selector__stage { height: 144px !important; margin-top: 0 !important; }
  .hero-selector__card { width: 103px !important; height: 140px !important; margin-left: -51.5px !important; margin-top: -70px !important; }
  .hero-selector__copy { padding: 6px !important; }
  .hero-selector__title { font-size: 14px !important; }
  .hero-selector__subtitle { display: none; }
}
`;

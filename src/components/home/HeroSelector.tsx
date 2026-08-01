'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { BariButton } from '@/components/ui/bari';
import { usePrefersReducedMotion } from '@/lib/motionHooks';

/**
 * Product "hero select" — a game-style character-select roster for the menu.
 * Salad is the one playable hero; tortilla and a veiled third are locked
 * "coming soon" heroes that build anticipation (and preview the future
 * card-collection idea) without pretending to be orderable.
 *
 * Motion model is DISCRETE (this is what makes it feel smooth): each card sits
 * in a fixed slot — active center, or a rotated/receded side — derived purely
 * from its offset to `activeIndex`. A swipe just steps the index; CSS
 * transitions tween transform/opacity once per step. No per-pointermove
 * re-renders, no finger-tracked rubber-banding, no tilt lib — that churn was
 * what made the earlier coverflow feel janky. Real depth comes from the stage's
 * `perspective` + each card's `translateZ` + `transform-origin: 50% 80%`.
 *
 * Parent owns what "choose salad" does (opens the existing size picker), so this
 * stays presentational via `onChooseSalad`. Reduced-motion collapses to a single
 * static active card. Built entirely in the BariBali design system — no new deps.
 */

interface Hero {
    id: string;
    img: string | null;
    title: string;
    copy: string;      // card subtitle
    status: string;    // selection-panel status chip
    detail: string;    // selection-panel one-liner
    locked: boolean;
}

const HEROES: Hero[] = [
    {
        id: 'salad', img: '/homepage-assets/card-salad.png',
        title: 'הסלט שלכם', copy: 'בחירת גודל · הרכבה חופשית',
        status: 'זמין עכשיו', detail: 'בחרו גודל, ואז הרכיבו אותו בדיוק כמו שאתם אוהבים.',
        locked: false,
    },
    {
        id: 'tortilla', img: '/homepage-assets/card-tortilla.png',
        title: 'טורטייה', copy: 'הגיבור הבא של התפריט',
        status: 'בקרוב', detail: 'עוד רגע מצטרפת לתפריט. שווה לחכות.',
        locked: true,
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

export default function HeroSelector({ onChooseSalad, onNudge, onActiveChange }: { onChooseSalad: () => void; onNudge?: (dir: number) => void; onActiveChange?: (idx: number) => void }) {
    const reducedMotion = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(0);
    const startX = useRef<number | null>(null);
    const moved = useRef(false);

    // `dir` (+1 / -1) lets the parent gust the background particles the way the
    // roster moves, so a swipe feels like it stirs the whole scene.
    const go = (idx: number, dir = 0) => {
        const next = ((idx % N) + N) % N; // wrap so the roster always shows both flanks
        if (next === activeIdx) return;
        navigator.vibrate?.(8);
        if (dir) onNudge?.(dir);
        onActiveChange?.(next);
        setActiveIdx(next);
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
        go(delta > 0 ? activeIdx - 1 : activeIdx + 1, dir); // RTL: drag right → previous
    };

    const handleCardTap = (i: number) => {
        if (moved.current) return;        // it was a swipe, not a tap
        if (i !== activeIdx) { go(i, i > activeIdx ? 1 : -1); return; }
        if (HEROES[i].locked) { denyFeedback(); return; }
        confirmChoice();
    };

    // Tapping a locked hero — a soft buzz so it isn't a dead tap; the lock badge
    // and "בקרוב" panel already say why. (No shake — it read as jittery.)
    const denyFeedback = () => {
        navigator.vibrate?.(28);
    };

    const confirmChoice = () => {
        if (HEROES[activeIdx].locked) return;
        navigator.vibrate?.([20, 50, 40]);
        onChooseSalad();
    };

    const active = HEROES[activeIdx];

    return (
        <div style={S.wrap}>
            <style>{KF}</style>

            <div style={S.promptTitle}>בחרו את המנה שלכם</div>
            <div style={S.promptHint}>החליקו · או לחצו על מנה מהצד</div>

            {/* Coverflow stage */}
            <div style={S.stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { startX.current = null; }}>
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
                        <div
                            key={hero.id}
                            onClick={() => handleCardTap(i)}
                            style={{
                                position: 'absolute', top: '50%', left: '50%',
                                width: `${C_W}px`, height: `${C_H}px`,
                                marginLeft: `${-C_W / 2}px`, marginTop: `${-C_H / 2}px`,
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
                                boxShadow: isActive ? '0 18px 42px rgba(0,0,0,0.55), 0 0 34px rgba(240,200,50,0.34)' : '0 8px 22px rgba(0,0,0,0.5)',
                                background: 'linear-gradient(165deg, rgba(16,42,16,0.9), rgba(6,18,6,0.94))',
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
                                        src={hero.img} alt={hero.title} width={C_W} height={C_H}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block', filter: hero.locked ? 'saturate(0.45) brightness(0.66)' : 'none' }}
                                    />
                                ) : (
                                    <div style={S.veilArt} aria-hidden>
                                        <span style={S.veilSparkle}>✨</span>
                                    </div>
                                )}

                                {/* Locked emblem */}
                                {hero.locked && (
                                    <div style={S.lockWash} aria-hidden>
                                        <span style={S.lockEmblem}>🔒</span>
                                    </div>
                                )}

                                {/* Bottom copy */}
                                <div style={S.cardCopy}>
                                    <div style={S.cardTitle}>{hero.title}</div>
                                    <div style={S.cardSub}>{hero.copy}</div>
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
                        </div>
                    );
                })}
            </div>

            {/* Pips */}
            <div style={S.pips}>
                {/* The dot stays 8px, but it sits inside a padded button so the
                    tap target is ~22x24 rather than 8x8. */}
                {HEROES.map((h, i) => (
                    <button key={h.id} onClick={() => go(i, i > activeIdx ? 1 : -1)} aria-label={h.title} style={S.pipHit}>
                        <span style={{ ...S.pip, ...(i === activeIdx ? S.pipOn : {}) }} />
                    </button>
                ))}
            </div>

            {/* Selection panel */}
            <div style={S.selection} aria-live="polite">
                <div style={{ ...S.statusChip, color: active.locked ? 'rgba(255,255,255,0.5)' : 'var(--color-gold-light)' }}>
                    <span>{active.locked ? '🔒' : '✨'}</span>
                    <span>{active.status}</span>
                </div>
                <div style={S.selTitle}>{active.title}</div>
                <div style={S.selDetail}>{active.detail}</div>
                {active.locked ? (
                    <div style={S.lockedCta}>בקרוב 🔒</div>
                ) : (
                    <BariButton variant="primary" fullWidth onClick={confirmChoice} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                        בחרתי — בואו נבנה ←
                    </BariButton>
                )}
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    wrap: { position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'heroIn 0.6s ease both' },
    promptTitle: { fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '20px', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.7), 0 0 20px rgba(200,168,78,0.35)' },
    promptHint: { fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.03em', marginTop: '3px' },
    stage: { position: 'relative', width: '100%', height: '304px', marginTop: '8px', perspective: '950px', touchAction: 'pan-y', overflow: 'visible', cursor: 'grab' },
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
    cardCopy: { position: 'absolute', insetInline: 0, bottom: 0, zIndex: 4, padding: '22px 14px 13px', textAlign: 'center', background: 'linear-gradient(180deg, transparent, rgba(3,10,3,0.6) 42%, rgba(3,10,3,0.92))' },
    cardTitle: { fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '18px', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' },
    cardSub: { fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.62)', marginTop: '3px' },
    // gap/margins absorbed into pipHit's padding so the row keeps its original
    // footprint while each dot gains a usable target.
    pips: { display: 'flex', gap: 0, marginTop: 0, marginBottom: 0 },
    pipHit: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 7px', border: 0, background: 'transparent', cursor: 'pointer' },
    pip: { display: 'block', width: '8px', height: '8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.22)', transition: 'width 0.28s ease, background 0.28s ease' },
    pipOn: { width: '26px', background: 'linear-gradient(90deg, #c8a832, #f0d060)' },
    selection: { textAlign: 'center', width: '100%', maxWidth: '320px', padding: '0 12px 4px' },
    statusChip: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.02em' },
    selTitle: { fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: '22px', color: '#fff', margin: '3px 0 4px', textShadow: '0 0 22px rgba(200,168,78,0.3)' },
    selDetail: { fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, minHeight: '34px', marginBottom: '10px', fontWeight: 500 },
    lockedCta: { width: '100%', padding: '13px 0', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontWeight: 800, letterSpacing: '0.03em' },
};

const KF = `
@keyframes heroIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes heroSheen { from{transform:translateX(-160%) skewX(-16deg)} to{transform:translateX(300%) skewX(-16deg)} }
@keyframes heroRim { 0%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} 45%{box-shadow:inset 0 0 20px 1px rgba(240,200,50,0.5)} 100%{box-shadow:inset 0 0 0 1px rgba(240,200,50,0)} }
`;

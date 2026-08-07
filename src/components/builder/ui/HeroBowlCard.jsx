'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Tilt from "react-parallax-tilt";
import { usePrefersReducedMotion } from "../../../lib/motionHooks";
// Panel layout numbers live in their own .ts so the assertion harness can import
// them — Node's type stripper has no JSX transform. See heroBowlGeometry.ts for
// why the chip row is capped and what invariant that protects.
import { PANEL } from "./heroBowlGeometry";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const MAX          = 14;
const SIZE         = 158;   // a bit bigger, still sidebar layout
const CX           = 79;
const R            = 64;
const CIRC         = 2 * Math.PI * R;
const TOTAL_FRAMES = 166;   // cat-salad-bowl.json

function ringColor(p) {
    if (p < 0.35) return "rgba(255,255,255,0.15)";
    if (p < 0.7)  return "#c8a832";
    return "#66dd44";
}
// drop-shadow() syntax — these are applied to CSS `filter`; the previous
// box-shadow-style values were invalid there and silently dropped, so the
// ring never actually glowed as designed.
function ringGlow(p) {
    if (p < 0.35) return "none";
    if (p < 0.7)  return "drop-shadow(0 0 6px rgba(200,168,78,0.65))";
    return "drop-shadow(0 0 8px rgba(80,220,60,0.75))";
}

const KF = `
@keyframes dropIntoBowl {
    0%   { opacity:0; transform:translate(var(--ex),var(--ey)) scale(0.85) rotate(-14deg); }
    18%  { opacity:1; }
    66%  { opacity:1; transform:translate(0,0) scale(1.35) rotate(0deg); }
    82%  { opacity:0.85; transform:translate(0,0) scale(1.0) rotate(0deg); }
    100% { opacity:0; transform:translate(0,0) scale(0.05) rotate(0deg); }
}
@keyframes itemPop {
    0%   { transform: scale(0) }
    65%  { transform: scale(1.3) }
    100% { transform: scale(1) }
}
`;

export default function HeroBowlCard({ all, onRemove, lastAdd, animFile = "/cat-salad-bowl.json", freePlay = false, bowlTop = "24%", max = 14 }) {
    const lottieRef      = useRef(null);
    const prevIdsRef     = useRef(null);   // null = not yet seeded
    const targetFrameRef = useRef(null);   // frame to stop at during playback
    const reducedMotion  = usePrefersReducedMotion();
    const [dropKey, setDropKey]   = useState(null);
    const [firstPulse, setFirstPulse] = useState(false); // stronger ring flash on the very first ingredient
    const [bowlAnim, setBowlAnim] = useState(null);
    const [chipsOpen, setChipsOpen] = useState(false);
    const [mounted, setMounted]   = useState(false);
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { fetch(animFile).then(r => r.json()).then(setBowlAnim).catch(() => {}); }, [animFile]);

    const fillPct  = Math.min(all.length / max, 1);
    const offset   = CIRC * (1 - fillPct);
    const pctLabel = Math.round(fillPct * 100);
    const isEmpty  = all.length === 0;

    // ── Seek to initial frame once Lottie loads ──
    const handleLoaded = useCallback(() => {
        const l = lottieRef.current;
        if (!l) return;
        const frame = Math.round(fillPct * (TOTAL_FRAMES - 1));
        l.goToAndStop(frame, true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Per-frame check: stop when we reach the target ──
    const handleEnterFrame = useCallback((e) => {
        if (targetFrameRef.current === null) return;
        if (Math.round(e.currentTime) >= targetFrameRef.current) {
            const frame = targetFrameRef.current;
            targetFrameRef.current = null; // clear BEFORE goToAndStop to break re-entry
            lottieRef.current?.setSpeed(1);
            lottieRef.current?.goToAndStop(frame, true);
        }
    }, []);

    // ── Detect adds vs removes; drive Lottie + drop animation ──
    useEffect(() => {
        const currIds = all.map(i => i.id);

        // First mount: seed ref, seek lottie to current fill frame
        if (prevIdsRef.current === null) {
            prevIdsRef.current = currIds;
            const l = lottieRef.current;
            if (l) {
                const frame = Math.round(fillPct * (TOTAL_FRAMES - 1));
                l.goToAndStop(frame, true);
            }
            return;
        }

        const newItems = all.filter(i => !prevIdsRef.current.includes(i.id));
        const wasEmpty = prevIdsRef.current.length === 0;
        prevIdsRef.current = currIds;

        const newFrame = Math.round(fillPct * (TOTAL_FRAMES - 1));
        const l = lottieRef.current;

        if (newItems.length > 0) {
            // First ingredient in an empty bowl gets a bigger moment — a
            // double haptic tick and a brief bright ring flash. First-action
            // feedback shapes how the whole builder feels.
            if (wasEmpty) {
                navigator.vibrate?.([12, 60, 12]);
                setFirstPulse(true);
                setTimeout(() => setFirstPulse(false), 750);
            }
            // ── Item ADDED: play forward from current fill frame to new fill frame ──
            if (l) {
                const fromFrame = Math.round(l.currentFrame ?? 0);
                targetFrameRef.current = newFrame;
                l.setSpeed(1.2);   // gentle scrub — shows the veggie layers advancing
                l.goToAndPlay(fromFrame, true);
            }

            // Drop fly-in from the ring edge
            const item  = newItems[newItems.length - 1];
            const idx   = all.findIndex(i => i.id === item.id);
            const N     = all.length;
            const angle = (idx / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2;
            const ex    = Math.round(Math.cos(angle) * R);
            const ey    = Math.round(Math.sin(angle) * R);
            setDropKey({ key: Date.now(), icon: item.icon, ex, ey });

        } else {
            // ── Item REMOVED: snap lottie back to new (lower) fill frame ──
            if (l) {
                targetFrameRef.current = null;
                l.goToAndStop(newFrame, true);
            }
        }
    }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Tilt
            tiltEnable={!reducedMotion}
            glareEnable={!reducedMotion}
            tiltMaxAngleX={6}
            tiltMaxAngleY={6}
            glareMaxOpacity={0.18}
            glareColor="#f0d060"
            glarePosition="all"
            glareBorderRadius="16px"
            transitionSpeed={400}
            scale={1.015}
            onEnter={() => navigator.vibrate?.(8)}
            style={{
                margin: "6px 12px",
                background: "linear-gradient(145deg, rgba(6,18,6,0.17), rgba(10,28,10,0.17)), url(/builder-assets/salad-card-bg.webp) center top / 100% 100% no-repeat",
                border: "1px solid rgba(200,168,78,0.18)",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
        >
            {mounted && <style>{KF}{`
.hbc-ring { position:relative; width:158px; height:158px; flex-shrink:0; overflow:visible }
.hbc-bowl { position:absolute; left:50%; top:${bowlTop}; transform:translate(-50%,-50%); width:172px; height:172px; pointer-events:none }
@media (max-width: 374px) {
  .hbc-ring { width:118px; height:118px }
  .hbc-bowl { width:128px; height:128px }
}
            `}</style>}

            {/* ── Main row: ring+bowl left, stats right ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px 14px 8px" }}>

                {/* Ring + bowl */}
                <div className="hbc-ring">

                    {/* Fill ring */}
                    <svg viewBox={`0 0 ${SIZE} ${SIZE}`}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle cx={CX} cy={CX} r={R} fill="none"
                            stroke={firstPulse ? "#ffe066" : ringColor(fillPct)}
                            strokeWidth={firstPulse ? "6.5" : "5"} strokeLinecap="round"
                            strokeDasharray={CIRC} strokeDashoffset={offset}
                            style={{
                                transition: "stroke-dashoffset 0.55s cubic-bezier(0.34,1.2,0.64,1), stroke 0.4s ease, stroke-width 0.3s ease",
                                filter: firstPulse ? "drop-shadow(0 0 12px rgba(255,224,102,0.95))" : ringGlow(fillPct),
                            }}
                        />
                    </svg>

                    {/* Bowl Lottie — veggie layers driven by fill frame */}
                    <div className="hbc-bowl" style={{
                        filter: fillPct > 0.65
                            ? "drop-shadow(0 0 18px rgba(80,220,60,0.6)) drop-shadow(0 6px 16px rgba(80,220,60,0.35)) drop-shadow(0 2px 8px rgba(0,0,0,0.6))"
                            : fillPct > 0.3
                                ? "drop-shadow(0 0 16px rgba(200,168,78,0.55)) drop-shadow(0 6px 16px rgba(200,168,78,0.3)) drop-shadow(0 2px 8px rgba(0,0,0,0.6))"
                                : "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                        transition: "filter 0.4s ease",
                    }}>
                        {bowlAnim && (
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={bowlAnim}
                                loop={freePlay}
                                autoplay={freePlay}
                                style={{ width: "100%", height: "100%" }}
                                onDOMLoaded={freePlay ? undefined : handleLoaded}
                                onEnterFrame={freePlay ? undefined : handleEnterFrame}
                            />
                        )}
                    </div>


                    {/* Empty hint */}
                    {isEmpty && (
                        <div style={{
                            position: "absolute", bottom: "14px", left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: "10px", fontWeight: 700,
                            color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap",
                        }}>הוסף מרכיבים ←</div>
                    )}

                    {/* Fly-in emoji — transient, disappears after animation */}
                    {dropKey && (
                        <div key={dropKey.key} style={{
                            position: "absolute", left: "50%", top: "50%",
                            marginTop: "-30px", marginLeft: "-30px",
                            fontSize: "60px", lineHeight: 1,
                            pointerEvents: "none", zIndex: 20,
                            '--ex': `${dropKey.ex}px`,
                            '--ey': `${dropKey.ey}px`,
                            animation: "dropIntoBowl 1s cubic-bezier(0.34,1.4,0.64,1) forwards",
                        }}>
                            {dropKey.icon && dropKey.icon.startsWith("/")
                                ? <img src={dropKey.icon} alt="" style={{ width: "60px", height: "60px", objectFit: "contain" }} />
                                : dropKey.icon}
                        </div>
                    )}
                </div>

                {/* Stats column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>

                    {/* Ingredient count */}
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
                        {isEmpty ? "הקערה ריקה" : `${all.length} / ${max} מרכיבים`}
                    </div>

                    {/* Ingredient chips — tap to remove.
                        Capped to one row by default (see PANEL.chipsPerRow). The
                        most RECENT ones are shown, so the chip that just popped
                        in is always the visible one. */}
                    {all.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: `${PANEL.chipGap}px` }}>
                            {(chipsOpen ? all : all.slice(-PANEL.chipsPerRow)).map(item => (
                                <button key={item.id} onClick={() => onRemove(item.id)} style={{
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "5px",
                                    padding: "2px 5px",
                                    fontSize: "14px", lineHeight: 1,
                                    cursor: "pointer",
                                    animation: lastAdd === item.id
                                        ? "itemPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
                                }}>
                                    {item.icon && item.icon.startsWith("/")
                                        ? <img src={item.icon} alt={item.he} style={{ width: `${PANEL.chipIcon}px`, height: `${PANEL.chipIcon}px`, objectFit: "contain" }} />
                                        : item.icon}
                                </button>
                            ))}

                            {/* Reveals the rest in place. Removal is never lost
                                without it — tapping a selected ingredient card
                                below toggles it off too — but items chosen in an
                                earlier step aren't on screen any more, so this is
                                the shortcut back to them. */}
                            {all.length > PANEL.chipsPerRow && (
                                <button
                                    onClick={() => setChipsOpen(o => !o)}
                                    aria-expanded={chipsOpen}
                                    aria-label={chipsOpen ? "הסתרת המרכיבים" : `הצגת כל ${all.length} המרכיבים`}
                                    style={{
                                        border: "1px solid rgba(200,168,78,0.4)",
                                        background: "rgba(200,168,78,0.16)",
                                        borderRadius: "5px",
                                        padding: "2px 6px",
                                        minWidth: `${PANEL.chipW}px`, height: `${PANEL.chipW}px`,
                                        fontSize: "11px", fontWeight: 800, lineHeight: 1,
                                        color: "#f0d060", cursor: "pointer",
                                        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                                    }}
                                >
                                    {chipsOpen ? "−" : `+${all.length - PANEL.chipsPerRow}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </Tilt>
    );
}

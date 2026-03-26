'use client';
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
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
function ringGlow(p) {
    if (p < 0.35) return "none";
    if (p < 0.7)  return "0 0 10px rgba(200,168,78,0.65)";
    return "0 0 14px rgba(80,220,60,0.75)";
}

const KF = `
@keyframes dropIntoBowl {
    0%   { opacity:0; transform:translate(var(--ex),var(--ey)) scale(1.4); }
    20%  { opacity:1; }
    80%  { opacity:0.7; transform:translate(calc(var(--ex)*0.05),calc(var(--ey)*0.05)) scale(1.05); }
    100% { opacity:0; transform:translate(0,0) scale(0.1); }
}
@keyframes itemPop {
    0%   { transform: scale(0) }
    65%  { transform: scale(1.3) }
    100% { transform: scale(1) }
}
`;

export default function HeroBowlCard({ all, onRemove, comboBadges, lastAdd, animFile = "/cat-salad-bowl.json", freePlay = false }) {
    const lottieRef      = useRef(null);
    const prevIdsRef     = useRef(null);   // null = not yet seeded
    const targetFrameRef = useRef(null);   // frame to stop at during playback
    const [dropKey, setDropKey]   = useState(null);
    const [bowlAnim, setBowlAnim] = useState(null);
    const [mounted, setMounted]   = useState(false);
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { fetch(animFile).then(r => r.json()).then(setBowlAnim).catch(() => {}); }, [animFile]);

    const fillPct  = Math.min(all.length / MAX, 1);
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
        prevIdsRef.current = currIds;

        const newFrame = Math.round(fillPct * (TOTAL_FRAMES - 1));
        const l = lottieRef.current;

        if (newItems.length > 0) {
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
        <div style={{
            margin: "6px 12px",
            background: "linear-gradient(145deg, rgba(6,18,6,0.17), rgba(10,28,10,0.17)), url(/builder-assets/salad-card-bg.webp) center top / 102% auto no-repeat",
            border: "1px solid rgba(200,168,78,0.18)",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
            {mounted && <style>{KF}{`
.hbc-ring { position:relative; width:158px; height:158px; flex-shrink:0 }
.hbc-bowl { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:108px; height:108px; pointer-events:none }
@media (max-width: 374px) {
  .hbc-ring { width:118px; height:118px }
  .hbc-bowl { width:80px;  height:80px  }
}
            `}</style>}

            {/* ── Main row: ring+bowl left, stats right ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 14px 8px" }}>

                {/* Ring + bowl */}
                <div className="hbc-ring">

                    {/* Fill ring */}
                    <svg viewBox={`0 0 ${SIZE} ${SIZE}`}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle cx={CX} cy={CX} r={R} fill="none"
                            stroke={ringColor(fillPct)} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={CIRC} strokeDashoffset={offset}
                            style={{
                                transition: "stroke-dashoffset 0.55s cubic-bezier(0.34,1.2,0.64,1), stroke 0.4s ease",
                                filter: ringGlow(fillPct),
                            }}
                        />
                    </svg>

                    {/* Bowl Lottie — veggie layers driven by fill frame */}
                    <div className="hbc-bowl" style={{
                        filter: fillPct > 0.65
                            ? "drop-shadow(0 0 14px rgba(80,220,60,0.5))"
                            : fillPct > 0.3
                                ? "drop-shadow(0 0 12px rgba(200,168,78,0.45))"
                                : "none",
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
                            fontSize: "9px", fontWeight: 700,
                            color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap",
                        }}>הוסף מרכיבים ←</div>
                    )}

                    {/* Fly-in emoji — transient, disappears after animation */}
                    {dropKey && (
                        <div key={dropKey.key} style={{
                            position: "absolute", left: "50%", top: "50%",
                            marginTop: "-11px", marginLeft: "-11px",
                            fontSize: "20px", lineHeight: 1,
                            pointerEvents: "none", zIndex: 20,
                            '--ex': `${dropKey.ex}px`,
                            '--ey': `${dropKey.ey}px`,
                            animation: "dropIntoBowl 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
                        }}>
                            {dropKey.icon}
                        </div>
                    )}
                </div>

                {/* Stats column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>

                    {/* Fill % */}
                    <div style={{
                        fontSize: "28px", fontWeight: 900, lineHeight: 1,
                        color: fillPct > 0.65 ? "#66dd44" : fillPct > 0.3 ? "#f0d060" : "rgba(255,255,255,0.18)",
                        transition: "color 0.4s ease",
                    }}>
                        {pctLabel}<span style={{ fontSize: "13px", fontWeight: 700, opacity: 0.55, marginLeft: "2px" }}>%</span>
                    </div>

                    {/* Ingredient count */}
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
                        {isEmpty ? "הקערה ריקה" : `${all.length} / ${MAX} מרכיבים`}
                    </div>

                    {/* Ingredient chips — tap to remove */}
                    {all.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                            {all.map(item => (
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
                                    {item.icon}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Combo badges */}
                    {comboBadges.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                            {comboBadges.map(b => (
                                <div key={b.id} style={{
                                    display: "flex", alignItems: "center", gap: "3px",
                                    padding: "2px 6px", borderRadius: "6px",
                                    background: "rgba(200,168,78,0.2)", border: "1px solid rgba(200,168,78,0.4)",
                                }}>
                                    <span style={{ fontSize: "9px" }}>{b.icon}</span>
                                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#f0d060" }}>{b.he}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fill bar */}
            <div style={{ height: "3px", background: "rgba(255,255,255,0.04)" }}>
                <div style={{
                    height: "100%", width: `${pctLabel}%`,
                    background: fillPct > 0.65 ? "linear-gradient(90deg,#44bb22,#88ee44)" : "linear-gradient(90deg,#c8a832,#f0d060)",
                    transition: "width 0.55s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease",
                    boxShadow: fillPct > 0.1 ? "0 0 8px rgba(200,168,78,0.4)" : "none",
                }} />
            </div>
        </div>
    );
}

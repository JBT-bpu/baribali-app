'use client';
import { useState, useEffect } from "react";

export default function MixingAnimation({ all, total, onComplete }) {
    const [phase, setPhase] = useState("drop"); // drop → glow → confirm → out

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("glow"),    1600);
        const t2 = setTimeout(() => setPhase("confirm"), 2900);
        const t3 = setTimeout(() => setPhase("out"),     4300);
        const t4 = setTimeout(() => onComplete(),        4800);

        if (navigator.vibrate) {
            navigator.vibrate([20, 80, 20]);
            setTimeout(() => navigator.vibrate([60, 40, 120]), 2900);
        }
        playChimeSound();
        setTimeout(() => playSuccessSound(), 2900);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onComplete]);

    return (
        <div style={{
            ...S.overlay,
            opacity: phase === "out" ? 0 : 1,
            transition: phase === "out" ? "opacity 0.45s ease-in" : "none",
        }}>
            <div style={S.ambientGlow} />
            <div style={S.container}>
                {/* All phases stay mounted — crossfade via opacity transition */}
                <div style={{ ...S.phase, opacity: phase === "drop"    ? 1 : 0 }}><DropPhase    all={all} /></div>
                <div style={{ ...S.phase, opacity: phase === "glow"    ? 1 : 0 }}><GlowPhase /></div>
                <div style={{ ...S.phase, opacity: phase === "confirm" || phase === "out" ? 1 : 0 }}><ConfirmPhase total={total} count={all.length} /></div>
            </div>
            <style>{KF}</style>
        </div>
    );
}

// ── Phase 1: ingredients fall into bowl ──────────────────
function DropPhase({ all }) {
    const items = all.slice(0, 10);
    return (
        <div style={{ textAlign: "center", animation: "pFadeIn 0.4s ease both" }}>
            <div style={{ position: "relative", width: "200px", height: "260px", margin: "0 auto" }}>
                {/* falling ingredients */}
                {items.map((item, i) => {
                    const col = i % 5;
                    const leftPct = 10 + col * 18;
                    return (
                        <div key={item.id} style={{
                            position: "absolute",
                            top: 0,
                            left: `${leftPct}%`,
                            fontSize: "28px",
                            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                            animation: `ingredientDrop 0.65s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s both`,
                        }}>{item.icon}</div>
                    );
                })}
                {/* bowl — settles then shimmies once all items land */}
                <div style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    fontSize: "100px", lineHeight: 1,
                    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                    animation: "bowlSettle 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, bowlShimmy 0.4s ease-in-out 1.35s both",
                }}>🥗</div>
            </div>
            <div style={S.label}>מכינים את הסלט שלכם</div>
        </div>
    );
}

// ── Phase 2: bowl glows, gold embers rise ─────────────────
function GlowPhase() {
    const embers = Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: 15 + (i % 10) * 7.5,
        delay: (i * 0.07).toFixed(2),
        dur: (1.2 + (i % 4) * 0.25).toFixed(1),
        size: i % 3 === 0 ? "10px" : i % 3 === 1 ? "7px" : "4px",
    }));
    return (
        <div style={{ textAlign: "center", animation: "pFadeIn 0.45s ease both", position: "relative" }}>
            <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
                {embers.map(e => (
                    <div key={e.id} style={{
                        position: "absolute",
                        bottom: "62px",
                        left: `${e.left}%`,
                        width: e.size, height: e.size,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, #ffe080, #c8a832)",
                        boxShadow: "0 0 6px rgba(200,168,78,0.9)",
                        animation: `emberRise ${e.dur}s ease-in ${e.delay}s infinite`,
                    }} />
                ))}
                <div style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    fontSize: "100px", lineHeight: 1,
                    filter: "drop-shadow(0 0 30px rgba(200,168,78,0.7)) drop-shadow(0 8px 20px rgba(0,0,0,0.4))",
                    animation: "bowlGlow 1.4s ease-in-out infinite",
                }}>🥗</div>
            </div>
            {/* expanding ring */}
            <div style={{
                width: "140px", height: "140px", borderRadius: "50%", margin: "-60px auto 0",
                border: "1.5px solid rgba(200,168,78,0.35)",
                boxShadow: "0 0 40px rgba(200,168,78,0.2), inset 0 0 30px rgba(200,168,78,0.06)",
                animation: "ringExpand 1.4s ease-out infinite",
                pointerEvents: "none",
            }} />
            <div style={{ ...S.label, marginTop: "24px" }}>כמעט מוכן</div>
        </div>
    );
}

// ── Phase 3: gold seal confirmation ──────────────────────
function ConfirmPhase({ total, count }) {
    return (
        <div style={{ textAlign: "center", animation: "pFadeIn 0.5s ease both" }}>
            {/* starburst rays behind seal */}
            <div style={S.burstWrap}>
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} style={{
                        ...S.burstRay,
                        transform: `rotate(${i * 45}deg)`,
                        animation: `rayPop 0.5s ease ${0.1 + i * 0.04}s both`,
                    }} />
                ))}
                {/* Gold seal */}
                <div style={S.seal}>
                    <div style={S.sealInner}>
                        <div style={S.sealCheck}>✓</div>
                    </div>
                </div>
            </div>

            <div style={S.confirmTitle}>ההזמנה נקלטה!</div>
            <div style={S.confirmSub}>מכינים עכשיו · {count} מרכיבים</div>
            <div style={S.confirmPrice}>₪{total}</div>
        </div>
    );
}

// ─── Sounds ──────────────────────────────────────────────
function playChimeSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
}

function playSuccessSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") return;
        [[523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.28]].forEach(([freq, delay]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine";
            const t = ctx.currentTime + delay;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
            osc.start(t); osc.stop(t + 0.7);
        });
    } catch (e) {}
}

// ─── Styles ──────────────────────────────────────────────
const S = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 400,
        background: "linear-gradient(160deg, #020802 0%, #061206 40%, #091809 70%, #061206 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "pFadeIn 0.35s ease",
        fontFamily: "'Heebo', sans-serif", direction: "rtl",
    },
    ambientGlow: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 65% 45% at 50% 45%, rgba(200,168,78,0.07) 0%, transparent 70%)",
    },
    container: { position: "relative", zIndex: 1, width: "100%", maxWidth: "340px", padding: "20px", height: "360px" },
    phase: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "opacity 0.5s ease", pointerEvents: "none" },

    label: {
        marginTop: "28px", fontSize: "14px", fontWeight: 700,
        color: "rgba(200,168,78,0.7)", letterSpacing: "0.04em",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        animation: "pFadeIn 0.5s ease 0.3s both",
    },

    // ConfirmPhase starburst
    burstWrap: {
        position: "relative", width: "130px", height: "130px",
        margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center",
    },
    burstRay: {
        position: "absolute",
        top: "50%", left: "50%",
        width: "2px", height: "60px",
        marginLeft: "-1px", marginTop: "-55px",
        transformOrigin: "50% 100%",
        background: "linear-gradient(to top, rgba(200,168,78,0.6), transparent)",
        borderRadius: "1px",
    },

    seal: {
        position: "relative", zIndex: 1,
        width: "130px", height: "130px", borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(200,168,78,0.14) 0%, rgba(240,208,96,0.07) 100%)",
        border: "2px solid rgba(200,168,78,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 50px rgba(200,168,78,0.3), 0 0 100px rgba(200,168,78,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
        animation: "sealPop 0.65s cubic-bezier(0.34,1.56,0.64,1) both, sealGlow 2.5s ease-in-out 0.65s infinite",
    },
    sealInner: {
        width: "98px", height: "98px", borderRadius: "50%",
        border: "1px solid rgba(200,168,78,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    sealCheck: {
        fontSize: "50px", fontWeight: 900, lineHeight: 1,
        color: "#f0d060",
        textShadow: "0 0 24px rgba(200,168,78,0.95), 0 2px 8px rgba(0,0,0,0.5)",
        animation: "checkDraw 0.35s ease 0.35s both",
    },

    confirmTitle: {
        fontSize: "24px", fontWeight: 900, color: "#ffffff",
        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        animation: "pSlideUp 0.45s ease 0.25s both",
    },
    confirmSub: {
        fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "5px", fontWeight: 500,
        animation: "pSlideUp 0.45s ease 0.35s both",
    },
    confirmPrice: {
        fontSize: "52px", fontWeight: 900, marginTop: "18px", lineHeight: 1,
        backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 40%, #ffe599 55%, #c8a832 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        animation: "pSlideUp 0.45s ease 0.45s both, shimmerMove 3s linear 1s infinite",
    },
};

const KF = `
@keyframes pFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes pSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

@keyframes ingredientDrop {
    0%   { opacity:0; transform:translateY(-140px) rotate(-15deg) scale(0.7); }
    70%  { transform:translateY(170px) rotate(5deg) scale(1.05); opacity:1; }
    85%  { transform:translateY(160px) rotate(-2deg) scale(0.97); }
    100% { transform:translateY(165px) rotate(0deg) scale(1); opacity:1; }
}

@keyframes bowlSettle {
    0%   { transform:translateX(-50%) scale(0.85); opacity:0; }
    70%  { transform:translateX(-50%) scale(1.04); }
    100% { transform:translateX(-50%) scale(1); opacity:1; }
}

@keyframes bowlShimmy {
    0%   { transform:translateX(-50%) rotate(0deg); }
    20%  { transform:translateX(-50%) rotate(-4deg) scale(1.04); }
    50%  { transform:translateX(-50%) rotate(3deg) scale(1.06); }
    75%  { transform:translateX(-50%) rotate(-2deg) scale(1.03); }
    100% { transform:translateX(-50%) rotate(0deg) scale(1); }
}

@keyframes emberRise {
    0%   { transform:translateY(0) scale(1); opacity:0.9; }
    60%  { opacity:0.6; transform:translateY(-90px) scale(0.65) translateX(6px); }
    100% { transform:translateY(-180px) scale(0.15) translateX(-4px); opacity:0; }
}

@keyframes bowlGlow {
    0%,100% { filter: drop-shadow(0 0 22px rgba(200,168,78,0.35)) drop-shadow(0 8px 20px rgba(0,0,0,0.4)); }
    50%     { filter: drop-shadow(0 0 50px rgba(200,168,78,0.75)) drop-shadow(0 8px 20px rgba(0,0,0,0.4)); }
}

@keyframes ringExpand {
    0%   { transform:scale(0.9); opacity:0.7; }
    60%  { opacity:0.3; }
    100% { transform:scale(1.7); opacity:0; }
}

@keyframes sealPop {
    0%   { transform:scale(0.55) rotate(-10deg); opacity:0; }
    65%  { transform:scale(1.08) rotate(2deg); }
    100% { transform:scale(1) rotate(0deg); opacity:1; }
}

@keyframes sealGlow {
    0%,100% { box-shadow:0 0 40px rgba(200,168,78,0.22), 0 0 80px rgba(200,168,78,0.07), inset 0 1px 0 rgba(255,255,255,0.08); }
    50%     { box-shadow:0 0 70px rgba(200,168,78,0.5), 0 0 130px rgba(200,168,78,0.18), inset 0 1px 0 rgba(255,255,255,0.12); }
}

@keyframes checkDraw {
    0%   { opacity:0; transform:scale(0.4); }
    100% { opacity:1; transform:scale(1); }
}

@keyframes rayPop {
    0%   { opacity:0; transform:rotate(var(--r,0deg)) scaleY(0); }
    60%  { opacity:0.8; transform:rotate(var(--r,0deg)) scaleY(1.1); }
    100% { opacity:0.5; transform:rotate(var(--r,0deg)) scaleY(1); }
}

@keyframes shimmerMove {
    0%   { background-position:0% center; }
    100% { background-position:200% center; }
}

* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
`;

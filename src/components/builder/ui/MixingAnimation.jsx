'use client';
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function MixingAnimation({ all, total, onComplete }) {
    const [phase, setPhase] = useState("drop"); // drop → glow → bloom
    const [bowlAnim, setBowlAnim] = useState(null);
    useEffect(() => { fetch("/cat-salad-bowl.json").then(r => r.json()).then(setBowlAnim).catch(() => {}); }, []);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("glow"),  1700);
        const t2 = setTimeout(() => setPhase("bloom"), 2900);
        // Fire onComplete while still fully visible at bloom peak.
        // OrderedScreen (z=500) cross-fades in on top — no gap, no double-fade.
        const t3 = setTimeout(() => onComplete(),      3300);

        if (navigator.vibrate) {
            navigator.vibrate([20, 80, 20]);
            setTimeout(() => navigator.vibrate([40, 30, 80, 0, 120]), 2900);
        }
        playChimeSound();
        setTimeout(() => playSuccessSound(), 1700);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    const items = all.slice(0, 10);
    const isGlow  = phase === "glow" || phase === "bloom";
    const isBloom = phase === "bloom";

    const embers = Array.from({ length: 26 }, (_, i) => ({
        id: i, left: 12 + (i % 11) * 7,
        delay: (i * 0.06).toFixed(2),
        dur: (1.0 + (i % 4) * 0.2).toFixed(1),
        size: i % 3 === 0 ? "10px" : i % 3 === 1 ? "7px" : "4px",
    }));

    return (
        <div style={S.overlay}>
            {/* Bloom flash */}
            <div style={{
                ...S.bloomFlash,
                opacity: isBloom ? 1 : 0,
                transition: isBloom ? "opacity 0.18s ease-out" : "opacity 0.5s ease-in",
            }} />
            <div style={S.ambientGlow} />

            <div style={S.container}>
                {/* ── Ingredients (drop phase only) ── */}
                <div style={{ position: "relative", width: "320px", height: "60px", margin: "0 auto", opacity: isGlow ? 0 : 1, transition: "opacity 0.45s ease", pointerEvents: "none" }}>
                    {items.map((item, i) => {
                        const col = i % 5;
                        const leftPct = 8 + col * 18;
                        return (
                            <div key={item.id} style={{
                                position: "absolute", top: 0, left: `${leftPct}%`,
                                fontSize: "28px",
                                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                                animation: `ingredientDrop 0.65s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s both`,
                            }}>
                                {item.icon && item.icon.startsWith("/")
                                    ? <img src={item.icon} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                                    : item.icon}
                            </div>
                        );
                    })}
                </div>

                {/* ── Single persistent Lottie bowl ── */}
                <div style={{
                    position: "relative", width: "320px", height: "320px", margin: "0 auto",
                    filter: isBloom
                        ? "drop-shadow(0 0 50px rgba(240,208,96,0.95)) drop-shadow(0 0 20px rgba(200,168,78,0.8))"
                        : isGlow
                            ? "drop-shadow(0 0 30px rgba(200,168,78,0.7)) drop-shadow(0 8px 20px rgba(0,0,0,0.4))"
                            : "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                    animation: isBloom ? "bowlBloom 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
                    transition: "filter 0.4s ease",
                }}>
                    {bowlAnim && <Lottie animationData={bowlAnim} loop autoplay style={{ width: "100%", height: "100%" }} />}

                    {/* Embers — glow phase, layered on top of bowl */}
                    <div style={{ position: "absolute", inset: 0, opacity: isGlow ? 1 : 0, transition: "opacity 0.45s ease", pointerEvents: "none" }}>
                        {embers.map(e => (
                            <div key={e.id} style={{
                                position: "absolute", bottom: "20%", left: `${e.left}%`,
                                width: e.size, height: e.size, borderRadius: "50%",
                                background: "radial-gradient(circle, #ffe080, #c8a832)",
                                boxShadow: "0 0 6px rgba(200,168,78,0.9)",
                                animation: `emberRise ${e.dur}s ease-in ${e.delay}s infinite`,
                            }} />
                        ))}
                        {/* Rays — bloom only */}
                        {isBloom && Array.from({ length: 8 }, (_, i) => (
                            <div key={i} style={{
                                position: "absolute", bottom: "20%", left: "50%",
                                width: "2px", height: "55px", marginLeft: "-1px",
                                transformOrigin: "50% 100%",
                                background: "linear-gradient(to top, rgba(240,208,96,0.8), transparent)",
                                borderRadius: "1px",
                                '--r': `${i * 45}deg`,
                                animation: `rayBurst 0.55s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.03}s both`,
                            }} />
                        ))}
                    </div>
                </div>

                {/* Label */}
                <div style={{ ...S.label, marginTop: "8px" }}>
                    {isBloom ? "🎉 מוכן!" : isGlow ? "כמעט מוכן" : "מכינים את הסלט שלכם"}
                </div>
            </div>
            <style>{KF}</style>
        </div>
    );
}

// ─── Sounds ──────────────────────────────────────────────────
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

// ─── Styles ──────────────────────────────────────────────────
const S = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 400,
        background: "linear-gradient(160deg, #020802 0%, #061206 40%, #091809 70%, #061206 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "pFadeIn 0.3s ease",
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl",
    },
    bloomFlash: {
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(240,208,96,0.28) 0%, rgba(200,168,78,0.08) 50%, transparent 75%)",
    },
    ambientGlow: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 65% 45% at 50% 45%, rgba(200,168,78,0.07) 0%, transparent 70%)",
    },
    container: {
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: "380px", padding: "0 20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center",
    },
    label: {
        marginTop: "24px", fontSize: "14px", fontWeight: 700,
        color: "rgba(200,168,78,0.75)", letterSpacing: "0.04em",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        animation: "pFadeIn 0.5s ease 0.3s both",
        transition: "color 0.3s ease",
    },
};

const KF = `
@keyframes pFadeIn  { from{opacity:0} to{opacity:1} }

@keyframes ingredientDrop {
    0%   { opacity:0; transform:translateY(-140px) rotate(-15deg) scale(0.7); }
    70%  { transform:translateY(170px) rotate(5deg) scale(1.05); opacity:1; }
    85%  { transform:translateY(160px) rotate(-2deg) scale(0.97); }
    100% { transform:translateY(165px) rotate(0deg) scale(1); opacity:1; }
}

@keyframes bowlBloom {
    0%   { transform:scale(0.95); }
    55%  { transform:scale(1.15); }
    100% { transform:scale(1.07); }
}

@keyframes emberRise {
    0%   { transform:translateY(0) scale(1); opacity:0.9; }
    60%  { opacity:0.6; transform:translateY(-90px) scale(0.65) translateX(6px); }
    100% { transform:translateY(-180px) scale(0.15) translateX(-4px); opacity:0; }
}

@keyframes rayBurst {
    0%   { opacity:0; transform:rotate(var(--r,0deg)) scaleY(0); }
    55%  { opacity:0.85; transform:rotate(var(--r,0deg)) scaleY(1.15); }
    100% { opacity:0.45; transform:rotate(var(--r,0deg)) scaleY(1); }
}

* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
`;

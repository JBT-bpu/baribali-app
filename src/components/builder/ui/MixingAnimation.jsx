'use client';
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "../../../lib/motionHooks";
// Choreography lives in its own .ts so the assertion harness can import it —
// see mixingTiming.ts for what the old fixed layout got wrong and why the
// stagger has to be a function of the ingredient count.
import { MOUTH_Y, DROP_DUR, pourPlan } from "./mixingTiming";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * The submit animation. `stillSending` is set by the caller when the animation
 * has run its course but the server has not answered yet — without it the
 * overlay sat on "🎉 מוכן!" while the order was still in flight, which is both
 * a lie and indistinguishable from the app having frozen.
 */
export default function MixingAnimation({ all, total, onComplete, stillSending }) {
    const [phase, setPhase] = useState("drop"); // drop → glow → bloom
    const [bowlAnim, setBowlAnim] = useState(null);
    // This is the most motion-heavy screen in the app — falling ingredients, a
    // bloom flash, 26 rising embers, 8 rotating rays and a scaling bowl. The
    // phase timing and onComplete are untouched by this, so the order flow is
    // identical either way; only the spectacle is dropped.
    const reducedMotion = usePrefersReducedMotion();
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

    // No cap: every ingredient the customer chose gets shown. The stagger
    // adapts instead — see pourPlan.
    const items = all;
    const plan = pourPlan(items.length);
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
            {/* Bloom flash. Suppressed under reduced motion — a full-screen
                0-to-1 flash in 0.18s is the one thing here I would least want
                to defend to someone with vestibular or photosensitivity. */}
            <div style={{
                ...S.bloomFlash,
                opacity: isBloom && !reducedMotion ? 1 : 0,
                transition: isBloom ? "opacity 0.18s ease-out" : "opacity 0.5s ease-in",
            }} />
            <div style={S.ambientGlow} />

            <div style={S.container}>
                {/* ── Single persistent Lottie bowl ── */}
                <div style={{
                    position: "relative", width: "320px", height: "320px", margin: "0 auto",
                    filter: isBloom
                        ? "drop-shadow(0 0 50px rgba(240,208,96,0.95)) drop-shadow(0 0 20px rgba(200,168,78,0.8))"
                        : isGlow
                            ? "drop-shadow(0 0 30px rgba(200,168,78,0.7)) drop-shadow(0 8px 20px rgba(0,0,0,0.4))"
                            : "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                    animation: isBloom && !reducedMotion ? "bowlBloom 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
                    transition: "filter 0.4s ease",
                }}>
                    {bowlAnim && <Lottie animationData={bowlAnim} loop autoplay style={{ width: "100%", height: "100%" }} />}

                    {/* ── Ingredients pouring in ──
                        Each one is positioned AT the bowl's mouth and starts
                        offset from it (--ex/--ey), so they converge and vanish
                        into the bowl rather than queueing up above it. Same idea
                        as the builder's own add animation, so the customer has
                        seen this motion before. Because they arrive one at a
                        time and disappear on arrival, any number of them can
                        share the destination without colliding — which is what
                        the old fixed five-column layout could not do. */}
                    {!reducedMotion && (
                        <div style={{ position: "absolute", inset: 0, opacity: isGlow ? 0 : 1, transition: "opacity 0.45s ease", pointerEvents: "none" }}>
                            {items.map((item, i) => (
                                <div key={`${item.id}-${i}`} style={{
                                    position: "absolute",
                                    left: "50%", top: `${MOUTH_Y * 100}%`,
                                    marginLeft: "-16px", marginTop: "-16px",
                                    width: "32px", height: "32px",
                                    fontSize: "30px", lineHeight: 1,
                                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                                    '--ex': `${plan[i].ex}px`,
                                    '--ey': `${plan[i].ey}px`,
                                    '--rot': `${plan[i].rot}deg`,
                                    animation: `pourIntoBowl ${DROP_DUR}s cubic-bezier(0.34,1.2,0.64,1) ${plan[i].delay}s both`,
                                }}>
                                    {item.icon && item.icon.startsWith("/")
                                        ? <img src={item.icon} alt="" style={{ width: "32px", height: "32px", objectFit: "contain", display: "block" }} />
                                        : item.icon}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Embers — glow phase, layered on top of bowl */}
                    {!reducedMotion && (
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
                    )}
                </div>

                {/* Label */}
                <div style={{ ...S.label, marginTop: "8px" }}>
                    {stillSending ? "עוד רגע — שולחים למטבח…"
                        : isBloom ? "🎉 מוכן!"
                            : isGlow ? "כמעט מוכן"
                                : "מכינים את הסלט שלכם"}
                </div>
                {stillSending && <div style={S.stillDots} aria-live="polite" />}
            </div>
            <style>{KF}</style>
        </div>
    );
}

// ─── Sounds ──────────────────────────────────────────────────
// Both helpers close their context when done. They used to leak one per call —
// two per order — and browsers cap concurrent AudioContexts at around six, so
// after a few orders in one session the sounds simply stopped.
function playChimeSound() {
    let ctx;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") { ctx.close(); return; }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch { try { ctx?.close(); } catch { /* already gone */ } }
}

function playSuccessSound() {
    let ctx;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") { ctx.close(); return; }
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
        setTimeout(() => ctx.close().catch(() => {}), 1200);
    } catch { try { ctx?.close(); } catch { /* already gone */ } }
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
    // A moving element while waiting: a frozen screen and a slow screen have to
    // look different, or people start tapping the button again.
    stillDots: {
        marginTop: "12px", width: "34px", height: "3px", borderRadius: "2px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.9), transparent)",
        backgroundSize: "200% 100%",
        animation: "sendingSweep 1.1s ease-in-out infinite",
    },
};

const KF = `
@keyframes pFadeIn  { from{opacity:0} to{opacity:1} }

@keyframes sendingSweep { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

@keyframes pourIntoBowl {
    0%   { opacity:0; transform:translate(var(--ex),var(--ey)) scale(0.8) rotate(var(--rot)); }
    15%  { opacity:1; }
    70%  { opacity:1; transform:translate(0,0) scale(1.15) rotate(0deg); }
    100% { opacity:0; transform:translate(0,0) scale(0.12) rotate(0deg); }
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

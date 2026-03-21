// ─── FAIRY-TALE BACKGROUND SYSTEM ────────────────────────────
// Matching reference: green-gold bokeh, sparkle stars, floating produce
// ALL pure CSS — zero JS, zero canvas, zero performance cost

const FLOATERS = [
    // Floating produce (faster, more dynamic with variants)
    { e: "🍅", sz: 30, t: "4%", l: "3%", d: 0, dur: 6, bl: 1, op: 0.08, rot: 12, dx: 10, dy: 15, scale: 1.05 },
    { e: "🥬", sz: 24, t: "12%", r: "4%", d: 2, dur: 7, bl: 2, op: 0.05, rot: -8, dx: -8, dy: 12, scale: 1.08 },
    { e: "🥒", sz: 18, t: "28%", l: "1%", d: 4, dur: 8, bl: 1, op: 0.06, rot: 15, dx: 6, dy: -10, scale: 1.03 },
    { e: "🌶️", sz: 26, t: "52%", r: "2%", d: 1, dur: 5, bl: 2, op: 0.05, rot: -10, dx: -12, dy: 8, scale: 1.06 },
    { e: "🥕", sz: 20, t: "75%", l: "3%", d: 3, dur: 7, bl: 0, op: 0.06, rot: 20, dx: 8, dy: -6, scale: 1.04 },
    { e: "🍋", sz: 22, t: "38%", r: "1%", d: 5, dur: 9, bl: 1, op: 0.05, rot: -15, dx: -10, dy: 14, scale: 1.07 },
    { e: "🌽", sz: 16, t: "88%", r: "5%", d: 7, dur: 6, bl: 1, op: 0.04, rot: 8, dx: 5, dy: -8, scale: 1.02 },
    { e: "🍆", sz: 18, t: "62%", l: "2%", d: 6, dur: 8, bl: 2, op: 0.04, rot: -12, dx: -6, dy: 10, scale: 1.05 },
    { e: "🌿", sz: 14, t: "18%", l: "92%", d: 3, dur: 10, bl: 3, op: 0.03, rot: 25, dx: 4, dy: -12, scale: 1.09 },
    { e: "🥦", sz: 15, t: "45%", l: "95%", d: 8, dur: 7, bl: 1, op: 0.04, rot: -6, dx: -8, dy: 6, scale: 1.03 },
    // Additional vegetables with more variety
    { e: "🥦", sz: 28, t: "5%", r: "8%", d: 1, dur: 6, bl: 1, op: 0.05, rot: -5, dx: 10, dy: -10, scale: 1.06 },
    { e: "🥑", sz: 22, t: "22%", l: "85%", d: 3, dur: 8, bl: 2, op: 0.04, rot: 18, dx: -6, dy: 8, scale: 1.04 },
    { e: "🥗", sz: 26, t: "40%", r: "12%", d: 5, dur: 7, bl: 1, op: 0.04, rot: -12, dx: 8, dy: -6, scale: 1.08 },
    { e: "🌶️", sz: 16, t: "58%", l: "88%", d: 2, dur: 9, bl: 2, op: 0.04, rot: 25, dx: -4, dy: 12, scale: 1.02 },
    { e: "🧄", sz: 14, t: "72%", r: "15%", d: 4, dur: 10, bl: 1, op: 0.03, rot: -8, dx: 6, dy: -8, scale: 1.05 },
    { e: "🧅", sz: 18, t: "85%", l: "90%", d: 6, dur: 6, bl: 2, op: 0.04, rot: 15, dx: -10, dy: 10, scale: 1.07 },
    { e: "🌽", sz: 20, t: "8%", l: "92%", d: 0, dur: 8, bl: 1, op: 0.04, rot: -20, dx: 5, dy: -12, scale: 1.03 },
    { e: "🥔", sz: 24, t: "32%", r: "18%", d: 7, dur: 7, bl: 1, op: 0.04, rot: 10, dx: -8, dy: 6, scale: 1.06 },
    { e: "🍠", sz: 22, t: "55%", l: "95%", d: 3, dur: 9, bl: 2, op: 0.04, rot: -15, dx: 10, dy: -8, scale: 1.04 },
    { e: "🍄", sz: 16, t: "78%", r: "22%", d: 5, dur: 10, bl: 1, op: 0.03, rot: 22, dx: -6, dy: 10, scale: 1.02 },
];

// Golden bokeh circles — various sizes matching reference image
const BOKEH = [
    // Large bokeh (30-60px) — few, prominent
    { sz: 55, t: "8%", l: "20%", d: 0, dur: 12, op: 0.08, color: "255,235,150" },
    { sz: 45, t: "30%", r: "8%", d: 3, dur: 15, op: 0.07, color: "255,255,200" },
    { sz: 50, t: "65%", l: "15%", d: 6, dur: 14, op: 0.06, color: "200,220,100" },
    { sz: 40, t: "85%", r: "20%", d: 2, dur: 11, op: 0.07, color: "255,235,150" },
    // Medium bokeh (15-30px) — scattered
    { sz: 25, t: "5%", l: "55%", d: 1, dur: 10, op: 0.09, color: "255,245,180" },
    { sz: 20, t: "22%", l: "8%", d: 4, dur: 13, op: 0.08, color: "200,230,120" },
    { sz: 28, t: "42%", r: "25%", d: 2, dur: 16, op: 0.07, color: "255,240,160" },
    { sz: 18, t: "55%", l: "40%", d: 5, dur: 11, op: 0.08, color: "255,255,210" },
    { sz: 22, t: "72%", r: "40%", d: 7, dur: 14, op: 0.06, color: "220,235,130" },
    { sz: 24, t: "15%", r: "35%", d: 3, dur: 12, op: 0.08, color: "255,255,200" },
    { sz: 16, t: "48%", l: "70%", d: 8, dur: 17, op: 0.07, color: "255,255,220" },
    // Small bokeh (6-14px) — many, subtle
    { sz: 10, t: "3%", l: "40%", d: 0, dur: 8, op: 0.1, color: "255,255,220" },
    { sz: 8, t: "18%", r: "15%", d: 2, dur: 9, op: 0.09, color: "200,230,120" },
    { sz: 12, t: "35%", l: "60%", d: 4, dur: 11, op: 0.09, color: "255,240,160" },
    { sz: 7, t: "50%", r: "50%", d: 1, dur: 7, op: 0.11, color: "255,255,200" },
    { sz: 9, t: "68%", l: "25%", d: 6, dur: 10, op: 0.09, color: "255,255,210" },
    { sz: 11, t: "78%", r: "60%", d: 3, dur: 12, op: 0.08, color: "255,255,220" },
    { sz: 6, t: "92%", l: "50%", d: 5, dur: 8, op: 0.08, color: "220,235,130" },
    { sz: 8, t: "10%", l: "75%", d: 7, dur: 9, op: 0.09, color: "255,245,180" },
    { sz: 10, t: "58%", l: "85%", d: 2, dur: 11, op: 0.07, color: "255,255,220" },
    // Extra tiny particles
    { sz: 5, t: "25%", l: "30%", d: 1, dur: 7, op: 0.1, color: "255,250,200" },
    { sz: 4, t: "44%", r: "10%", d: 3, dur: 6, op: 0.11, color: "255,240,150" },
    { sz: 6, t: "60%", l: "55%", d: 0, dur: 9, op: 0.09, color: "255,255,210" },
    { sz: 5, t: "80%", l: "70%", d: 5, dur: 8, op: 0.08, color: "220,235,130" },
    { sz: 7, t: "14%", l: "44%", d: 2, dur: 10, op: 0.1, color: "255,245,180" },
    { sz: 4, t: "36%", r: "42%", d: 4, dur: 7, op: 0.09, color: "255,255,200" },
    { sz: 5, t: "70%", r: "30%", d: 6, dur: 8, op: 0.08, color: "255,250,170" },
];

// 4-pointed sparkle stars
const SPARKLES = [
    { sz: 12, t: "6%", l: "30%", d: 0, dur: 3, op: 0.35 },
    { sz: 8, t: "20%", r: "12%", d: 1.5, dur: 4, op: 0.3 },
    { sz: 14, t: "35%", l: "75%", d: 0.8, dur: 3.5, op: 0.28 },
    { sz: 10, t: "50%", r: "30%", d: 2, dur: 4.5, op: 0.25 },
    { sz: 7, t: "70%", l: "45%", d: 1, dur: 3, op: 0.3 },
    { sz: 11, t: "82%", r: "55%", d: 2.5, dur: 5, op: 0.22 },
    { sz: 9, t: "15%", l: "50%", d: 3, dur: 3.5, op: 0.25 },
    { sz: 6, t: "42%", l: "10%", d: 0.5, dur: 4, op: 0.25 },
    { sz: 13, t: "60%", r: "8%", d: 1.8, dur: 3, op: 0.3 },
    { sz: 8, t: "90%", l: "20%", d: 2.2, dur: 4.5, op: 0.22 },
    { sz: 10, t: "28%", l: "62%", d: 1.2, dur: 3.5, op: 0.28 },
    { sz: 7, t: "54%", l: "22%", d: 0.4, dur: 4, op: 0.25 },
    { sz: 9, t: "75%", r: "18%", d: 2.8, dur: 3, op: 0.3 },
];

// ─── SMALL COMPONENTS ───────────────────────────────────────

function Floater({ e, sz, t, l, r, d, dur, bl, op, rot, dx, dy, scale, isTransforming }) {
    return <div style={{
        position: "fixed",
        zIndex: 1,
        fontSize: `${sz}px`,
        top: t,
        left: l,
        right: r,
        opacity: op,
        filter: `blur(${bl}px)`,
        pointerEvents: "none",
        animation: `vegFloat ${isTransforming ? dur * 0.5 : dur}s ease-in-out ${d}s infinite, vegScale ${dur * 1.5}s ease-in-out ${d}s infinite, vegRotate ${dur * 2}s linear ${d}s infinite`,
        transform: `rotate(${rot || 0}deg)`,
        '--dx': `${dx || 0}px`,
        '--dy': `${dy || 0}px`,
        '--scale': scale || 1,
        '--base-duration': `${dur}s`
    }}>{e}</div>;
}

function BokehCircle({ sz, t, l, r, d, dur, op, color, isTransforming }) {
    return <div style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: `${sz}px`, height: `${sz}px`, borderRadius: "50%",
        top: t, left: l, right: r,
        background: `radial-gradient(circle, rgba(${color},${op * 1.5}) 0%, rgba(${color},${op * 0.5}) 40%, transparent 70%)`,
        animation: `bokehDrift ${isTransforming ? dur * 0.5 : dur}s ease-in-out ${d}s infinite`,
        boxShadow: sz > 20 ? `0 0 ${sz / 2}px rgba(${color},${op * 0.3})` : "none",
        '--base-duration': `${dur}s`
    }} />;
}

function SparkStar({ sz, t, l, r, d, dur, op, isTransforming }) {
    return <div style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: `${sz}px`, height: `${sz}px`, top: t, left: l, right: r,
        animation: `sparkle ${isTransforming ? dur * 0.5 : dur}s ease-in-out ${d}s infinite`,
        opacity: 0,
        '--base-duration': `${dur}s`
    }}>
        {/* 4-pointed star via CSS */}
        <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(0deg, transparent 38%, rgba(255,245,180,${op}) 48%, rgba(255,255,255,${op * 1.2}) 50%, rgba(255,255,255,${op}) 52%, transparent 62%), linear-gradient(90deg, transparent 38%, rgba(255,245,180,${op}) 48%, rgba(255,255,255,${op * 1.2}) 50%, rgba(255,255,255,${op}) 52%, transparent 62%)`,
        }} />
    </div>;
}

// ─── KEYFRAMES ────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes vegFloat {
    0%, 100% { transform: translate(0, 0) rotate(var(--rot, 0deg)); }
    50% { transform: translate(var(--dx, 0px) var(--dy, 0px) rotate(var(--rot, 0deg)); }
}
@keyframes vegScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(var(--scale, 1.05)); }
}
@keyframes vegRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
@keyframes bokehDrift {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: var(--op, 0.1); }
    50% { transform: translate(10px, -15px) scale(1.1); opacity: calc(var(--op, 0.1) * 1.3); }
}
@keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: var(--op, 0.3); transform: scale(1.2); }
}
@keyframes transformPulse {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); }
    100% { transform: scale(1); }
}
@keyframes transformSpeed {
    0% { animation-duration: var(--base-duration, 8s); }
    100% { animation-duration: calc(var(--base-duration, 8s) * 0.5); }
}
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────

// Renders the full fairy-tale background
export default function MagicBackground({ isTransforming = false }) {
    return (
        <>
            <style>{KEYFRAMES}</style>
            <div style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                transition: isTransforming ? "all 0.3s ease-out" : "none",
                transform: isTransforming ? "scale(1.1)" : "scale(1)",
                animation: isTransforming ? "transformPulse 0.5s ease-out" : "none"
            }}>
                {FLOATERS.map((f, i) => <Floater key={`f${i}`} {...f} isTransforming={isTransforming} />)}
                {BOKEH.map((b, i) => <BokehCircle key={`b${i}`} {...b} isTransforming={isTransforming} />)}
                {SPARKLES.map((s, i) => <SparkStar key={`s${i}`} {...s} isTransforming={isTransforming} />)}
            </div>
        </>
    );
}

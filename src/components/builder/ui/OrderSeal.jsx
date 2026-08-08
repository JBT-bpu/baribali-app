'use client';
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { dustPlan, GATHER_AT } from "./sealTiming";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * The struck medallion, and the gold dust that becomes it.
 *
 * Sized entirely in `em` off its own font-size, which the caller sets from the
 * container's width. That is what lets this drop straight into BariPlaque's
 * pedestal slot: the slot is a square whose size is a fraction of the plaque's
 * width, so anything inside it has to scale with the width or it will be right
 * on one phone and wrong on every other. No media queries, no measurement.
 *
 * The face is the cat — the same cat-salad-final.json the confirmation screen
 * shows in the same slot — so when the plaque takes over there is nothing to
 * cross-fade. The ring fades and the composition underneath is already correct.
 */
export default function OrderSeal({ stage, reducedMotion = false, dustCount = 26 }) {
    const [catAnim, setCatAnim] = useState(null);
    useEffect(() => {
        fetch("/cat-salad-final.json").then(r => r.json()).then(setCatAnim).catch(() => { });
    }, []);

    const struck = stage !== "gather";
    const faced = stage === "face" || stage === "sheen" || stage === "settle" || stage === "done";
    const sheening = stage === "sheen" || stage === "settle" || stage === "done";
    // Struck metal should keep catching the light. Once the face is in, the
    // bezel turns slowly and the halo breathes — forever, including on the
    // confirmation screen, which is where the seal spends most of its life. A
    // static disc under a looping cat read as a still image with a GIF in it.
    const alive = faced && !reducedMotion;
    const dust = reducedMotion ? [] : dustPlan(dustCount);

    return (
        <div style={S.root}>
            {/* ── The charge ──
                A ring contracting onto the centre and a core brightening under
                it, both landing exactly when the medallion strikes. Without
                them the dust arrived at nothing: motes converged on empty space
                and then, separately, a disc appeared. These give the gather
                somewhere to converge TO, so the strike reads as the payoff of
                the previous second rather than as a new event. */}
            {!reducedMotion && stage === "gather" && (
                <>
                    <div style={{ ...S.chargeRing, animation: `sealChargeRing ${GATHER_AT}s cubic-bezier(0.55,0,0.85,0.35) both` }} aria-hidden="true" />
                    <div style={{ ...S.chargeCore, animation: `sealChargeCore ${GATHER_AT}s cubic-bezier(0.7,0,0.9,0.4) both` }} aria-hidden="true" />
                </>
            )}

            {/* Gold dust spiralling in. Absorbed before the flare, never during —
                see dustPlan: the delay is derived from each mote's flight time
                so they all land by the same instant however long they take. */}
            {!reducedMotion && stage === "gather" && (
                <div style={S.layer} aria-hidden="true">
                    {dust.map((m, i) => (
                        <div key={i} style={{
                            ...S.mote,
                            width: `${m.sizeEm}em`, height: `${m.sizeEm}em`,
                            '--a': `${m.angle}deg`,
                            '--d': `${m.distEm}em`,
                            animation: `sealMoteIn ${m.dur}s cubic-bezier(0.5,0,0.75,0.2) ${m.delay}s both`,
                        }} />
                    ))}
                </div>
            )}

            {/* Shockwave. One ring, once, at the strike — the thing that sells
                the impact. Under reduced motion it never renders. */}
            {!reducedMotion && struck && (
                <div style={{ ...S.shock, animation: "sealShock 0.55s cubic-bezier(0.15,0.7,0.3,1) both" }} aria-hidden="true" />
            )}

            {/* The flare the medallion arrives out of.
                Opacity is left to S.flare (0) and the keyframes, which both
                start and end at 0. Do NOT reintroduce an `opacity: undefined`
                here: React treats undefined as "remove this property", so it
                overrode the 0 from the spread and the flare sat at FULL
                brightness through the gather — a bright core where there should
                have been darkness, and no punch left for the strike. */}
            <div style={{
                ...S.flare,
                animation: !reducedMotion && struck ? "sealFlare 0.7s ease-out both" : undefined,
            }} aria-hidden="true" />

            {/* Breathing halo. Its own element rather than a filter on the disc:
                the disc already owns a transform (sealStrike), and CSS cannot
                stack two animations on one transform. */}
            {alive && (
                <div style={{ ...S.halo, animation: "sealBreathe 4.5s ease-in-out infinite" }} aria-hidden="true" />
            )}

            {/* ── The medallion ── */}
            <div style={{
                ...S.disc,
                opacity: struck ? 1 : 0,
                animation: !reducedMotion && struck ? "sealStrike 0.55s cubic-bezier(0.2,1.5,0.4,1) both" : undefined,
                transition: reducedMotion ? "opacity 0.35s ease" : undefined,
            }}>
                {/* Rotating the conic gradient walks its highlight around the
                    bezel — the way a real coin catches light as it tilts. Slow
                    enough (18s) to register as alive, not as spinning. */}
                <div style={{ ...S.rim, animation: alive ? "sealRimTurn 18s linear infinite" : undefined }} />
                <div style={S.bevel} />

                {/* The face. Fades up inside the ring rather than arriving with
                    it, so the strike reads as the metal and the cat as what is
                    revealed in it. */}
                <div style={{ ...S.face, opacity: faced ? 1 : 0 }}>
                    {catAnim && (
                        <Lottie
                            animationData={catAnim}
                            loop
                            autoplay={!reducedMotion}
                            style={{ width: "100%", height: "100%" }}
                        />
                    )}
                </div>

                {/* Sheen, clipped to the disc. A single pass — a looping shine
                    would read as a "loading" spinner, which is the one thing
                    this moment must not look like. */}
                {!reducedMotion && sheening && (
                    <div style={{ ...S.sheen, animation: "sealSheen 0.85s ease-in-out both" }} aria-hidden="true" />
                )}
            </div>

            <style href="bari-order-seal" precedence="default">{KF}</style>
        </div>
    );
}

const S = {
    root: {
        position: "relative", width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    layer: { position: "absolute", inset: 0, pointerEvents: "none" },
    mote: {
        position: "absolute", left: "50%", top: "50%",
        borderRadius: "50%",
        background: "radial-gradient(circle, #ffe9a8 0%, #f0d060 45%, rgba(200,168,78,0) 72%)",
    },
    shock: {
        position: "absolute", left: "50%", top: "50%",
        width: "100%", height: "100%", marginLeft: "-50%", marginTop: "-50%",
        borderRadius: "50%", border: "0.12em solid rgba(240,208,96,0.9)",
        pointerEvents: "none",
    },
    flare: {
        position: "absolute", inset: "-25%", opacity: 0, pointerEvents: "none",
        background: "radial-gradient(circle, rgba(255,244,214,0.95) 0%, rgba(240,208,96,0.55) 28%, rgba(200,168,78,0) 62%)",
    },
    // Contracts from well outside the disc onto its rim, arriving as the
    // medallion does. The opposite motion to sealShock, on purpose: one closes
    // the charge, the other opens the impact.
    chargeRing: {
        position: "absolute", left: "50%", top: "50%",
        width: "100%", height: "100%", marginLeft: "-50%", marginTop: "-50%",
        borderRadius: "50%", border: "0.06em solid rgba(240,208,96,0.55)",
        pointerEvents: "none",
    },
    chargeCore: {
        position: "absolute", left: "50%", top: "50%",
        width: "40%", height: "40%", marginLeft: "-20%", marginTop: "-20%",
        borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(255,248,224,0.95) 0%, rgba(240,208,96,0.6) 40%, rgba(200,168,78,0) 72%)",
    },
    halo: {
        position: "absolute", inset: "-12%", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(240,208,96,0.30) 0%, rgba(200,168,78,0.12) 45%, rgba(200,168,78,0) 70%)",
    },
    disc: {
        position: "relative", width: "100%", height: "100%", borderRadius: "50%",
        background: "radial-gradient(circle at 50% 38%, #102a10 0%, #071a07 58%, #041004 100%)",
        boxShadow: "0 0.10em 0.5em rgba(0,0,0,0.6), inset 0 0 0.6em rgba(0,0,0,0.55)",
        overflow: "hidden",
    },
    // Two rings rather than one border: the outer carries the gold gradient, the
    // inner is the engraved step that makes it read as struck rather than drawn.
    rim: {
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 210deg, #6b5418, #f0d060 18%, #fff3c4 27%, #c8a832 43%, #6b5418 58%, #e6c65a 78%, #f7e59a 88%, #6b5418 100%)",
        WebkitMask: "radial-gradient(circle, transparent 0, transparent calc(50% - 0.20em), #000 calc(50% - 0.20em))",
        mask: "radial-gradient(circle, transparent 0, transparent calc(50% - 0.20em), #000 calc(50% - 0.20em))",
    },
    bevel: {
        position: "absolute", inset: "0.22em", borderRadius: "50%",
        border: "0.045em solid rgba(200,168,78,0.55)",
        boxShadow: "inset 0 0.06em 0.25em rgba(0,0,0,0.55)",
        pointerEvents: "none",
    },
    // Inset well inside the rim, not just past it. The cat Lottie fills its
    // square almost edge to edge, so a tight inset put the tail and the bowl's
    // base under the circular mask — the two things that make it read as a cat
    // with a salad.
    face: {
        position: "absolute", inset: "1.5em", borderRadius: "50%",
        transition: "opacity 0.45s ease",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    sheen: {
        position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
        background: "linear-gradient(115deg, transparent 38%, rgba(255,248,224,0.55) 48%, rgba(255,255,255,0.28) 52%, transparent 62%)",
    },
};

// Namespaced like the plaque's set, and for the same reason: a component-local
// <style> injects GLOBALLY scoped keyframes, and this app has already had one
// `fadeUp` declared four times with three different travel distances.
const KF = `
/* translate(-50%,-50%) first so the mote's CENTRE is what sits at the seal's
   centre — without it every mote converges half its own width off-target, which
   at a 0.42em spark is visible as a smear rather than a point.
   The counter-rotation keeps the spark itself upright while it orbits in. */
@keyframes sealMoteIn {
    0%   { opacity:0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(var(--d)) rotate(calc(var(--a) * -1)) scale(0.5); }
    18%  { opacity:1; }
    100% { opacity:0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(0) rotate(calc(var(--a) * -1)) scale(0.25); }
}
/* The charge. Both ease-IN (slow, then rushing) so the last third of the gather
   accelerates into the strike instead of arriving at a constant rate. */
/* Starts at 2.1x, not 3.4x. The disc is half the plaque's width, so 3.4x is
   wider than a 390px phone: the overlay clipped it and what reached the screen
   was a stray arc across the background rather than a ring closing in. */
@keyframes sealChargeRing {
    0%   { opacity:0;    transform: scale(2.1); border-width:0.02em; }
    30%  { opacity:0.7; }
    100% { opacity:1;    transform: scale(1);   border-width:0.10em; }
}
@keyframes sealChargeCore {
    0%   { opacity:0;    transform: scale(0.2); }
    60%  { opacity:0.55; transform: scale(0.75); }
    100% { opacity:1;    transform: scale(1.25); }
}

@keyframes sealStrike {
    0%   { opacity:0; transform: scale(1.75); }
    55%  { opacity:1; transform: scale(0.94); }
    100% { opacity:1; transform: scale(1); }
}
@keyframes sealFlare {
    0%   { opacity:0; transform: scale(0.35); }
    18%  { opacity:1; transform: scale(1.05); }
    100% { opacity:0; transform: scale(1.5); }
}
@keyframes sealShock {
    0%   { opacity:0.95; transform: scale(0.35); border-width:0.16em; }
    100% { opacity:0;    transform: scale(2.4);  border-width:0.02em; }
}
@keyframes sealSheen {
    0%   { opacity:0; transform: translateX(-120%); }
    25%  { opacity:1; }
    100% { opacity:0; transform: translateX(120%); }
}
/* The two that never stop. Transform and opacity only, so they stay on the
   compositor and cost nothing while the confirmation screen sits open. */
@keyframes sealRimTurn { to { transform: rotate(360deg); } }
@keyframes sealBreathe {
    0%,100% { opacity:0.45; transform: scale(1); }
    50%     { opacity:0.95; transform: scale(1.055); }
}

/* Lives here rather than in MixingAnimation because this block is the one that
   gets hoisted into <head>; a page-local <style> would be shadowable. */
@keyframes sealSendingSweep { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`;

'use client';
import { useState, useEffect, useMemo } from "react";
import { usePrefersReducedMotion } from "../../../lib/motionHooks";
// The builder's 🔊 toggle governs this screen too. It did not used to: these are
// the two loudest sounds in the app and they fired even when muted.
import { isSoundOn } from "../../../lib/soundPref";
import BariPlaque from "../../ui/bari/BariPlaque";
import { PLAQUE } from "../../ui/bari/plaqueGeometry";
import OrderSeal from "./OrderSeal.jsx";
// Choreography lives in its own .ts so the assertion harness can import it —
// see sealTiming.ts for the stage clock and for what the old ingredient pour
// got wrong about the bowl artwork.
import { STAGES, GATHER_AT, DONE_AT, SEAL_FOOTPRINT, PLAQUE_TOP, PLAQUE_MARGIN, stageAt } from "./sealTiming";

/**
 * The post-order moment.
 *
 * This is the confirmation screen ARRIVING, not a separate animation played
 * before it. The backdrop, the plaque frame and the seal are the same
 * components at the same geometry OrderedScreen uses, and this screen leaves
 * the plaque's interior EMPTY — so the swap adds content and changes nothing.
 * Neither screen fades as a whole. Three things make that hold, and all three
 * were found by measuring rather than by looking:
 *
 *   - both anchor the plaque at PLAQUE_TOP instead of centring, because the
 *     confirmation's is taller and centring moved the seal 79px;
 *   - both override BariPlaque's `margin: auto`, because an auto margin beats
 *     the flex container's align-items;
 *   - this screen renders no title and no body, because two different Hebrew
 *     strings dissolving through each other is what the seam actually was.
 *
 * The app used to celebrate twice inside half a second: this overlay bloomed at
 * 2.9s, cut hard to the plaque, and fired confetti 450ms later. Two payoffs that
 * close blur into one.
 *
 * `stillSending` is set by the caller when the sequence has run its course but
 * the server has not answered yet — without it the overlay sat on a finished
 * confirmation while the order was still in flight, which is both a lie and
 * indistinguishable from the app having frozen.
 */
// No `all`, and no `total`. The seal is about the order being accepted, not
// about what is in it — the ingredients have already had three surfaces. Both
// props were left destructured and unread once the pour went; dead props are
// how a component starts pretending to depend on things it does not.
export default function MixingAnimation({ onComplete, stillSending }) {
    const [stage, setStage] = useState("gather");
    // Falling gold dust, a flare, a shockwave and a struck medallion — this is
    // still the most motion-heavy screen in the app. The stage clock and
    // onComplete are untouched by the preference, so the order flow is identical
    // either way; only the spectacle is dropped.
    const reducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        // Every timer is collected and cleared together. Two of them used to be
        // fire-and-forget, so a FAILED order — which unmounts this overlay via
        // failSubmit — still played the success arpeggio and buzzed the
        // celebration haptic a second later, on top of the failure message.
        const timers = [];
        const at = (seconds, fn) => timers.push(setTimeout(fn, seconds * 1000));

        for (const s of STAGES) at(s.end, () => setStage(stageAt(s.end + 0.001)));
        // Fire onComplete once the frame's 0.55s fade has finished, so the
        // plaque is at full opacity when OrderedScreen (z=500) takes over with
        // its own frame at full opacity. Handing off mid-fade would snap.
        at(DONE_AT, () => onComplete());

        if (navigator.vibrate) {
            // A tick as the dust gathers, then the strike itself.
            navigator.vibrate(12);
            at(GATHER_AT, () => navigator.vibrate([30, 40, 90]));
        }
        // Checked once, at the start: the toggle lives in the builder header and
        // cannot be reached from here, so re-reading it mid-sequence would only
        // ever return the same answer.
        if (isSoundOn()) {
            at(GATHER_AT - 0.55, () => playGatherSound());
            at(GATHER_AT, () => playStrikeSound());
        }

        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    const struck = stage !== "gather";
    const formed = stage === "sheen" || stage === "settle" || stage === "done";

    // The seal is sized in `em` off this font-size, so it fills the pedestal
    // square at every width without a media query. cqw would be tidier but the
    // pedestal slot is not a container, and making it one would change how the
    // confirmation screen lays out.
    // width/height 100% is load-bearing, not tidiness: BariPlaque's pedestal
    // wrapper is an aspect-ratio box, so a bare inline-styled div inside it has
    // no height and the seal collapses to nothing.
    const sealFont = useMemo(() => ({
        width: "100%", height: "100%",
        fontSize: `calc(min(100vw, ${PLAQUE.maxWidth}px) * ${SEAL_FOOTPRINT} / 12)`,
    }), []);

    return (
        <div style={S.overlay}>
            <div style={{ ...S.backdrop, opacity: struck ? 1 : 0.35 }} />

            <BariPlaque
                style={{ margin: PLAQUE_MARGIN }}
                pedestal={<div style={sealFont}><OrderSeal stage={stage} reducedMotion={reducedMotion} /></div>}
                // Smaller than the default 0.66. That default suits the cat
                // Lottie, which carries a wide transparent margin; a full-bleed
                // disc at the same footprint pokes out through the arch.
                pedestalWidth={SEAL_FOOTPRINT}
                // The frame is what turns the seal into the confirmation. It
                // fades in around the medallion instead of the whole screen
                // being replaced.
                frameStyle={{
                    opacity: formed ? 1 : 0,
                    transform: formed ? "scale(1)" : "scale(0.965)",
                    transition: reducedMotion
                        ? "opacity 0.4s ease"
                        : "opacity 0.55s ease, transform 0.55s cubic-bezier(0.2,0.9,0.3,1)",
                }}
            />

            {/* NOTHING inside the plaque. It used to carry its own title and a
                line of meta, which meant that at the handoff two DIFFERENT
                Hebrew strings cross-dissolved in the same box — "ההזמנה נחתמה"
                ghosting through "בהכנה!" — while the confirmation faded in over
                it. That was the seam: not the frame, not the seal, the words.
                Now the swap only ever ADDS content, and there is nothing to
                dissolve. The wait message lives outside the frame for the same
                reason: it must not change the plaque's insides. */}
            {stillSending && (
                <div style={S.waiting} aria-live="polite">
                    <span>עוד רגע — שולחים למטבח…</span>
                    <div style={S.stillDots} />
                </div>
            )}
        </div>
    );
}

// ─── Sounds ──────────────────────────────────────────────────
// Both helpers close their context when done. They used to leak one per call —
// two per order — and browsers cap concurrent AudioContexts at around six, so
// after a few orders in one session the sounds simply stopped.

/** A rising shimmer under the gathering dust. */
function playGatherSound() {
    let ctx;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") { ctx.close(); return; }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.42);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
        osc.start(); osc.stop(ctx.currentTime + 0.56);
        setTimeout(() => ctx.close().catch(() => { }), 800);
    } catch { try { ctx?.close(); } catch { /* already gone */ } }
}

/** The strike: a struck-metal chime over a short body thump. */
function playStrikeSound() {
    let ctx;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") { ctx.close(); return; }
        const t = ctx.currentTime;

        const thump = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thump.connect(thumpGain); thumpGain.connect(ctx.destination);
        thump.type = "sine";
        thump.frequency.setValueAtTime(160, t);
        thump.frequency.exponentialRampToValueAtTime(48, t + 0.16);
        thumpGain.gain.setValueAtTime(0.12, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        thump.start(t); thump.stop(t + 0.23);

        // A bell is its partials; a single sine reads as a beep.
        [[784, 0.06], [1174.7, 0.04], [1568, 0.028]].forEach(([freq, peak]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + 0.02);
            gain.gain.setValueAtTime(peak, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
            osc.start(t + 0.02); osc.stop(t + 1.2);
        });
        setTimeout(() => ctx.close().catch(() => { }), 1500);
    } catch { try { ctx?.close(); } catch { /* already gone */ } }
}

// ─── Styles ──────────────────────────────────────────────────
const S = {
    // TOP-anchored, not centred, and OrderedScreen matches it exactly.
    //
    // Both screens used to centre their plaque vertically. But the confirmation's
    // plaque is taller — it carries the price, pickup time, payment pill, badges
    // and buttons — so centring put its pedestal 80px higher than this one's, and
    // the seal visibly JUMPED at the handoff. Anchoring both to the same top
    // offset makes the seal's position independent of how much content follows
    // it, which is the only way the two screens can share a composition.
    overlay: {
        position: "fixed", inset: 0, zIndex: 400,
        background: PLAQUE.backdrop,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        paddingTop: PLAQUE_TOP,
        animation: "plaqueScreenIn 0.3s ease",
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl",
        overflow: "hidden",
    },
    // Held down until the strike so the flare has something to bloom against.
    backdrop: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: PLAQUE.glow,
        transition: "opacity 0.6s ease",
    },
    // Outside the plaque, below it. Only ever appears when the server is slow,
    // and never disturbs the composition the confirmation is about to inherit.
    waiting: {
        marginTop: "18px", textAlign: "center",
        fontSize: "13px", lineHeight: 1.4, color: "rgba(232,245,233,0.75)",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        animation: "plaqueFadeUp 0.4s ease both",
    },
    // A moving element while waiting: a frozen screen and a slow screen have to
    // look different, or people start tapping the button again.
    stillDots: {
        margin: "10px auto 0", width: "34px", height: "3px", borderRadius: "2px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.9), transparent)",
        backgroundSize: "200% 100%",
        animation: "sealSendingSweep 1.1s ease-in-out infinite",
    },
};

'use client';
import { useState, useEffect, useMemo } from "react";
import { usePrefersReducedMotion } from "../../../lib/motionHooks";
// The builder's 🔊 toggle governs this screen too. It did not used to: these are
// the two loudest sounds in the app and they fired even when muted.
import { isSoundOn } from "../../../lib/soundPref";
import { fireGoldConfetti } from "../../../lib/confetti";
import { customerPaymentPresentation } from "../../../lib/customerPayment";
import BariPlaque from "../../ui/bari/BariPlaque";
import BariBadge from "../../ui/bari/BariBadge";
import BariButton from "../../ui/bari/BariButton";
import { PLAQUE } from "../../ui/bari/plaqueGeometry";
import BariGlowBackground from "../../ui/bari/BariGlowBackground";
import GoldField from "../../ui/GoldField";
import OrderSeal from "./OrderSeal.jsx";
// Choreography lives in its own .ts so the assertion harness can import it —
// see sealTiming.ts for the stage clock, for why the tail is no longer on a
// clock at all, and for what the old ingredient pour got wrong about the bowl.
import {
    TIMED_STAGES, GATHER_AT, FACE_AT, REVEAL_DUR, SEAL_FOOTPRINT,
    PLAQUE_TOP, PLAQUE_MARGIN, FIELD_RUSH, SEAL_BACKDROP, stageAt,
} from "./sealTiming";

/**
 * The whole post-order moment: the order is sealed, and the confirmation is
 * revealed in place.
 *
 * ONE COMPONENT ON PURPOSE. This used to be two — an animation overlay that
 * unmounted and a confirmation screen that mounted in its place — and every
 * defect in the handoff came from that. The seal drifted 79px because the two
 * anchored their plaque differently. Two different Hebrew titles dissolved
 * through each other. The plaque snapped 178px taller. Frames were dropped
 * rebuilding a GoldField canvas and ~200 SVG nodes of Lottie on the swap frame.
 * Each was fixed individually, by making two things imitate one thing.
 *
 * There is no swap now. The backdrop, the field, the plaque and the seal are
 * mounted once and never replaced; only the content appears. The bugs above are
 * not fixed so much as unrepresentable.
 *
 * THE SAFETY RULE, which must survive any edit here: nothing about the order is
 * rendered unless `order` is non-null, and `order` is set by exactly one line in
 * SummaryView — after the server has returned an id or an order number. A failed
 * or unrecorded order therefore cannot produce a confirmation, because there is
 * no data to render one from. That guarantee used to live in a boolean and a
 * pair of refs; it now lives in the shape of the props.
 *
 * `order` is null until the server accepts, then carries what the server
 * recorded: { total, items, pickupTime, orderNum, orderId, paymentStatus,
 * badges }. Described in prose rather than as a JSDoc @param because TS reads
 * a single @param on a destructured signature as the type of the WHOLE props
 * object, which then rejects every call site.
 */
export default function OrderSealScreen({ order, onNewOrder }) {
    const [stage, setStage] = useState("gather");
    // Gold dust, a flare, a shockwave and a struck medallion — this is still the
    // most motion-heavy screen in the app. The clock and the reveal are
    // untouched by the preference, so the order flow is identical either way;
    // only the spectacle is dropped.
    const reducedMotion = usePrefersReducedMotion();

    // ── The clock, which only runs as far as the reveal ──
    useEffect(() => {
        // Every timer is collected and cleared together. Two of them used to be
        // fire-and-forget, so a FAILED order — which unmounts this screen —
        // still played the success sound and buzzed the celebration a second
        // later, on top of the failure message.
        const timers = [];
        const at = (seconds, fn) => timers.push(setTimeout(fn, seconds * 1000));

        for (const s of TIMED_STAGES) at(s.end, () => setStage(stageAt(s.end + 0.001)));

        if (navigator.vibrate) {
            navigator.vibrate(12);                                   // the charge
            at(GATHER_AT, () => navigator.vibrate([30, 40, 90]));    // the strike
        }
        // Checked once, at the start: the toggle lives in the builder header and
        // cannot be reached from here, so re-reading it mid-sequence would only
        // ever return the same answer.
        if (isSoundOn()) {
            at(GATHER_AT - 0.55, () => playGatherSound());
            at(GATHER_AT, () => playStrikeSound());
        }

        return () => timers.forEach(clearTimeout);
    }, []);

    // ── The reveal, which is the order's business ──
    // `waiting` is whatever is left after the clock runs out and the order has
    // not arrived. If it arrived first, this flips on the same tick the clock
    // reaches the floor and nobody ever sees `waiting`.
    const revealed = stage === "waiting" && !!order;
    const waiting = stage === "waiting" && !order;

    useEffect(() => {
        if (!revealed) return;
        // Confetti once, and late enough that the frame forming around the seal
        // owns the moment first. canvas-confetti spins up its own canvas and rAF
        // loop; firing it into the same frame as the reveal was measurably over
        // budget back when this was two components, and there is no reason to
        // put it back on the critical frame now.
        const t = setTimeout(() => fireGoldConfetti(), REVEAL_DUR * 1000);
        return () => clearTimeout(t);
    }, [revealed]);

    const struck = stage !== "gather";

    // The seal is sized in `em` off this font-size, so it fills the pedestal
    // square at every width without a media query. width/height 100% is
    // load-bearing, not tidiness: BariPlaque's pedestal wrapper is an
    // aspect-ratio box, so a bare inline-styled div inside it has no height and
    // the seal collapses to nothing.
    const sealFont = useMemo(() => ({
        width: "100%", height: "100%",
        fontSize: `calc(min(100vw, ${PLAQUE.maxWidth}px) * ${SEAL_FOOTPRINT} / 12)`,
    }), []);

    const pay = order ? customerPaymentPresentation(order.paymentStatus) : null;
    // Only badges whose artwork exists; the rest would render a broken image.
    const earned = order ? (order.badges || []).filter(b => b?.emblem).slice(0, 6) : [];

    return (
        <div style={S.root}>
            <BariGlowBackground />
            {/* The ambient field arrives already streaking upward and decays to
                rest at almost exactly the strike, so the whole screen is in
                motion during the charge and still by the time the medallion
                lands. Mounted once, for the life of the screen — rebuilding this
                canvas mid-sequence is what used to drop frames. */}
            <GoldField zIndex={0} entrySweep={reducedMotion ? 0 : FIELD_RUSH} />

            {/* Vignette closing in through the gather, funnelling the eye to the
                point the strike is about to happen at. Opens again after. */}
            <div style={{ ...S.vignette, opacity: struck ? 0 : 1 }} />
            <div style={{ ...S.glow, opacity: struck ? 1 : 0.35 }} />

            <BariPlaque
                style={{ margin: PLAQUE_MARGIN }}
                // `revealed` is a distinct stage for the seal too: it is when the
                // sheen sweeps. Passing `stage` alone would leave it on
                // `waiting` forever once the order landed.
                pedestal={<div style={sealFont}><OrderSeal stage={revealed ? "revealed" : stage} reducedMotion={reducedMotion} /></div>}
                // Smaller than the default 0.66. That default suits the cat
                // Lottie, which carries a wide transparent margin; a full-bleed
                // disc at the same footprint pokes out through the arch.
                pedestalWidth={SEAL_FOOTPRINT}
                pedestalStyle={S.sealShadow}
                // The frame is what turns the seal into the confirmation.
                frameStyle={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "scale(1)" : "scale(0.965)",
                    transition: reducedMotion
                        ? `opacity ${REVEAL_DUR}s ease`
                        : `opacity ${REVEAL_DUR}s ease, transform ${REVEAL_DUR}s cubic-bezier(0.2,0.9,0.3,1)`,
                }}
                title={order && revealed ? (
                    <>
                        <div style={{ ...S.title, animation: `${RISE} 0.05s both` }}>ההזמנה התקבלה!</div>
                        <div style={{ ...S.subtitle, animation: `${RISE} 0.13s both` }}>ההזמנה נשלחה למטבח 🐱</div>
                        {order.orderNum && (
                            <div style={{ marginTop: "8px", animation: `${RISE} 0.23s both` }}>
                                <BariBadge>הזמנה {order.orderNum}</BariBadge>
                            </div>
                        )}
                    </>
                ) : null}
            >
                {/* Grows from nothing rather than appearing at full height —
                    otherwise the frame's bottom ornament jumps the moment the
                    content mounts. See plaqueBodyGrow. */}
                {order && revealed && (
                    <div style={S.grower}>
                        <div style={S.growerInner}>
                            <div style={{ ...S.price, animation: `${RISE} 0.31s both, plaqueGoldShimmer 3s ease 1.2s infinite` }}>₪{order.total}</div>
                            <div style={{ ...S.meta, animation: `${RISE} 0.39s both` }}>
                                {order.items} בחירות{order.pickupTime ? ` · איסוף: ${order.pickupTime}` : ' · מוכן בכ-8 דקות'}
                            </div>

                            {/* Whether money is still owed is the one thing this
                                screen was silent about — someone paying at
                                pickup got no reminder to bring any. */}
                            {pay && (
                                <div style={{
                                    ...S.payPill,
                                    ...(pay.tone === 'done' ? S.payDone : pay.tone === 'verify' ? S.payVerify : S.payOwed),
                                    animation: `${RISE} 0.47s both`,
                                }}>
                                    <span aria-hidden>{pay.icon}</span>
                                    <span>{pay.text}</span>
                                </div>
                            )}

                            {/* The badges earned on this bowl — the payoff for
                                the collection, shown where it lands rather than
                                left behind on the summary screen. */}
                            {earned.length > 0 && (
                                <div style={S.badgeRow}>
                                    {earned.map((b, i) => (
                                        <img
                                            key={b.id}
                                            src={b.emblem}
                                            alt={b.he}
                                            style={{ ...S.badgeArt, animation: `plaqueBadgePop 0.5s cubic-bezier(0.34,1.5,0.64,1) ${0.6 + i * 0.09}s both` }}
                                        />
                                    ))}
                                </div>
                            )}

                            {order.orderId && (
                                <a href={`/order/${order.orderId}`} style={{ ...S.trackBtn, animation: `${RISE} 0.62s both` }}>
                                    🔍 עקוב אחר ההזמנה
                                </a>
                            )}
                            <BariButton variant="ghost" fullWidth onClick={onNewOrder} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", animation: `${RISE} 0.72s both` }}>
                                הזמנה חדשה ←
                            </BariButton>
                        </div>
                    </div>
                )}
            </BariPlaque>

            {/* Only ever seen when the server is slower than the moment. Outside
                the frame, so it cannot disturb the composition the content is
                about to arrive into. */}
            {waiting && (
                <div style={S.waiting} aria-live="polite">
                    <span>עוד רגע — שולחים למטבח…</span>
                    <div style={S.waitDots} />
                </div>
            )}
        </div>
    );
}

/** One entrance, one stagger unit, so the arrival reads as a single wave. */
const RISE = "plaqueFadeUp 0.45s cubic-bezier(0.2,0.9,0.3,1)";

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
    // Top-anchored rather than centred, and it scrolls: the plaque grows with
    // its content, and on a short screen it will be taller than the viewport.
    // (Centring is also what used to move the seal when the content arrived —
    // now moot, since one plaque simply grows, but the anchor still keeps the
    // seal still while it does.)
    root: {
        position: "fixed", inset: 0, zIndex: 400,
        background: SEAL_BACKDROP,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        paddingTop: PLAQUE_TOP,
        overflowY: "auto", overflowX: "hidden",
        animation: "plaqueScreenIn 0.3s ease",
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl",
    },
    // Held down until the strike so the flare has something to bloom against.
    glow: {
        position: "fixed", inset: 0, pointerEvents: "none",
        background: PLAQUE.glow,
        transition: "opacity 0.6s ease",
    },
    vignette: {
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 55% 40% at 50% 38%, transparent 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.82) 100%)",
        transition: "opacity 0.7s ease",
    },

    sealShadow: { filter: "drop-shadow(0 8px 32px rgba(200,168,78,0.25))" },

    // 0fr -> 1fr, the only way to animate to a height nobody knows in advance.
    grower: { display: "grid", gridTemplateRows: "1fr", animation: `plaqueBodyGrow ${REVEAL_DUR}s cubic-bezier(0.2,0.9,0.3,1) both` },
    // overflow/min-height are not optional: without them the content ignores the
    // collapsed row and the growth animates nothing.
    growerInner: { overflow: "hidden", minHeight: 0 },

    // The type scales with the viewport because the title zone does: at a fixed
    // 26px the title, subtitle and order number came to 89px against the 82px
    // that zone gets on a 320px-wide phone, and the overflow ran over the
    // engraved divider.
    title: { fontSize: "clamp(20px, 6.4vw, 26px)", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.5)", lineHeight: 1.1 },
    subtitle: { fontSize: "clamp(11px, 3.4vw, 13px)", fontWeight: 600, color: "#c9d7c5", marginTop: "4px" },

    price: {
        fontSize: "44px", fontWeight: 900,
        backgroundImage: "linear-gradient(135deg, #c8a832, #f0d060, #ffe066, #c8a832)",
        backgroundSize: "200% 200%",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        textShadow: "none", lineHeight: 1.1,
    },
    meta: { fontSize: "12px", color: "#c9d7c5", marginTop: "6px", fontWeight: 600 },
    payPill: {
        display: "inline-flex", alignItems: "center", gap: "7px",
        marginTop: "14px", padding: "8px 16px", borderRadius: "var(--radius-full)",
        fontSize: "13px", fontWeight: 800,
    },
    payOwed: { background: "rgba(255,183,77,0.16)", border: "1px solid rgba(255,183,77,0.45)", color: "#ffcc80" },
    payDone: { background: "rgba(102,187,106,0.16)", border: "1px solid rgba(102,187,106,0.45)", color: "#a5d6a7" },
    payVerify: { background: "rgba(232,170,70,0.16)", border: "1px solid rgba(232,170,70,0.45)", color: "#f2c46a" },
    badgeRow: {
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px",
        marginTop: "16px", marginBottom: "4px",
    },
    // No pill behind them: the emblems carry their own gold frame, and a border
    // around a border is what made the summary panel feel cramped.
    badgeArt: { width: "50px", height: "50px", objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5))" },
    trackBtn: {
        display: "block", width: "100%", padding: "12px 22px", borderRadius: "14px",
        marginTop: "16px", marginBottom: "10px",
        background: "rgba(200,168,78,0.10)", border: "1px solid rgba(200,168,78,0.30)",
        color: "rgba(240,208,96,0.85)", fontSize: "13px", fontWeight: 700,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textDecoration: "none", textAlign: "center",
    },

    waiting: {
        marginTop: "18px", textAlign: "center",
        fontSize: "13px", lineHeight: 1.4, color: "rgba(232,245,233,0.75)",
        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        animation: "plaqueFadeUp 0.4s ease both",
    },
    // A moving element while waiting: a frozen screen and a slow screen have to
    // look different, or people start tapping the button again.
    waitDots: {
        margin: "10px auto 0", width: "34px", height: "3px", borderRadius: "2px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.9), transparent)",
        backgroundSize: "200% 100%",
        animation: "sealSendingSweep 1.1s ease-in-out infinite",
    },
};

'use client';
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { fireGoldConfetti } from "../../lib/confetti";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

function Icon({ src, size = "1.2em", style = {} }) {
    if (src && src.startsWith("/")) {
        return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", verticalAlign: "middle", ...style }} />;
    }
    return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{src}</span>;
}

/*
  Scatters ingredients inside the bowl art so it reads as a filled bowl rather
  than three tidy rows.

  Position comes from a hash of the ingredient ID, never its index in the list,
  so adding or removing one ingredient never reshuffles the others — a scatter
  that reshuffles on every render is far worse than a neat grid.

  The bowl's front rim is an arc, deepest in the middle and rising toward the
  sides. `yMax` models that arc from measurements taken off the artwork (gold
  density per column: ~66% down at centre, ~30% at the edges) and stays
  deliberately inside it, so an icon can never sit on the gold band.
*/
/*
  The bowl is read, not admired: its job is to let someone confirm at a glance
  that their order is right. A realistic scattered pile looked better in
  isolation but made that harder, so ingredients sit in tidy rows — one row per
  layer of the build, in the order the salad is assembled.

    row 0  ירקות     the base, widest, largest icons
    row 1  חלבון     protein and grains
    row 2  תוספות    sauces, crunch, finishing touches

  No overlap, no rotation, nothing hidden behind anything else.

  The rows also fit the bowl's geometry: the interior runs nearly full width
  near the top rim and narrows toward the front, so the widest row belongs at
  the back and the narrowest at the front.

  `y` and `width` are fractions of the art box, and were chosen so that each
  row's lowest pixel clears the front-rim arc across its whole width — see
  ARC_* below, measured off the artwork.
*/
const BOWL_AR = 1325 / 689;   // width / height
const ARC_BASE = 0.24;        // front rim at the far left/right
const ARC_DEPTH = 0.40;       // extra depth at the centre

const BOWL_ROWS = [
    { y: 0.17, width: 0.84, maxSize: 10.5 },
    { y: 0.35, width: 0.56, maxSize: 9.5 },
    { y: 0.49, width: 0.32, maxSize: 8.5 },
];
const BOWL_GAP = 1.5;         // % of bowl width, between icons in a row

const BOWL_TIERS = {
    veggies: 0, t_fillings: 0,
    protein: 1, t_protein: 1,
    sauces: 2, finish: 2, upgrade: 2, t_sauces: 2, t_upgrade: 2, wrap: 2,
};

/** Falls back to tags for items rebuilt from a past order without step meta. */
function tierOf(item) {
    const s = item._meta?.stepId;
    if (s && s in BOWL_TIERS) return BOWL_TIERS[s];
    const t = item.tags || [];
    if (t.includes("protein") || t.includes("grain")) return 1;
    if (t.some(x => ["base", "green", "fresh", "red", "orange", "purple", "yellow", "white", "brown"].includes(x))) return 0;
    return 2;
}

/**
 * Icon size for a row, as a % of the bowl's width. Shrinks to fit rather than
 * overflowing or overlapping, so a crowded row of vegetables stays readable.
 */
function bowlIconSize(row, count) {
    if (!count) return 0;
    const avail = row.width * 100 - (count - 1) * BOWL_GAP;
    return Math.max(3, Math.min(row.maxSize, avail / count));
}

// ─── Pickup slot generator ─────────────────────────────────────
function generatePickupSlots() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun 5=Fri 6=Sat
    const h = now.getHours();
    const m = now.getMinutes();

    if (day === 6) return null; // Saturday — closed
    if (day === 5 && h >= 16) return null; // Friday eve (Shabbat) — closed

    const isPeak = (h === 11 && m >= 45) || h === 12 || h === 13 || (h === 14 && m <= 30);
    const lead = isPeak ? 25 : 15;

    const firstMin = Math.ceil((h * 60 + m + lead) / 5) * 5;
    const slots = [];
    for (let i = 0; i < 12; i++) {
        const totalMins = firstMin + i * 5;
        const sh = Math.floor(totalMins / 60);
        const sm = totalMins % 60;
        if (sh >= 21) break;
        if (day === 5 && sh >= 16) break;
        const label = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
        const isPeak = (sh === 11 && sm >= 45) || sh === 12 || sh === 13 || (sh === 14 && sm <= 30);
        slots.push({ id: label, label, isPeak });
    }
    return slots.length ? slots : null;
}
import { STEPS, NUTRI, BASE } from "../../data/salad-data.js"; // NUTRI used in bowl calorie total
import { effectiveItemPrice } from "../../lib/menuConfig";
import { findDiscount, discountAmount } from "../../lib/discounts";
const headerImage = "/builder-assets/header-brand.png";
import MixingAnimation from "./ui/MixingAnimation.jsx";
import BariPanel from "../ui/bari/BariPanel";
import BariButton from "../ui/bari/BariButton";
import BariBadge from "../ui/bari/BariBadge";
import BariModal from "../ui/bari/BariModal";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getAccessToken } from "../../lib/auth";

const DEMO_MODE = !isSupabaseConfigured();

export default function SummaryView({ sels, total, all, comboBadges, notes, setNotes, onBack, onEdit, onNewOrder, base = BASE, sizeLabel = null }) {
    const [showMixing, setShowMixing] = useState(false);
    const [ordered, setOrdered] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesOpen, setNotesOpen] = useState(false);
    const [notesFocused, setNotesFocused] = useState(false);
    const [highlightedStep, setHighlightedStep] = useState(null);
    const [pickupTime, setPickupTime] = useState(() => generatePickupSlots()?.[0]?.id ?? null);
    const [paymentChoice, setPaymentChoice] = useState("pickup"); // 'now' | 'pickup' — demo mode only
    const [realOrderNum, setRealOrderNum] = useState(null);
    const [realOrderId, setRealOrderId] = useState(null);
    const [paymentFailed, setPaymentFailed] = useState(false);
    const [failedOrderNum, setFailedOrderNum] = useState(null);
    const [promoInput, setPromoInput] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    // The confirmation screen may only appear once BOTH the mixing animation has
    // finished AND the server has actually accepted the order. Previously the
    // animation's completion alone flipped to "ordered", so a failed request
    // still showed a confirmation (with a fabricated order number) and the
    // customer would arrive to collect food nobody had been told to make.
    const outcomeRef = useRef(null); // null = pending | 'ok' | 'fail'
    const mixDoneRef = useRef(false);
    const [autoDiscount, setAutoDiscount] = useState(null); // standing "tag" discount for signed-in customers

    // Signed-in customers may have a standing discount assigned to their account
    // ("tag", e.g. an approved municipal worker's 10%). Fetch it so the shown
    // total matches what the server will charge; the server re-applies it anyway.
    useEffect(() => {
        let cancelled = false;
        getAccessToken().then(token => {
            if (!token) return;
            fetch('/api/my/discount', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (!cancelled && d?.discount) setAutoDiscount(d.discount); })
                .catch(() => {});
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const highlightStep = (item) => {
        const step = STEPS.find(s => (sels[s.id] || []).some(i => i.id === item.id));
        if (!step) return;
        setHighlightedStep(step.id);
        setTimeout(() => setHighlightedStep(null), 900);
    };
    const MAX_NOTES_LENGTH = 200;
    const extras = all.filter(i => effectiveItemPrice(i.id, i.price) > 0);
    // Apply whichever discount is larger — the customer's standing tag or a
    // typed promo code — never both stacked (mirrors the server's rule).
    const autoAmount = discountAmount(total, autoDiscount);
    const typedAmount = discountAmount(total, appliedDiscount);
    const effectiveDiscount = typedAmount > autoAmount ? appliedDiscount : autoDiscount;
    const discAmount = Math.max(autoAmount, typedAmount);
    const finalTotal = total - discAmount;
    const applyPromo = () => {
        const d = findDiscount(promoInput);
        setAppliedDiscount(d);
        setPromoError(d ? "" : "קוד לא תקף");
    };
    const grouped = STEPS.map(s => ({ s, items: sels[s.id] || [] })).filter(g => g.items.length > 0);

    // Ingredients bucketed into the bowl's three rows, keeping the order they
    // were chosen in within each row.
    const bowlRows = useMemo(() => {
        const rows = [[], [], []];
        all.forEach(it => rows[tierOf(it)].push(it));
        return rows;
    }, [all]);

    const handleNotesChange = (e) => {
        const value = e.target.value;
        if (value.length <= MAX_NOTES_LENGTH) {
            setNotes(value);
            setNotesError("");
        } else {
            setNotesError(`מקסימום ${MAX_NOTES_LENGTH} תווים`);
        }
    };


    // Shows the confirmation only when the animation has finished *and* the
    // server accepted the order.
    const settle = useCallback(() => {
        if (!mixDoneRef.current || outcomeRef.current === null) return;
        setShowMixing(false);
        setSubmitting(false);
        if (outcomeRef.current === 'ok') setOrdered(true);
    }, []);

    const failSubmit = useCallback((message) => {
        outcomeRef.current = 'fail';
        setShowMixing(false);          // stop the animation rather than let it "complete"
        setSubmitting(false);
        setSubmitError(message);
        navigator.vibrate?.([30, 40, 30]);
    }, []);

    const submitOrder = async (choiceOverride) => {
        if (submitting) return;        // a double-tap must not create two orders
        const choice = choiceOverride ?? paymentChoice;
        const isFailureTest = choice === "fail";
        setSubmitting(true);
        setSubmitError("");
        outcomeRef.current = null;
        // The failure-test path shows no animation, so there is nothing to wait
        // for — treat the "animation done" gate as already satisfied.
        mixDoneRef.current = isFailureTest;
        if (navigator.vibrate) navigator.vibrate(isFailureTest ? [30, 40, 30] : [15, 40, 30]);
        if (!isFailureTest) setShowMixing(true);

        try {
            // Signed-in customers get the order linked to their account (order
            // history on /profile); guests order exactly the same without it.
            const token = await getAccessToken().catch(() => null);
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    items: all.map(i => ({ id: i.id, he: i.he, icon: i.icon, price: effectiveItemPrice(i.id, i.price || 0) })),
                    total: finalTotal,
                    pickupTime,
                    notes,
                    size: base,
                    discountCode: effectiveDiscount?.code,
                    ...(DEMO_MODE ? { paymentChoice: choice } : {}),
                }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                failSubmit(
                    res.status === 429
                        ? "נשלחו יותר מדי הזמנות. נסו שוב בעוד רגע."
                        : "לא הצלחנו לשלוח את ההזמנה. נסו שוב."
                );
                return;
            }
            if (data?.paymentFailed) {
                setShowMixing(false);
                setSubmitting(false);
                setFailedOrderNum(data.orderNum ?? null);
                setPaymentFailed(true);
                return;
            }
            // No id/order number means nothing was actually recorded — never
            // present that as a confirmed order.
            if (!data?.id && !data?.orderNum) {
                failSubmit("לא הצלחנו לשלוח את ההזמנה. נסו שוב.");
                return;
            }

            if (data.orderNum) setRealOrderNum(data.orderNum);
            if (data.id) setRealOrderId(data.id);

            // Online payment only when a gateway is configured. Otherwise the
            // order is already pay-at-pickup (server set payAtPickup) — skip
            // the redirect and let the confirmation screen show.
            if (data.id && !data.demo && !data.payAtPickup) {
                const payRes = await fetch('/api/payment/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: data.id }),
                }).then(r => r.ok ? r.json() : null).catch(() => null);
                if (payRes?.paymentUrl) {
                    window.location.href = payRes.paymentUrl;
                    return; // leaving the page — don't settle
                }
                // The order exists but we can't reach the gateway; it is on the
                // board as pending, so send them to its status page rather than
                // claim success here.
                failSubmit("ההזמנה נקלטה אך התשלום לא נפתח. פנו לקופה עם מספר ההזמנה " + (data.orderNum ?? ""));
                return;
            }

            outcomeRef.current = 'ok';
            settle();
        } catch {
            failSubmit("אין חיבור לרשת. בדקו את החיבור ונסו שוב.");
        }
    };

    if (paymentFailed) return <PaymentFailedScreen orderNum={failedOrderNum} onRetry={() => setPaymentFailed(false)} />;
    if (ordered) return <OrderedScreen total={finalTotal} all={all} pickupTime={pickupTime} notes={notes} orderNum={realOrderNum} orderId={realOrderId} onNewOrder={onNewOrder || onBack} />;

    return (
        <div style={S.root}>
            <div style={S.bg} /><div style={S.bgRay} />

            {showMixing && (
                <MixingAnimation
                    all={all}
                    total={finalTotal}
                    onComplete={() => { mixDoneRef.current = true; settle(); }}
                />
            )}

            <div style={S.main}>
                <div style={S.header}>
                    <img src={headerImage} alt="" aria-hidden="true" style={{ width: "100%", display: "block", height: "72px", objectFit: "cover", objectPosition: "center top", flexShrink: 0 }} />
                    <div style={S.headerTop}>
                        <button style={S.backBtn} onClick={onBack}>←</button>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "17px" }}>📋</span>
                            <span style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif", fontSize: "17px", color: "#e8f5e9" }}>הסלט שלכם</span>
                        </div>
                        <div style={S.pricePill}>
                            <span style={S.priceS}>₪</span>
                            <span style={S.priceV}>{finalTotal}</span>
                        </div>
                    </div>
                </div>

                <div style={S.content}>
                    {/* Layered bowl — hero */}
                    <div style={S.sumBowlWrap}>
                        <div style={S.sumBowlGlow} />
                        <div style={S.sumBowl}>
                            {bowlRows.map((items, t) => {
                                if (!items.length) return null;
                                const row = BOWL_ROWS[t];
                                // bowlIconSize works in % of the BOWL; the icons and gap live
                                // inside the row, whose own width is a fraction of the bowl, so
                                // both convert into % of the row before being used.
                                const size = bowlIconSize(row, items.length) / row.width;
                                const gap = BOWL_GAP / row.width;
                                return (
                                    <div
                                        key={t}
                                        style={{
                                            position: "absolute", left: "50%",
                                            top: `${(row.y * 100).toFixed(1)}%`,
                                            transform: "translate(-50%, -50%)",
                                            width: `${(row.width * 100).toFixed(0)}%`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            gap: `${gap.toFixed(2)}%`,
                                            // Later rows draw in front, so a finishing topping
                                            // is never hidden behind a vegetable.
                                            zIndex: t + 1,
                                        }}
                                    >
                                        {items.map((it, i) => (
                                            <span
                                                key={it.id}
                                                onClick={() => highlightStep(it)}
                                                style={{
                                                    width: `${size.toFixed(2)}%`,
                                                    aspectRatio: "1",
                                                    flexShrink: 0,
                                                    cursor: "pointer",
                                                    animation: `popBounce 0.3s ease ${(t * 120 + i * 35)}ms both`,
                                                    filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.45))",
                                                }}
                                            >
                                                <Icon src={it.icon} size="100%" style={{ display: "block" }} />
                                            </span>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                        <NutriStats all={all} />
                        <div style={S.sumBowlMeta}>
                            <span>{all.length} מרכיבים</span>
                        </div>
                    </div>

                    {comboBadges.length > 0 && (
                        <div style={S.comboBanner}>
                            <div style={S.comboBannerTitle}>🏆 שילובים שנבחרו</div>
                            {/* Emblems, not pills. Each emblem already contains its
                                Hebrew title in the artwork, so `he` goes to alt
                                rather than being drawn a second time. */}
                            <div style={S.comboBannerRow}>
                                {comboBadges.map(b => (
                                    b.emblem
                                        ? <img key={b.id} src={b.emblem} alt={b.he} style={S.comboEmblem} />
                                        : <BariBadge key={b.id} icon={<span style={{ fontSize: "14px" }}>{b.icon}</span>}>{b.he}</BariBadge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── RPG Inventory ── */}
                    {/* No side margin: `content` already supplies the 16px
                        gutter, and the extra 12px here made these panels
                        narrower than the combo banner right above them. */}
                    <div style={{ margin: "0 0 8px" }}>
                        {grouped.map(({ s, items }, gi) => (
                            <BariPanel key={s.id} className="p-2.5" style={{
                                marginBottom: "10px",
                                opacity: highlightedStep && highlightedStep !== s.id ? 0.45 : 1,
                                transition: "opacity 0.3s ease, border-color 0.2s, box-shadow 0.2s",
                            }}>
                                {/* Shelf label */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "13px" }}>{s.emoji}</span>
                                    <span style={{ fontSize: "10px", fontWeight: 800, color: "rgba(200,168,78,0.75)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.title}</span>
                                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(200,168,78,0.2), transparent)" }} />
                                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{items.length}</span>
                                </div>
                                {/* Slot grid — 64px slots sized so 10px Hebrew names fit one line */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "flex-start" }}>
                                    {items.map((item, i) => { const p = effectiveItemPrice(item.id, item.price); return (
                                        <div key={item.id} style={{
                                            width: "64px",
                                            background: "linear-gradient(145deg, rgba(12,36,12,0.85), rgba(6,18,6,0.92))",
                                            border: `1px solid ${p > 0 ? "rgba(200,168,78,0.45)" : "rgba(255,255,255,0.1)"}`,
                                            borderRadius: "9px",
                                            display: "flex", flexDirection: "column",
                                            alignItems: "center", justifyContent: "flex-start",
                                            padding: "7px 4px 6px",
                                            gap: "3px",
                                            position: "relative",
                                            boxShadow: p > 0
                                                ? "0 0 8px rgba(200,168,78,0.15), 0 2px 6px rgba(0,0,0,0.4)"
                                                : "0 2px 6px rgba(0,0,0,0.4)",
                                            animation: `popBounce 0.3s ease ${gi * 60 + i * 40}ms both`,
                                        }}>
                                            {p > 0 && (
                                                <div style={{
                                                    position: "absolute", top: "-5px", right: "-4px",
                                                    background: "linear-gradient(135deg, #c8a832, #f0d060)",
                                                    color: "#0d2e0d", fontSize: "10px", fontWeight: 900,
                                                    padding: "2px 6px", borderRadius: "7px",
                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                                }}>+₪{p}</div>
                                            )}
                                            <Icon src={item.icon} size="30px" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
                                            <span style={{
                                                fontSize: "10px", fontWeight: 700,
                                                color: "rgba(255,255,255,0.6)",
                                                textAlign: "center", lineHeight: 1.15,
                                                maxWidth: "58px", overflow: "hidden",
                                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}>{item.he}</span>
                                        </div>
                                    ); })}
                                    {onEdit && (
                                        <button onClick={() => onEdit(STEPS.findIndex(st => st.id === s.id))}
                                            style={{
                                                width: "64px", height: "72px",
                                                background: "rgba(255,255,255,0.02)",
                                                border: "1px dashed rgba(200,168,78,0.18)",
                                                borderRadius: "9px",
                                                display: "flex", flexDirection: "column",
                                                alignItems: "center", justifyContent: "center",
                                                cursor: "pointer", gap: "3px",
                                            }}>
                                            <span style={{ fontSize: "14px", opacity: 0.5 }}>✏️</span>
                                            <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(200,168,78,0.55)" }}>ערוך</span>
                                        </button>
                                    )}
                                </div>
                            </BariPanel>
                        ))}
                    </div>

                    {/* Notes — opens in a sheet instead of an inline collapse */}
                    <button style={S.notesToggle} onClick={() => setNotesOpen(true)} aria-haspopup="dialog">
                        <span>📝 הערה לבשלן</span>
                        {notes.length > 0 && (
                            <BariBadge className="mr-auto">✓ נוספה</BariBadge>
                        )}
                        {notes.length === 0 && <span style={{ marginRight: "auto", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>▾</span>}
                    </button>
                    <BariModal open={notesOpen} onClose={() => setNotesOpen(false)} variant="sheet" title="📝 הערה לבשלן">
                        <div style={{ padding: "0 16px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                                <span style={{ fontSize: "10px", color: notes.length > MAX_NOTES_LENGTH * 0.8 ? "#e57373" : "rgba(255,255,255,0.35)" }}>
                                    {MAX_NOTES_LENGTH - notes.length} תווים נותרו
                                </span>
                            </div>
                            <textarea
                                value={notes}
                                onChange={handleNotesChange}
                                onFocus={() => setNotesFocused(true)}
                                onBlur={() => setNotesFocused(false)}
                                placeholder="לדוגמה: בלי גרעינים, לחתוך קטן..."
                                rows={4}
                                maxLength={MAX_NOTES_LENGTH}
                                aria-label="הערות מיוחדות להזמנה"
                                style={{
                                    ...S.notesInput,
                                    border: notesFocused ? "1px solid var(--color-gold-deep)" : "1px solid rgba(255,255,255,0.08)",
                                    boxShadow: notesFocused ? "0 0 0 3px rgba(200,168,78,0.15), 0 0 16px rgba(200,168,78,0.25)" : "none",
                                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                                }}
                                autoFocus
                            />
                            {notesError && <div style={{ fontSize: "10px", color: "#ef5350", marginTop: "4px" }}>⚠️ {notesError}</div>}
                            <BariButton variant="primary" fullWidth style={{ marginTop: "14px" }} onClick={() => setNotesOpen(false)}>סיימתי</BariButton>
                        </div>
                    </BariModal>

                    {/* Pickup time picker */}
                    <PickupTimePicker value={pickupTime} onChange={setPickupTime} />

                    {/* Price breakdown */}
                    <BariPanel style={{ marginTop: "14px", padding: "14px 16px" }}>
                        <div style={S.sumPriceLine}>
                            <span>סלט בסיס{sizeLabel ? <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}> · {sizeLabel}</span> : null}</span>
                            <span style={{ fontWeight: 700 }}>₪{base}</span>
                        </div>
                        {extras.map(it => (
                            <div key={it.id} style={S.sumPriceLine}>
                                <span style={{ opacity: 0.7, fontSize: "12px" }}>+ {it.he}</span>
                                <span style={{ color: "#edd87e", fontWeight: 600 }}>₪{effectiveItemPrice(it.id, it.price)}</span>
                            </div>
                        ))}

                        {/* Promo code */}
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" }}>
                            <input
                                value={promoInput}
                                onChange={e => { setPromoInput(e.target.value); setPromoError(""); }}
                                placeholder="קוד הנחה"
                                aria-label="קוד הנחה"
                                style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: "none" }}
                            />
                            <button type="button" onClick={applyPromo} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(200,168,78,0.2)", border: "1px solid rgba(200,168,78,0.4)", color: "#f0d060", fontSize: "13px", fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>החל</button>
                        </div>
                        {promoError && <div style={{ fontSize: "11px", color: "#ff7575", fontWeight: 600, marginTop: "4px" }}>{promoError}</div>}
                        {effectiveDiscount && discAmount > 0 && (
                            <div style={{ ...S.sumPriceLine, marginTop: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#7dd37d", fontWeight: 700 }}>
                                    הנחה · {effectiveDiscount.note || effectiveDiscount.code}
                                    {effectiveDiscount === autoDiscount && <span style={{ fontSize: "10px", color: "rgba(125,211,125,0.7)", fontWeight: 600 }}> · אוטומטי</span>}
                                </span>
                                <span style={{ color: "#7dd37d", fontWeight: 700 }}>−₪{discAmount}</span>
                            </div>
                        )}

                        <div style={S.sumTotal}>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>סה"כ</span>
                            <span style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif" }}>₪{finalTotal}</span>
                        </div>
                    </BariPanel>

                    {/* Payment choice — demo mode only (no real gateway configured yet) */}
                    {DEMO_MODE && (
                        <div style={PAY.box}>
                            <div style={PAY.title}>
                                💳 איך תרצו לשלם?
                                <BariBadge className="mr-2">מצב הדגמה</BariBadge>
                            </div>
                            <div style={PAY.row}>
                                <button onClick={() => setPaymentChoice("now")} style={{ ...PAY.opt, ...(paymentChoice === "now" ? PAY.optActive : {}) }}>
                                    <span style={{ fontSize: "20px" }}>💳</span>
                                    <span>שלם עכשיו</span>
                                </button>
                                <button onClick={() => setPaymentChoice("pickup")} style={{ ...PAY.opt, ...(paymentChoice === "pickup" ? PAY.optActive : {}) }}>
                                    <span style={{ fontSize: "20px" }}>🏪</span>
                                    <span>שלם באיסוף</span>
                                </button>
                            </div>
                            {/* Testing-only affordance, not a real customer choice — simulates
                                a declined card so the failure path can actually be exercised. */}
                            <button onClick={() => submitOrder("fail")} style={PAY.failTest}>
                                🧪 דמה כשל תשלום (לבדיקה)
                            </button>
                        </div>
                    )}

                    <div style={S.trustCopy}>
                        <span style={{ opacity: 0.75 }}>🌿</span>
                        <span>אנחנו משתמשים בחומרי גלם טריים בלבד</span>
                    </div>
                    <div style={{ height: "110px" }} />
                </div>

                <div style={S.bar}>
                    {/* Order meta pills */}
                    <div style={S.barMeta}>
                        <div style={S.metaPill}>
                            <span style={S.metaPillIcon}>🥗</span>
                            <span style={S.metaPillText}>{all.length} מרכיבים</span>
                        </div>
                        <div style={{ ...S.metaPill, ...S.metaPillGold }}>
                            <span style={S.metaPillIcon}>⏰</span>
                            <span style={{ ...S.metaPillText, color: "#f0d060", fontWeight: 800 }}>
                                {pickupTime ?? 'בחר זמן'}
                            </span>
                        </div>
                    </div>
                    {/* Submission failure — shown instead of a false confirmation */}
                    {submitError && (
                        <div role="alert" style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "10px 12px", borderRadius: "12px",
                            background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.4)",
                            fontSize: "12.5px", fontWeight: 700, color: "#ff9a97", lineHeight: 1.5,
                        }}>
                            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
                            <span>{submitError}</span>
                        </div>
                    )}
                    {/* CTA */}
                    <BariButton
                        variant="primary"
                        fullWidth
                        disabled={submitting}
                        style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", opacity: submitting ? 0.6 : 1 }}
                        onClick={() => submitOrder()}
                    >
                        <span>{submitting ? "שולח…" : submitError ? "נסו שוב" : "שלח הזמנה"}</span>
                        <span style={S.orderBtnPrice}>₪{finalTotal}</span>
                    </BariButton>
                    {/* Consent disclosure — links open the legal docs before ordering */}
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.6, marginTop: "8px", fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                        בלחיצה על ״שלח הזמנה״ אני מאשר/ת את{" "}
                        <a href="/terms" style={{ color: "rgba(240,208,96,0.8)" }}>תנאי השימוש</a>,{" "}
                        <a href="/privacy" style={{ color: "rgba(240,208,96,0.8)" }}>מדיניות הפרטיות</a>{" "}
                        ו<a href="/cancellations" style={{ color: "rgba(240,208,96,0.8)" }}>מדיניות הביטולים</a>.
                    </div>
                </div>
            </div>
            <style>{KF}</style>
        </div>
    );
}

// ─── Nutritional stats ─────────────────────────────────────
function NutriStats({ all }) {
    const totals = all.reduce((acc, item) => {
        const n = NUTRI[item.id];
        if (!n) return acc;
        acc.kcal += n.kcal || 0;
        acc.p    += n.p    || 0;
        acc.f    += n.f    || 0;
        acc.c    += n.c    || 0;
        acc.fb   += n.fb   || 0;
        return acc;
    }, { kcal: 0, p: 0, f: 0, c: 0, fb: 0 });

    if (totals.kcal < 1) return null;

    const stats = [
        { key:"p",  label:"חלבון",  val: Math.round(totals.p),  color:"#c8a832", bg:"rgba(200,168,50,0.14)",  border:"rgba(200,168,50,0.35)",  badge: totals.p  >= 20 ? "💪" : null },
        { key:"c",  label:"פחמ׳",   val: Math.round(totals.c),  color:"#3ab8b8", bg:"rgba(58,184,184,0.12)",  border:"rgba(58,184,184,0.28)",  badge: null },
        { key:"f",  label:"שומן",   val: Math.round(totals.f),  color:"#6abf69", bg:"rgba(106,191,105,0.12)", border:"rgba(106,191,105,0.28)", badge: null },
        { key:"fb", label:"סיבים",  val: Math.round(totals.fb), color:"#a080e0", bg:"rgba(160,128,224,0.1)",  border:"rgba(160,128,224,0.22)", badge: totals.fb >= 8  ? "⭐" : null },
    ];

    let msg = null;
    if      (totals.p >= 25)                   msg = { text: "עשיר בחלבון! 💪",             color: "#c8a832" };
    else if (totals.fb >= 10)                  msg = { text: "עשיר בסיבים תזונתיים! 🌿",    color: "#a080e0" };
    else if (totals.p >= 15 && totals.fb >= 6) msg = { text: "ארוחה מאוזנת ✨",             color: "#6abf69" };

    return (
        <div style={S.nutBox}>
            {/* Kcal total */}
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
                    ~{Math.round(totals.kcal)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.38)", marginRight: "4px" }}> קק״ל</span>
            </div>
            {/* Macro pills */}
            <div style={{ display: "flex", gap: "5px" }}>
                {stats.map(s => (
                    <div key={s.key} style={{
                        // No border: these now sit inside the NutBox's gold
                        // frame, and an outlined card inside an outlined frame
                        // is the same border-inside-border density that made
                        // the combo panel feel cramped. The tinted fill alone
                        // still separates the four macros.
                        flex: 1, background: s.bg,
                        borderRadius: "10px", padding: "9px 2px 7px",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: "2px", position: "relative",
                    }}>
                        {s.badge && (
                            <div style={{ position: "absolute", top: "-7px", left: "50%", transform: "translateX(-50%)", fontSize: "12px", lineHeight: 1 }}>
                                {s.badge}
                            </div>
                        )}
                        <span style={{ fontSize: "20px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</span>
                        <span style={{ fontSize: "9px", fontWeight: 800, color: s.color, opacity: 0.7, letterSpacing: "0.05em" }}>g</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.45)", lineHeight: 1.1 }}>{s.label}</span>
                    </div>
                ))}
            </div>
            {msg && (
                <div style={{ textAlign: "center", marginTop: "7px", fontSize: "10px", fontWeight: 800, color: msg.color, opacity: 0.9, letterSpacing: "0.02em" }}>
                    {msg.text}
                </div>
            )}
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.28)", letterSpacing: "0.03em" }}>
                * הערכה בלבד · לא מהווה ייעוץ תזונתי
            </div>
        </div>
    );
}

const SHOP_WA = process.env.NEXT_PUBLIC_SHOP_WA_NUMBER || '972501234567';

// ─── Post-order confirmation screen ─────────────────────────
function OrderedScreen({ total, all, pickupTime, notes, orderNum, orderId, onNewOrder }) {
    useEffect(() => {
        // Delayed so the burst punctuates this screen's arrival — firing on
        // mount collided with MixingAnimation's bloom peak that just ended,
        // blurring two celebration moments into one.
        const t = setTimeout(() => fireGoldConfetti(), 450);
        return () => clearTimeout(t);
    }, []);
    // No invented order number: this screen used to fall back to a client-side
    // `BB-xxxx`, which meant a failed order could still show the customer a
    // plausible confirmation. The number is only ever the server's.
    const [animData, setAnimData] = useState(null);
    useEffect(() => { fetch("/cat-salad-final.json").then(r => r.json()).then(setAnimData).catch(() => {}); }, []);

    const waLink = useMemo(() => {
        const items = all.map(i => i.he).join(', ');
        const timeLine = pickupTime ? `⏰ איסוף: ${pickupTime}\n` : '';
        const noteLine = notes ? `📝 ${notes}\n` : '';
        const head = orderNum ? `🥗 *הזמנה ${orderNum}*` : '🥗 *הזמנה*';
        const msg = `${head}\n${timeLine}💰 סה"כ: ₪${total}\n\n*מרכיבים:*\n${items}\n${noteLine}`;
        return `https://wa.me/${SHOP_WA}?text=${encodeURIComponent(msg)}`;
    }, [orderNum, all, total, pickupTime, notes]);

    return (
        <>
            <div style={OS.root}>
                <div style={OS.bg} />
                <div style={OS.content}>
                    <div style={OS.lottieWrap}>
                        {animData && <Lottie animationData={animData} loop autoplay style={{ width: "100%", height: "100%" }} />}
                    </div>
                    <div style={OS.title}>בהכנה!</div>
                    <div style={OS.subtitle}>מכינים את הסלט שלכם עכשיו 🐱</div>
                    {orderNum && (
                        <div style={{ marginTop: "14px", animation: "fadeUp 0.5s ease 0.35s both" }}>
                            <BariBadge>הזמנה {orderNum}</BariBadge>
                        </div>
                    )}
                    <div style={OS.price}>₪{total}</div>
                    <div style={OS.meta}>{all.length} מרכיבים{pickupTime ? ` · איסוף: ${pickupTime}` : ' · מוכן בכ-8 דקות'}</div>
                    <div style={OS.divider} />
                    <a href={waLink} target="_blank" rel="noopener noreferrer" style={OS.waBtn}>
                        <span style={{ fontSize: "18px" }}>💬</span>
                        <span>שלח לקופה ב-WhatsApp</span>
                    </a>
                    {orderId && (
                        <a href={`/order/${orderId}`} style={OS.trackBtn}>
                            🔍 עקוב אחר ההזמנה
                        </a>
                    )}
                    <BariButton variant="ghost" fullWidth onClick={onNewOrder} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", animation: "fadeUp 0.5s ease 0.75s both" }}>
                        הזמנה חדשה ←
                    </BariButton>
                </div>
                <style>{`
                    @keyframes ringPop { 0%{transform:scale(0.4);opacity:0} 55%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
                    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                    @keyframes goldShimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
                    @keyframes ringGlow { 0%,100%{box-shadow:0 0 30px rgba(200,168,78,0.4),0 0 60px rgba(200,168,78,0.15)} 50%{box-shadow:0 0 55px rgba(200,168,78,0.75),0 0 100px rgba(200,168,78,0.3)} }
                    @keyframes screenIn { from{opacity:0} to{opacity:1} }
                `}</style>
            </div>
        </>
    );
}

// ─── Simulated payment-failure screen (demo mode only) ──────────
function PaymentFailedScreen({ orderNum, onRetry }) {
    return (
        <div style={OS.root}>
            <div style={OS.bg} />
            <div style={OS.content}>
                <div style={{ fontSize: "64px", animation: "ringPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>❌</div>
                <div style={{ ...OS.title, color: "#ef5350" }}>התשלום נכשל</div>
                <div style={OS.subtitle}>לא הצלחנו לחייב את הכרטיס (מצב הדגמה)</div>
                {orderNum && (
                    <div style={{ marginTop: "14px", animation: "fadeUp 0.5s ease 0.35s both" }}>
                        <BariBadge>הזמנה {orderNum}</BariBadge>
                    </div>
                )}
                <div style={OS.divider} />
                <BariButton variant="primary" fullWidth style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }} onClick={onRetry}>
                    נסה שוב ←
                </BariButton>
            </div>
            <style>{`
                @keyframes ringPop { 0%{transform:scale(0.4);opacity:0} 55%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes screenIn { from{opacity:0} to{opacity:1} }
            `}</style>
        </div>
    );
}

const OS = {
    root: { position: "fixed", inset: 0, zIndex: 500, background: "linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl", animation: "screenIn 0.55s ease both" },
    bg: { position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(200,168,78,0.08) 0%, transparent 70%)", pointerEvents: "none" },
    content: { position: "relative", zIndex: 1, textAlign: "center", padding: "20px" },
    lottieWrap: {
        width: "220px", height: "220px", margin: "0 auto 8px",
        animation: "ringPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        filter: "drop-shadow(0 8px 32px rgba(200,168,78,0.25))",
    },
    title: { fontSize: "28px", fontWeight: 900, color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.5)", animation: "fadeUp 0.5s ease 0.3s both" },
    subtitle: { fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: "6px", animation: "fadeUp 0.5s ease 0.4s both" },
    price: {
        fontSize: "44px", fontWeight: 900, marginTop: "24px",
        backgroundImage: "linear-gradient(135deg, #c8a832, #f0d060, #ffe066, #c8a832)",
        backgroundSize: "200% 200%",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        animation: "fadeUp 0.5s ease 0.5s both, goldShimmer 3s ease 1s infinite",
        textShadow: "none",
    },
    meta: { fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "8px", fontWeight: 600, animation: "fadeUp 0.5s ease 0.6s both" },
    divider: { width: "60px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)", margin: "24px auto" },
    waBtn: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", padding: "14px 22px", borderRadius: "14px",
        background: "rgba(37,211,102,0.12)", border: "1.5px solid rgba(37,211,102,0.35)",
        color: "#4ddb80", fontSize: "15px", fontWeight: 800,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textDecoration: "none",
        boxShadow: "0 4px 16px rgba(37,211,102,0.12)",
        animation: "fadeUp 0.5s ease 0.65s both",
        marginBottom: "10px",
    },
    trackBtn: {
        display: "block", width: "100%", padding: "12px 22px", borderRadius: "14px",
        background: "rgba(200,168,78,0.08)", border: "1px solid rgba(200,168,78,0.25)",
        color: "rgba(200,168,78,0.7)", fontSize: "13px", fontWeight: 700,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textDecoration: "none", textAlign: "center",
        animation: "fadeUp 0.5s ease 0.7s both", marginBottom: "10px",
    },
};

const S = {
    // dvh — see the note in BariBaliBuilder: `100vh` would push the total +
    // "לתשלום" bar below the browser chrome on a phone.
    root: { position: "relative", width: "100%", maxWidth: "430px", minHeight: "100dvh", margin: "0 auto", overflow: "hidden", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl" },
    bg: { position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(155deg, #030a03 0%, #071a07 20%, #0a200a 45%, #071a07 70%, #030a03 100%)", filter: "blur(2px) brightness(0.65)" },
    bgRay: { position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "110%", height: "70%", zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,224,100,0.05) 0%, rgba(200,168,78,0.02) 50%, transparent 70%)" },
    main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100dvh" },
    // paddingTop keeps the brand art clear of the notch now that
    // viewport-fit=cover is on; the header background fills the strip above it.
    header: { paddingTop: "env(safe-area-inset-top)", background: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.5)), url(/builder-assets/header-brand.png) center / cover no-repeat`, borderBottom: "2px solid rgba(200,168,78,0.4)" },
    // 16px side gutter, matching `content` and `bar` — the screen used to run
    // 12/14/16/28px at different heights, which read as the header and footer
    // being crowded against the edge.
    headerTop: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px 10px" },
    backBtn: { width: "44px", height: "44px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#a5d6a7", fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", flexShrink: 0 },
    pricePill: { display: "flex", alignItems: "baseline", gap: "1px", background: "linear-gradient(135deg, rgba(200,168,78,0.22), rgba(184,134,11,0.1))", border: "1px solid rgba(200,168,78,0.4)", padding: "4px 11px", borderRadius: "12px" },
    priceS: { fontSize: "10px", color: "#d4b84a", fontWeight: 600 },
    priceV: { fontSize: "20px", color: "#ffffff", fontWeight: 900, textShadow: "0 2px 8px rgba(200,168,78,0.5)" },
    content: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 16px max(24px, env(safe-area-inset-bottom))", scrollbarWidth: "none" },
    sumBowlWrap: { position: "relative", margin: "8px auto 18px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", alignItems: "center" },
    sumBowlGlow: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "60px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(200,168,78,0.18) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(8px)" },
    /*
      The bowl is now artwork, so every CSS approximation of it — the gradient
      fill, the faked border-radius bowl shape, the rim border and inset shadow
      — is gone; the image carries all of it.

      The padding places ingredients in the bowl's INTERIOR rather than over the
      rim or the outer body. Measured off the art by scanning gold density down
      the image: the top rim occupies 0-5% of the height and the front rim band
      runs 58-68%, leaving 6-57% as usable interior. CSS percentage padding
      resolves against WIDTH, so those figures are converted through the 0.52
      aspect ratio — hence 3% / 23% rather than 6% / 43%.
    */
    sumBowl: {
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: "360px",
        aspectRatio: "1325 / 689",
        backgroundImage: "url(/builder-assets/summary-bowl.webp)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        // Ingredients are absolutely positioned by bowlPlace(), so no padding
        // or flex centring here — the scatter owns its own bounds.
    },
    /*
      Ornate frame around the WHOLE nutrition block — kcal, the four macros and
      the message — rather than around each macro card. The art is 1.56:1; four
      cards side by side are ~1.1:1 each, so per-card framing would have
      squashed the corner filigree badly and left no room inside at ~76px wide.

      `minHeight` + the aspect ratio keep the frame at its native proportion,
      and `backgroundSize: 100% 100%` lets it stretch a little when a long
      message pushes the content taller, which is far less noticeable on a
      rectangular frame than on the bowl.

      Padding clears the corner flourishes, which reach further in than the thin
      frame line does (measured: the line itself is only ~2%).
    */
    nutBox: {
        width: "100%", marginTop: "10px",
        aspectRatio: "800 / 512",
        backgroundImage: "url(/builder-assets/summary-nutbox.webp)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        padding: "5% 8%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        animation: "pFadeIn 0.5s ease 0.35s both",
    },
    sumBowlMeta: { marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.03em" },
    // 16px inner gutter + a smaller badge glyph (below): four bordered pills in
    // a bordered box used to fill the row edge-to-edge with nothing to spare,
    // which is what made it read as crowded.
    // Back to a 16px gutter, matching every other row on this screen. The 20px
    // was compensating for bordered pills landing on the panel edge; the
    // emblems are free-standing art with their own visual margin, so the
    // crowding it was fighting is gone.
    comboBanner: { marginBottom: "14px", padding: "12px 16px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(200,168,78,0.14) 0%, rgba(180,140,40,0.08) 100%)", border: "1.5px solid rgba(200,168,78,0.4)", boxShadow: "0 0 24px rgba(200,168,78,0.12), inset 0 1px 0 rgba(255,255,255,0.06)", animation: "pFadeIn 0.5s ease both" },
    comboBannerTitle: { fontSize: "10px", fontWeight: 800, color: "rgba(200,168,78,0.6)", letterSpacing: "0.06em", marginBottom: "8px" },
    // A fixed 6-across trophy wall. At this size (~38px on a 320px screen,
    // ~56px on a large phone) the Hebrew baked into each emblem is NOT
    // readable — that is the intent: the wall is scanned for shape and colour,
    // the way a collection is. The title still reaches screen readers via alt.
    comboBannerRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px", justifyItems: "center" },
    comboEmblem: { width: "100%", height: "auto", display: "block" },
    notesToggle: { width: "100%", margin: "12px 0", padding: "10px 12px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)", cursor: "pointer", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)", direction: "rtl", textAlign: "right" },
    notesInput: { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e8f5e9", fontSize: "12px", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: "none", direction: "rtl", resize: "vertical", minHeight: "60px" },
    sumPriceCard: { marginTop: "14px", padding: "14px 16px", borderRadius: "14px", background: "linear-gradient(145deg, rgba(15,45,15,0.9), rgba(20,55,20,0.85))", border: "1px solid rgba(200,168,78,0.25)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },
    sumPriceLine: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.5)", padding: "3px 0" },
    sumTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "36px", fontWeight: 900, color: "#f0d060", textShadow: "0 0 24px rgba(200,168,78,0.55), 0 2px 8px rgba(200,168,78,0.3)", padding: "12px 0 2px", marginTop: "10px", borderTop: "1px solid rgba(200,168,78,0.2)" },
    bar: {
        display: "flex", flexDirection: "column", gap: "10px",
        padding: "12px 16px 18px",
        background: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.68)), url(/builder-assets/footer-brand.png) center top / cover no-repeat`,
        borderTop: "2px solid rgba(200,168,78,0.4)",
        boxShadow: "0 -6px 28px rgba(0,0,0,0.55)",
    },
    barMeta: {
        display: "flex", gap: "10px", justifyContent: "center",
    },
    metaPill: {
        display: "flex", alignItems: "center", gap: "6px",
        padding: "8px 16px", borderRadius: "12px",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.1)",
        flex: 1, justifyContent: "center",
    },
    metaPillGold: {
        background: "rgba(200,168,78,0.12)",
        border: "1px solid rgba(200,168,78,0.35)",
        boxShadow: "0 0 12px rgba(200,168,78,0.12)",
    },
    metaPillIcon: { fontSize: "16px", lineHeight: 1 },
    metaPillText: { fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-heebo), 'Heebo', sans-serif" },
    orderBtnPrice: {
        fontSize: "15px", fontWeight: 900,
        background: "rgba(0,0,0,0.18)", padding: "3px 10px", borderRadius: "8px",
    },
    trustCopy: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "16px", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.03em", animation: "pFadeIn 0.5s ease 0.8s both" },
};

// ─── Pickup time picker ────────────────────────────────────────
function PickupTimePicker({ value, onChange }) {
    const localSlots = useMemo(() => generatePickupSlots(), []);
    const [liveSlots, setLiveSlots] = useState(null); // null = loading

    // Fetch live capacity from API
    useEffect(() => {
        fetch('/api/slots')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.slots) setLiveSlots(data.slots);
                else setLiveSlots([]); // fallback to local if API fails
            })
            .catch(() => setLiveSlots([]));
    }, []);

    // Merge live availability into local slots (or use local while loading)
    const slots = useMemo(() => {
        if (!localSlots) return null;
        if (!liveSlots) return localSlots; // still loading — show all as available
        const liveMap = Object.fromEntries(liveSlots.map(s => [s.time, s]));
        return localSlots.map(s => ({
            ...s,
            full: liveMap[s.id]?.full ?? false,
            available: liveMap[s.id]?.available ?? 5,
        }));
    }, [localSlots, liveSlots]);

    if (slots === null) {
        return (
            <div style={PT.box}>
                <div style={PT.title}>⏰ זמן איסוף</div>
                <div style={PT.closedMsg}>המסעדה סגורה כרגע · נפתח מחדש ביום ראשון</div>
            </div>
        );
    }

    return (
        <div style={PT.box}>
            <div style={PT.header}>
                <span style={PT.title}>⏰ זמן איסוף</span>
                {value && <span style={PT.selectedLabel}>{value}</span>}
            </div>
            <div style={PT.row}>
                {slots.map(slot => (
                    <button
                        key={slot.id}
                        disabled={slot.full}
                        onClick={() => !slot.full && onChange(slot.id)}
                        style={{
                            ...PT.chip,
                            ...(value === slot.id ? PT.chipActive : {}),
                            ...(slot.full ? PT.chipFull : {}),
                        }}
                    >
                        {slot.label}
                        {slot.isPeak && !slot.full && <span style={PT.peakDot} />}
                        {slot.full && <span style={PT.fullTag}>מלא</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

const PAY = {
    box: { margin: "12px 0", padding: "12px 14px", borderRadius: "12px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)" },
    title: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: "10px" },
    row: { display: "flex", gap: "8px" },
    opt: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "10px 8px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer", transition: "all 0.15s" },
    optActive: { background: "linear-gradient(135deg, rgba(200,168,78,0.28), rgba(200,168,78,0.12))", border: "1px solid var(--color-gold-deep)", color: "var(--color-gold-light)", boxShadow: "var(--shadow-gold-glow)" },
    failTest: { width: "100%", marginTop: "8px", padding: "6px", background: "none", border: "none", borderTop: "1px dashed rgba(255,255,255,0.1)", color: "rgba(239,83,80,0.6)", fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer" },
};

const PT = {
    box: { margin: "12px 0", padding: "12px 14px", borderRadius: "12px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" },
    title: { fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)" },
    selectedLabel: { fontSize: "14px", fontWeight: 900, color: "#f0d060", letterSpacing: "0.04em" },
    row: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" },
    chip: { flexShrink: 0, padding: "8px 16px", borderRadius: "10px", border: "1px solid rgba(200,168,78,0.22)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer", transition: "all 0.15s" },
    chipActive: { background: "linear-gradient(135deg, rgba(200,168,78,0.28), rgba(200,168,78,0.12))", border: "1px solid var(--color-gold-deep)", color: "var(--color-gold-light)", boxShadow: "var(--shadow-gold-glow)" },
    closedMsg: { fontSize: "12px", color: "rgba(255,255,255,0.35)", fontWeight: 600 },
    peakDot: { display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "#e57373", marginRight: "4px", verticalAlign: "middle", flexShrink: 0 },
    chipFull: { opacity: 0.3, cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.06)" },
    fullTag: { fontSize: "10px", fontWeight: 800, color: "#e57373", marginRight: "4px", letterSpacing: "0.04em" },
};

const KF = `
@keyframes popBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes pFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar{display:none}
`;

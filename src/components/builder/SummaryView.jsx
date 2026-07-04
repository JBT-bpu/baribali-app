'use client';
import { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

function Icon({ src, size = "1.2em", style = {} }) {
    if (src && src.startsWith("/")) {
        return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", verticalAlign: "middle", ...style }} />;
    }
    return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{src}</span>;
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
const headerImage = "/builder-assets/header-brand.png";
import MagicBackground from "./background/MagicBackground.jsx";
import MixingAnimation from "./ui/MixingAnimation.jsx";

export default function SummaryView({ sels, total, all, comboBadges, notes, setNotes, onBack, onEdit, onNewOrder, base = BASE, sizeLabel = null }) {
    const [showMixing, setShowMixing] = useState(false);
    const [ordered, setOrdered] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesOpen, setNotesOpen] = useState(false);
    const [highlightedStep, setHighlightedStep] = useState(null);
    const [pickupTime, setPickupTime] = useState(() => generatePickupSlots()?.[0]?.id ?? null);
    const [realOrderNum, setRealOrderNum] = useState(null);
    const [realOrderId, setRealOrderId] = useState(null);

    const highlightStep = (item) => {
        const step = STEPS.find(s => (sels[s.id] || []).some(i => i.id === item.id));
        if (!step) return;
        setHighlightedStep(step.id);
        setTimeout(() => setHighlightedStep(null), 900);
    };
    const MAX_NOTES_LENGTH = 200;
    const extras = all.filter(i => i.price > 0);
    const grouped = STEPS.map(s => ({ s, items: sels[s.id] || [] })).filter(g => g.items.length > 0);

    const handleNotesChange = (e) => {
        const value = e.target.value;
        if (value.length <= MAX_NOTES_LENGTH) {
            setNotes(value);
            setNotesError("");
        } else {
            setNotesError(`מקסימום ${MAX_NOTES_LENGTH} תווים`);
        }
    };

    const layers = useMemo(() => {
        // Each item goes into exactly one layer — priority: prots > greens > vegs > tops > rest
        const prots  = all.filter(i => i._meta?.stepId === "protein");
        const greens = all.filter(i => !prots.includes(i) && (i.tags || []).some(t => ["base", "green"].includes(t) && t !== "herb"));
        const vegs   = all.filter(i => !prots.includes(i) && !greens.includes(i) && (i.tags || []).some(t => ["fresh", "red", "orange", "yellow", "purple", "warm"].includes(t)));
        const tops   = all.filter(i => !prots.includes(i) && !greens.includes(i) && !vegs.includes(i) && (i.tags || []).some(t => ["crunch", "herb", "fat", "sweet"].includes(t)));
        const rest   = all.filter(i => !prots.includes(i) && !greens.includes(i) && !vegs.includes(i) && !tops.includes(i));
        return { greens, vegs, prots, tops, rest };
    }, [all]);

    if (ordered) return <OrderedScreen total={total} all={all} pickupTime={pickupTime} notes={notes} orderNum={realOrderNum} orderId={realOrderId} onNewOrder={onNewOrder || onBack} />;

    return (
        <div style={S.root}>
            <div style={S.bg} /><div style={S.bgRay} />
            <MagicBackground />

            {showMixing && (
                <MixingAnimation
                    all={all}
                    total={total}
                    onComplete={() => {
                        setShowMixing(false);
                        setOrdered(true);
                    }}
                />
            )}

            <div style={S.main}>
                <div style={S.header}>
                    <img src={headerImage} alt="" aria-hidden="true" style={{ width: "100%", display: "block", height: "72px", objectFit: "cover", objectPosition: "center top", flexShrink: 0 }} />
                    <div style={S.headerTop}>
                        <button style={S.backBtn} onClick={onBack}>←</button>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "17px" }}>📋</span>
                            <span style={{ fontSize: "16px", fontWeight: 800, color: "#e8f5e9" }}>הסלט שלכם</span>
                        </div>
                        <div style={S.pricePill}>
                            <span style={S.priceS}>₪</span>
                            <span style={S.priceV}>{total}</span>
                        </div>
                    </div>
                </div>

                <div style={S.content}>
                    {/* Layered bowl — hero */}
                    <div style={S.sumBowlWrap}>
                        <div style={S.sumBowlGlow} />
                        <div style={S.sumBowl}>
                            <div style={S.bowlLayer}>{[...layers.tops, ...layers.prots].map((it, i) => <span key={it.id} onClick={() => highlightStep(it)} style={{ cursor: "pointer", animation: `popBounce 0.3s ease ${i * 35 + 250}ms both`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}><Icon src={it.icon} size="20px" /></span>)}</div>
                            <div style={S.bowlLayer}>{layers.vegs.map((it, i) => <span key={it.id} onClick={() => highlightStep(it)} style={{ cursor: "pointer", animation: `popBounce 0.3s ease ${i * 35 + 120}ms both`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}><Icon src={it.icon} size="23px" /></span>)}</div>
                            <div style={S.bowlLayer}>{[...layers.greens, ...layers.rest].map((it, i) => <span key={it.id} onClick={() => highlightStep(it)} style={{ cursor: "pointer", animation: `popBounce 0.3s ease ${i * 35}ms both`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))" }}><Icon src={it.icon} size="26px" /></span>)}</div>
                        </div>
                        <NutriStats all={all} />
                        <div style={S.sumBowlMeta}>
                            <span>{all.length} מרכיבים</span>
                        </div>
                    </div>

                    {comboBadges.length > 0 && (
                        <div style={S.comboBanner}>
                            <div style={S.comboBannerTitle}>🏆 שילובים שנבחרו</div>
                            <div style={S.comboBannerRow}>
                                {comboBadges.map(b => (
                                    <div key={b.id} style={S.badgePill}>
                                        <span style={{ fontSize: "16px" }}>{b.icon}</span>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#edd87e" }}>{b.he}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── RPG Inventory ── */}
                    <div style={{ margin: "0 12px 8px" }}>
                        {grouped.map(({ s, items }, gi) => (
                            <div key={s.id} style={{
                                marginBottom: "14px",
                                opacity: highlightedStep && highlightedStep !== s.id ? 0.45 : 1,
                                transition: "opacity 0.3s ease",
                            }}>
                                {/* Shelf label */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "13px" }}>{s.emoji}</span>
                                    <span style={{ fontSize: "10px", fontWeight: 800, color: "rgba(200,168,78,0.75)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.title}</span>
                                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(200,168,78,0.2), transparent)" }} />
                                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>{items.length}</span>
                                </div>
                                {/* Slot grid */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "flex-start" }}>
                                    {items.map((item, i) => (
                                        <div key={item.id} style={{
                                            width: "56px",
                                            background: "linear-gradient(145deg, rgba(12,36,12,0.85), rgba(6,18,6,0.92))",
                                            border: `1px solid ${item.price > 0 ? "rgba(200,168,78,0.45)" : "rgba(255,255,255,0.1)"}`,
                                            borderRadius: "9px",
                                            display: "flex", flexDirection: "column",
                                            alignItems: "center", justifyContent: "flex-start",
                                            padding: "6px 3px 5px",
                                            gap: "3px",
                                            position: "relative",
                                            boxShadow: item.price > 0
                                                ? "0 0 8px rgba(200,168,78,0.15), 0 2px 6px rgba(0,0,0,0.4)"
                                                : "0 2px 6px rgba(0,0,0,0.4)",
                                            animation: `popBounce 0.3s ease ${gi * 60 + i * 40}ms both`,
                                        }}>
                                            {item.price > 0 && (
                                                <div style={{
                                                    position: "absolute", top: "-3px", right: "-3px",
                                                    background: "linear-gradient(135deg, #c8a832, #f0d060)",
                                                    color: "#0d2e0d", fontSize: "6px", fontWeight: 900,
                                                    padding: "1px 4px", borderRadius: "5px",
                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                                }}>+₪{item.price}</div>
                                            )}
                                            <Icon src={item.icon} size="30px" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
                                            <span style={{
                                                fontSize: "7.5px", fontWeight: 700,
                                                color: "rgba(255,255,255,0.55)",
                                                textAlign: "center", lineHeight: 1.15,
                                                maxWidth: "52px", overflow: "hidden",
                                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}>{item.he}</span>
                                        </div>
                                    ))}
                                    {onEdit && (
                                        <button onClick={() => onEdit(STEPS.findIndex(st => st.id === s.id))}
                                            style={{
                                                width: "56px", height: "68px",
                                                background: "rgba(255,255,255,0.02)",
                                                border: "1px dashed rgba(200,168,78,0.18)",
                                                borderRadius: "9px",
                                                display: "flex", flexDirection: "column",
                                                alignItems: "center", justifyContent: "center",
                                                cursor: "pointer", gap: "3px",
                                            }}>
                                            <span style={{ fontSize: "14px", opacity: 0.5 }}>✏️</span>
                                            <span style={{ fontSize: "7px", fontWeight: 700, color: "rgba(200,168,78,0.45)" }}>ערוך</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Notes — collapsed by default */}
                    <div style={S.notesBox}>
                        <button
                            style={S.notesToggle}
                            onClick={() => setNotesOpen(o => !o)}
                            aria-expanded={notesOpen}
                        >
                            <span>📝 הערה לבשלן</span>
                            {notes.length > 0 && !notesOpen && (
                                <span style={{ fontSize: "10px", color: "rgba(200,168,78,0.7)", fontWeight: 600 }}>✓ נוספה</span>
                            )}
                            <span style={{ marginRight: "auto", fontSize: "12px", color: "rgba(255,255,255,0.3)", transition: "transform 0.2s", transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                        </button>
                        {notesOpen && (
                            <div style={{ marginTop: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "9px", color: notes.length > MAX_NOTES_LENGTH * 0.8 ? "#e57373" : "rgba(255,255,255,0.3)" }}>
                                        {MAX_NOTES_LENGTH - notes.length} תווים נותרו
                                    </span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={handleNotesChange}
                                    placeholder="לדוגמה: בלי גרעינים, לחתוך קטן..."
                                    rows={3}
                                    maxLength={MAX_NOTES_LENGTH}
                                    aria-label="הערות מיוחדות להזמנה"
                                    style={{ ...S.notesInput }}
                                    autoFocus
                                />
                                {notesError && <div style={{ fontSize: "10px", color: "#ef5350", marginTop: "4px" }}>⚠️ {notesError}</div>}
                            </div>
                        )}
                    </div>

                    {/* Pickup time picker */}
                    <PickupTimePicker value={pickupTime} onChange={setPickupTime} />

                    {/* Price breakdown */}
                    <div style={S.sumPriceCard}>
                        <div style={S.sumPriceLine}>
                            <span>סלט בסיס{sizeLabel ? <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}> · {sizeLabel}</span> : null}</span>
                            <span style={{ fontWeight: 700 }}>₪{base}</span>
                        </div>
                        {extras.map(it => (
                            <div key={it.id} style={S.sumPriceLine}>
                                <span style={{ opacity: 0.7, fontSize: "12px" }}>+ {it.he}</span>
                                <span style={{ color: "#edd87e", fontWeight: 600 }}>₪{it.price}</span>
                            </div>
                        ))}
                        <div style={S.sumTotal}>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>סה"כ</span>
                            <span>₪{total}</span>
                        </div>
                    </div>
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
                    {/* CTA */}
                    <button style={S.orderBtn} onClick={() => {
                        if (navigator.vibrate) navigator.vibrate([15, 40, 30]);
                        setShowMixing(true);
                        // Fire API in parallel — animation gives it ~5s to complete
                        fetch('/api/orders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                items: all.map(i => ({ id: i.id, he: i.he, icon: i.icon, price: i.price || 0 })),
                                total,
                                pickupTime,
                                notes,
                                size: base,
                            }),
                        })
                            .then(r => r.ok ? r.json() : null)
                            .then(async data => {
                                if (data?.orderNum) setRealOrderNum(data.orderNum);
                                if (data?.id) setRealOrderId(data.id);
                                // If payment is enabled, redirect to payment page
                                if (data?.id && !data?.demo) {
                                    const payRes = await fetch('/api/payment/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: data.id }),
                                    }).then(r => r.ok ? r.json() : null).catch(() => null);
                                    if (payRes?.paymentUrl) {
                                        window.location.href = payRes.paymentUrl;
                                    }
                                }
                            })
                            .catch(() => {}); // silent fallback
                    }}>
                        <span>שלח הזמנה</span>
                        <span style={S.orderBtnPrice}>₪{total}</span>
                    </button>
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
        <div style={{ width: "100%", marginTop: "10px", animation: "pFadeIn 0.5s ease 0.35s both" }}>
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
                        flex: 1, background: s.bg, border: `1px solid ${s.border}`,
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
                        <span style={{ fontSize: "8px", fontWeight: 800, color: s.color, opacity: 0.7, letterSpacing: "0.05em" }}>g</span>
                        <span style={{ fontSize: "8px", fontWeight: 700, color: "rgba(255,255,255,0.38)", lineHeight: 1.1 }}>{s.label}</span>
                    </div>
                ))}
            </div>
            {msg && (
                <div style={{ textAlign: "center", marginTop: "7px", fontSize: "10px", fontWeight: 800, color: msg.color, opacity: 0.9, letterSpacing: "0.02em" }}>
                    {msg.text}
                </div>
            )}
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "8.5px", fontWeight: 500, color: "rgba(255,255,255,0.22)", letterSpacing: "0.03em" }}>
                * הערכה בלבד · לא מהווה ייעוץ תזונתי
            </div>
        </div>
    );
}

const SHOP_WA = process.env.NEXT_PUBLIC_SHOP_WA_NUMBER || '972501234567';

// ─── Post-order confirmation screen ─────────────────────────
function ConfettiCanvas({ all }) {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d');
        c.width = window.innerWidth;
        c.height = window.innerHeight;

        const colors = ['#f0d060', '#ffe08a', '#c8a832', '#ffffff', '#a5d6a7', '#edd87e'];
        const particles = Array.from({ length: 68 }, (_, i) => ({
            x: c.width / 2 + (Math.random() - 0.5) * 60,
            y: c.height * 0.42,
            vx: (Math.random() - 0.5) * 14,
            vy: -(Math.random() * 12 + 6),
            gravity: 0.38,
            alpha: 1,
            color: colors[i % colors.length],
            r: Math.random() * 5 + 2,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 0.25,
            shape: i % 5 === 0 ? 'circle' : i % 5 === 1 ? 'rect' : 'dot',
        }));

        let raf;
        const draw = () => {
            ctx.clearRect(0, 0, c.width, c.height);
            let alive = 0;
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= 0.99;
                p.rot += p.rotV;
                p.alpha -= 0.012;
                if (p.alpha <= 0) continue;
                alive++;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                } else if (p.shape === 'rect') {
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                }
                ctx.restore();
            }
            if (alive > 0) raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [all]);
    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 501 }} />;
}

function OrderedScreen({ total, all, pickupTime, notes, orderNum: propOrderNum, orderId, onNewOrder }) {
    const fallbackNum = useMemo(() => `BB-${((Date.now() % 9000) + 1000)}`, []);
    const orderNum = propOrderNum || fallbackNum;
    const [animData, setAnimData] = useState(null);
    useEffect(() => { fetch("/cat-salad-final.json").then(r => r.json()).then(setAnimData).catch(() => {}); }, []);

    const waLink = useMemo(() => {
        const items = all.map(i => i.he).join(', ');
        const timeLine = pickupTime ? `⏰ איסוף: ${pickupTime}\n` : '';
        const noteLine = notes ? `📝 ${notes}\n` : '';
        const msg = `🥗 *הזמנה ${orderNum}*\n${timeLine}💰 סה"כ: ₪${total}\n\n*מרכיבים:*\n${items}\n${noteLine}`;
        return `https://wa.me/${SHOP_WA}?text=${encodeURIComponent(msg)}`;
    }, [orderNum, all, total, pickupTime, notes]);

    return (
        <>
            <ConfettiCanvas all={all} />
            <div style={OS.root}>
                <div style={OS.bg} />
                <div style={OS.content}>
                    <div style={OS.lottieWrap}>
                        {animData && <Lottie animationData={animData} loop autoplay style={{ width: "100%", height: "100%" }} />}
                    </div>
                    <div style={OS.title}>בהכנה!</div>
                    <div style={OS.subtitle}>מכינים את הסלט שלכם עכשיו 🐱</div>
                    <div style={OS.orderNumBadge}>הזמנה {orderNum}</div>
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
                    <button style={OS.newOrderBtn} onClick={onNewOrder}>
                        הזמנה חדשה ←
                    </button>
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


const OS = {
    root: { position: "fixed", inset: 0, zIndex: 500, background: "linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", direction: "rtl", animation: "screenIn 0.55s ease both" },
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
    orderNumBadge: {
        display: "inline-block", marginTop: "14px",
        padding: "4px 14px", borderRadius: "20px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.08em", animation: "fadeUp 0.5s ease 0.35s both",
    },
    divider: { width: "60px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)", margin: "24px auto" },
    waBtn: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", padding: "14px 22px", borderRadius: "14px",
        background: "rgba(37,211,102,0.12)", border: "1.5px solid rgba(37,211,102,0.35)",
        color: "#4ddb80", fontSize: "15px", fontWeight: 800,
        fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", textDecoration: "none",
        boxShadow: "0 4px 16px rgba(37,211,102,0.12)",
        animation: "fadeUp 0.5s ease 0.65s both",
        marginBottom: "10px",
    },
    trackBtn: {
        display: "block", width: "100%", padding: "12px 22px", borderRadius: "14px",
        background: "rgba(200,168,78,0.08)", border: "1px solid rgba(200,168,78,0.25)",
        color: "rgba(200,168,78,0.7)", fontSize: "13px", fontWeight: 700,
        fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", textDecoration: "none", textAlign: "center",
        animation: "fadeUp 0.5s ease 0.7s both", marginBottom: "10px",
    },
    newOrderBtn: {
        display: "block", width: "100%",
        padding: "13px 22px", borderRadius: "14px", cursor: "pointer",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.45)", fontSize: "14px", fontWeight: 700,
        fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
        animation: "fadeUp 0.5s ease 0.75s both",
    },
};

const S = {
    root: { position: "relative", width: "100%", maxWidth: "430px", minHeight: "100vh", margin: "0 auto", overflow: "hidden", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", direction: "rtl" },
    bg: { position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(155deg, #030a03 0%, #071a07 20%, #0a200a 45%, #071a07 70%, #030a03 100%)", filter: "blur(2px) brightness(0.65)" },
    bgRay: { position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "110%", height: "70%", zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,224,100,0.05) 0%, rgba(200,168,78,0.02) 50%, transparent 70%)" },
    main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" },
    header: { background: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.5)), url(/builder-assets/header-brand.png) center / cover no-repeat`, borderBottom: "2px solid rgba(200,168,78,0.4)" },
    headerTop: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px 10px" },
    backBtn: { width: "44px", height: "44px", borderRadius: "10px", cursor: "pointer", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#a5d6a7", fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", flexShrink: 0 },
    pricePill: { display: "flex", alignItems: "baseline", gap: "1px", background: "linear-gradient(135deg, rgba(200,168,78,0.22), rgba(184,134,11,0.1))", border: "1px solid rgba(200,168,78,0.4)", padding: "4px 11px", borderRadius: "12px" },
    priceS: { fontSize: "10px", color: "#d4b84a", fontWeight: 600 },
    priceV: { fontSize: "20px", color: "#ffffff", fontWeight: 900, textShadow: "0 2px 8px rgba(200,168,78,0.5)" },
    content: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 16px max(24px, env(safe-area-inset-bottom))", scrollbarWidth: "none" },
    sumBowlWrap: { position: "relative", margin: "8px auto 18px", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center" },
    sumBowlGlow: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "60px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(200,168,78,0.18) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(8px)" },
    sumBowl: { position: "relative", zIndex: 1, width: "280px", minHeight: "120px", padding: "14px 14px 10px", borderRadius: "16px 16px 50% 50% / 16px 16px 44% 44%", background: "linear-gradient(170deg, rgba(22,65,22,0.85), rgba(15,48,15,0.8))", border: "1px solid rgba(200,168,78,0.28)", boxShadow: "0 10px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,168,78,0.08), inset 0 2px 6px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" },
    sumBowlMeta: { marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.03em" },
    bowlLayer: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3px" },
    comboBanner: { marginBottom: "14px", padding: "12px 14px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(200,168,78,0.14) 0%, rgba(180,140,40,0.08) 100%)", border: "1.5px solid rgba(200,168,78,0.4)", boxShadow: "0 0 24px rgba(200,168,78,0.12), inset 0 1px 0 rgba(255,255,255,0.06)", animation: "pFadeIn 0.5s ease both" },
    comboBannerTitle: { fontSize: "10px", fontWeight: 800, color: "rgba(200,168,78,0.6)", letterSpacing: "0.06em", marginBottom: "8px" },
    comboBannerRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
    badgePill: { display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", borderRadius: "10px", background: "rgba(200,168,78,0.12)", border: "1px solid rgba(200,168,78,0.3)" },
    notesBox: { margin: "12px 0", padding: "10px", borderRadius: "12px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)" },
    notesToggle: { width: "100%", display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)", direction: "rtl", textAlign: "right" },
    notesInput: { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e8f5e9", fontSize: "12px", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", outline: "none", direction: "rtl", resize: "vertical", minHeight: "60px" },
    sumPriceCard: { marginTop: "14px", padding: "14px 16px", borderRadius: "14px", background: "linear-gradient(145deg, rgba(15,45,15,0.9), rgba(20,55,20,0.85))", border: "1px solid rgba(200,168,78,0.25)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },
    sumPriceLine: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.5)", padding: "3px 0" },
    sumTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "36px", fontWeight: 900, color: "#f0d060", textShadow: "0 0 24px rgba(200,168,78,0.55), 0 2px 8px rgba(200,168,78,0.3)", padding: "12px 0 2px", marginTop: "10px", borderTop: "1px solid rgba(200,168,78,0.2)" },
    bar: {
        display: "flex", flexDirection: "column", gap: "10px",
        padding: "12px 14px 18px",
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
    metaPillText: { fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif" },
    orderBtn: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
        width: "100%", padding: "16px 22px", borderRadius: "16px", cursor: "pointer",
        backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe066 55%, #c8a832 100%)",
        backgroundSize: "200% 100%",
        border: "none", color: "#0d2e0d", fontSize: "17px", fontWeight: 900,
        fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
        boxShadow: "0 6px 28px rgba(200,168,78,0.5), 0 0 0 1px rgba(200,168,78,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
        transition: "transform 0.15s, box-shadow 0.15s",
    },
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

const PT = {
    box: { margin: "12px 0", padding: "12px 14px", borderRadius: "12px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" },
    title: { fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)" },
    selectedLabel: { fontSize: "14px", fontWeight: 900, color: "#f0d060", letterSpacing: "0.04em" },
    row: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" },
    chip: { flexShrink: 0, padding: "8px 16px", borderRadius: "10px", border: "1px solid rgba(200,168,78,0.22)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer", transition: "all 0.15s" },
    chipActive: { background: "linear-gradient(135deg, rgba(200,168,78,0.28), rgba(200,168,78,0.12))", border: "1px solid rgba(200,168,78,0.7)", color: "#f0d060", boxShadow: "0 0 12px rgba(200,168,78,0.2)" },
    closedMsg: { fontSize: "12px", color: "rgba(255,255,255,0.35)", fontWeight: 600 },
    peakDot: { display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "#e57373", marginRight: "4px", verticalAlign: "middle", flexShrink: 0 },
    chipFull: { opacity: 0.3, cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.06)" },
    fullTag: { fontSize: "9px", fontWeight: 800, color: "#e57373", marginRight: "4px", letterSpacing: "0.04em" },
};

const KF = `
@keyframes popBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes pFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
* { -webkit-tap-highlight-color:transparent; box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar{display:none}
`;

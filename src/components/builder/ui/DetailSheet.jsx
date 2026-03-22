import { useRef } from "react";
import { NUTRI } from "../../../data/salad-data.js";

const TAG_MAP = {
    protein:  { he: "חלבון",   icon: "💪", color: "#c8a832", bg: "rgba(200,168,78,0.15)"  },
    vegan:    { he: "טבעוני",  icon: "🌱", color: "#4caf50", bg: "rgba(76,175,80,0.15)"   },
    grain:    { he: "דגנים",   icon: "🌾", color: "#a0877a", bg: "rgba(160,135,122,0.15)" },
    veggie:   { he: "ירק",     icon: "🥬", color: "#66bb6a", bg: "rgba(102,187,106,0.15)" },
    herb:     { he: "עשבים",   icon: "🌿", color: "#81c784", bg: "rgba(129,199,132,0.15)" },
    topping:  { he: "טופינג",  icon: "✨", color: "#64b5f6", bg: "rgba(100,181,246,0.15)" },
    sauce:    { he: "רוטב",    icon: "🫙", color: "#ff8a65", bg: "rgba(255,138,101,0.15)" },
    spicy:    { he: "חריף",    icon: "🌶️", color: "#ef5350", bg: "rgba(239,83,80,0.15)"  },
};

export default function DetailSheet({ item, isAdded, onToggle, onClose }) {
    const n = NUTRI[item.id];
    const sheetRef = useRef(null);
    const touchStartY = useRef(0);

    const maxVal = n ? Math.max(n.p || 0, n.c || 0, n.f || 0, n.fb || 0, 1) : 1;
    const barPct = (val) => `${Math.max(Math.round((val / maxVal) * 100), 3)}%`;

    const nutrients = n && n.kcal > 0 ? [
        { label: "חלבון",    val: n.p,  unit: "g", color: "#c8a832", track: "rgba(200,168,78,0.12)" },
        { label: "פחמימות", val: n.c,  unit: "g", color: "#4caf82", track: "rgba(76,175,130,0.1)"  },
        { label: "שומן",     val: n.f,  unit: "g", color: "#64b5f6", track: "rgba(100,181,246,0.1)" },
        { label: "סיבים",   val: n.fb, unit: "g", color: "#a5d6a7", track: "rgba(165,214,167,0.1)" },
    ] : [];

    const tags = (item.tags || []).map(t => TAG_MAP[t]).filter(Boolean);

    // Swipe-to-dismiss
    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
        const delta = e.changedTouches[0].clientY - touchStartY.current;
        if (delta > 80) onClose();
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                ref={sheetRef}
                style={S.sheet}
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* Drag handle */}
                <div style={S.handle} />

                {/* Hero — large centered icon + glow */}
                <div style={S.heroWrap}>
                    <div style={S.glowRing} />
                    <div style={S.heroIcon}>{item.icon}</div>
                    <div style={S.heroName}>{item.he}</div>
                    {item.desc && <div style={S.heroDesc}>{item.desc}</div>}

                    {/* Tags row */}
                    {tags.length > 0 && (
                        <div style={S.tagsRow}>
                            {tags.map(t => (
                                <span key={t.he} style={{ ...S.tagPill, color: t.color, background: t.bg, border: `1px solid ${t.color}40` }}>
                                    {t.icon} {t.he}
                                </span>
                            ))}
                            {item.price > 0 && (
                                <span style={S.pricePill}>+₪{item.price}</span>
                            )}
                        </div>
                    )}
                    {item.price > 0 && tags.length === 0 && (
                        <div style={{ marginTop: "8px" }}>
                            <span style={S.pricePill}>+₪{item.price}</span>
                        </div>
                    )}
                </div>

                {/* Kcal hero pill */}
                {n && n.kcal > 0 && (
                    <div style={S.kcalRow}>
                        <div style={S.kcalPill}>
                            <span style={S.kcalNum}>{n.kcal}</span>
                            <span style={S.kcalUnit}>קק״ל</span>
                            <span style={S.kcalSub}>למנה</span>
                        </div>
                    </div>
                )}

                {/* Nutrition bars */}
                {nutrients.length > 0 && (
                    <div style={S.nutriSection}>
                        <div style={S.nutriTitle}>ערכים תזונתיים</div>
                        {nutrients.map((row, i) => (
                            <div key={row.label} style={S.nutriRow}>
                                <span style={S.nutriLabel}>{row.label}</span>
                                <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: row.track, overflow: "hidden" }}>
                                    <div style={{
                                        width: barPct(row.val),
                                        height: "100%",
                                        borderRadius: "3px",
                                        background: row.color,
                                        animation: `barGrow 0.5s cubic-bezier(0.34,1.2,0.64,1) ${i * 60 + 80}ms both`,
                                    }} />
                                </div>
                                <span style={S.nutriVal}>{row.val}g</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Fun fact */}
                {n?.fact && (
                    <>
                        <div style={S.divider} />
                        <div style={S.factBox}>
                            <div style={S.factTitle}>💡 הידעת?</div>
                            <div style={S.factText}>{n.fact}</div>
                        </div>
                    </>
                )}

                {/* CTAs */}
                <div style={S.ctaWrap}>
                    {onToggle && (
                        <button onClick={onToggle} style={isAdded ? S.ctaRemove : S.ctaAdd}>
                            {isAdded ? "✕ הסר מהסלט" : "+ הוסף לסלט"}
                        </button>
                    )}
                    <button onClick={onClose} style={S.closeBtn}>סגור</button>
                </div>
            </div>
            <style>{KF}</style>
        </div>
    );
}

const S = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
        animation: "overlayIn 0.22s ease",
    },
    sheet: {
        width: "100%", maxWidth: "430px",
        padding: "0 0 max(24px, env(safe-area-inset-bottom))",
        borderRadius: "24px 24px 0 0",
        background: "linear-gradient(175deg, rgba(14,42,14,0.99) 0%, rgba(8,26,8,0.99) 100%)",
        border: "1px solid rgba(200,168,78,0.18)",
        borderBottom: "none",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
        animation: "sheetUp 0.28s cubic-bezier(0.34,1.2,0.64,1)",
        fontFamily: "'Heebo',sans-serif",
        direction: "rtl",
        overflow: "hidden",
        maxHeight: "90vh",
        overflowY: "auto",
    },

    handle: {
        width: "40px", height: "4px", borderRadius: "2px",
        background: "rgba(255,255,255,0.18)",
        margin: "12px auto 0",
    },

    // ── Hero ─────────────────────────────────────────────────
    heroWrap: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "20px 20px 16px",
        position: "relative",
        textAlign: "center",
    },
    glowRing: {
        position: "absolute", top: "10px", left: "50%",
        transform: "translateX(-50%)",
        width: "140px", height: "140px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,168,78,0.14) 0%, rgba(200,168,78,0.04) 50%, transparent 70%)",
        pointerEvents: "none",
    },
    heroIcon: {
        fontSize: "76px", lineHeight: 1,
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))",
        position: "relative", zIndex: 1,
        animation: "iconPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        marginBottom: "10px",
    },
    heroName: {
        fontSize: "22px", fontWeight: 900, color: "#e8f5e9",
        textShadow: "0 1px 6px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 1,
        marginBottom: "4px",
    },
    heroDesc: {
        fontSize: "12px", color: "rgba(255,255,255,0.48)",
        fontWeight: 500, lineHeight: 1.5,
        maxWidth: "280px",
        position: "relative", zIndex: 1,
    },

    tagsRow: {
        display: "flex", flexWrap: "wrap", gap: "6px",
        justifyContent: "center",
        marginTop: "10px",
        position: "relative", zIndex: 1,
    },
    tagPill: {
        fontSize: "11px", fontWeight: 700,
        padding: "3px 10px", borderRadius: "20px",
        display: "inline-flex", alignItems: "center", gap: "3px",
    },
    pricePill: {
        fontSize: "11px", fontWeight: 800, color: "#edd87e",
        background: "rgba(200,168,78,0.15)",
        border: "1px solid rgba(200,168,78,0.35)",
        padding: "3px 10px", borderRadius: "20px",
    },

    // ── Kcal ─────────────────────────────────────────────────
    kcalRow: {
        padding: "0 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "center",
    },
    kcalPill: {
        display: "inline-flex", alignItems: "baseline", gap: "4px",
        padding: "6px 18px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(200,168,78,0.15), rgba(200,168,78,0.06))",
        border: "1px solid rgba(200,168,78,0.3)",
    },
    kcalNum: {
        fontSize: "28px", fontWeight: 900, color: "#f0d060",
        textShadow: "0 0 18px rgba(200,168,78,0.5)",
    },
    kcalUnit: { fontSize: "13px", fontWeight: 700, color: "rgba(200,168,78,0.7)" },
    kcalSub: { fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.3)", marginRight: "4px" },

    // ── Nutrition ────────────────────────────────────────────
    nutriSection: { padding: "14px 20px 10px" },
    nutriTitle: {
        fontSize: "10px", fontWeight: 800,
        color: "rgba(255,255,255,0.28)",
        letterSpacing: "0.08em",
        marginBottom: "10px",
        textTransform: "uppercase",
    },
    nutriRow: {
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "8px",
    },
    nutriLabel: {
        fontSize: "11px", fontWeight: 700,
        color: "rgba(255,255,255,0.5)",
        width: "48px", textAlign: "right", flexShrink: 0,
    },
    nutriVal: {
        fontSize: "11px", fontWeight: 700,
        color: "rgba(255,255,255,0.45)",
        width: "32px", flexShrink: 0, textAlign: "left",
    },

    divider: {
        height: "1px", margin: "4px 20px 12px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.18), transparent)",
    },

    // ── Fact ─────────────────────────────────────────────────
    factBox: {
        margin: "0 16px", padding: "12px 14px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(200,168,78,0.07), rgba(200,168,78,0.02))",
        border: "1px solid rgba(200,168,78,0.13)",
    },
    factTitle: {
        fontSize: "10px", fontWeight: 800,
        color: "rgba(200,168,78,0.6)",
        marginBottom: "5px", letterSpacing: "0.04em",
    },
    factText: {
        fontSize: "12px", color: "rgba(255,255,255,0.68)",
        lineHeight: 1.65, fontWeight: 500,
    },

    // ── CTAs ─────────────────────────────────────────────────
    ctaWrap: {
        display: "flex", flexDirection: "column", gap: "8px",
        padding: "16px 16px 0",
    },
    ctaAdd: {
        width: "100%", padding: "13px",
        borderRadius: "14px",
        border: "none",
        background: "linear-gradient(135deg, #c8a832, #f0d060)",
        color: "#1a1000",
        fontSize: "15px", fontWeight: 900,
        cursor: "pointer", fontFamily: "'Heebo',sans-serif",
        boxShadow: "0 4px 16px rgba(200,168,78,0.3)",
        animation: "fadeUp 0.3s ease 0.1s both",
    },
    ctaRemove: {
        width: "100%", padding: "13px",
        borderRadius: "14px",
        border: "1px solid rgba(239,83,80,0.35)",
        background: "rgba(239,83,80,0.08)",
        color: "rgba(239,83,80,0.85)",
        fontSize: "15px", fontWeight: 700,
        cursor: "pointer", fontFamily: "'Heebo',sans-serif",
        animation: "fadeUp 0.3s ease 0.1s both",
    },
    closeBtn: {
        width: "100%", padding: "11px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.35)",
        fontSize: "13px", fontWeight: 700,
        cursor: "pointer", fontFamily: "'Heebo',sans-serif",
    },
};

const KF = `
@keyframes overlayIn  { from{opacity:0} to{opacity:1} }
@keyframes sheetUp    { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes iconPop    { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes barGrow    { from{width:0} }
@keyframes fadeUp     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

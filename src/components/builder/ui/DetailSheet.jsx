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

const MACROS = [
    { key: "p",  label: "חלבון",    color: "#c8a832" },
    { key: "c",  label: "פחמימות",  color: "#4caf82" },
    { key: "f",  label: "שומן",     color: "#64b5f6" },
    { key: "fb", label: "סיבים",    color: "#a5d6a7" },
];

export default function DetailSheet({ item, isAdded, onToggle, onClose }) {
    const n = NUTRI[item.id];
    const sheetRef = useRef(null);
    const touchStartY = useRef(0);
    const tags = (item.tags || []).map(t => TAG_MAP[t]).filter(Boolean);

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

                {/* ── Hero row: icon left · info right ── */}
                <div style={S.heroRow}>

                    {/* Icon */}
                    <div style={S.iconWrap}>
                        <div style={S.glowBg} />
                        <div style={S.iconBox}>
                            {item.icon && item.icon.startsWith("/")
                                ? <img src={item.icon} alt={item.he} style={{ width: "88px", height: "88px", objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 18px rgba(200,168,78,0.25))" }} />
                                : <span style={{ fontSize: "88px", lineHeight: 1, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 18px rgba(200,168,78,0.25))" }}>{item.icon}</span>}
                        </div>
                    </div>

                    {/* Info column */}
                    <div style={S.infoCol}>
                        {/* Name + kcal on same line */}
                        <div style={S.nameKcalRow}>
                            <span style={S.itemName}>{item.he}</span>
                            {n && n.kcal > 0 && (
                                <>
                                    <span style={S.kcalDivider} />
                                    <span style={S.kcalBadge}>
                                        <span style={S.kcalNum}>{n.kcal}</span>
                                        <span style={S.kcalUnit}>קק״ל</span>
                                    </span>
                                </>
                            )}
                        </div>
                        {item.desc && <div style={S.itemDesc}>{item.desc}</div>}

                        {/* Price */}
                        {item.price > 0 && (
                            <div style={{ marginTop: "4px" }}>
                                <span style={S.pricePill}>+₪{item.price}</span>
                            </div>
                        )}

                        {/* Macros */}
                        {n && n.kcal > 0 && (
                            <>
                                <div style={S.macroGrid}>
                                    {MACROS.map(m => (
                                        <div key={m.key} style={S.macroPill}>
                                            <span style={{ ...S.macroVal, color: m.color }}>{n[m.key]}</span>
                                            <span style={S.macroLabel}>{m.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tags row */}
                {tags.length > 0 && (
                    <div style={S.tagsRow}>
                        {tags.map(t => (
                            <span key={t.he} style={{ ...S.tagPill, color: t.color, background: t.bg, border: `1px solid ${t.color}40` }}>
                                {t.icon} {t.he}
                            </span>
                        ))}
                    </div>
                )}

                {/* Fun fact */}
                {n?.fact && (
                    <div style={S.factBox}>
                        <div style={S.factTitle}>💡 הידעת?</div>
                        <div style={S.factText}>{n.fact}</div>
                    </div>
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
        fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
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

    // ── Hero row ──────────────────────────────────────────────
    heroRow: {
        display: "flex", alignItems: "center", gap: "16px",
        padding: "16px 16px 14px",
    },
    iconWrap: {
        position: "relative", flexShrink: 0,
        width: "100px", height: "100px",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    glowBg: {
        position: "absolute", inset: 0, borderRadius: "20px",
        background: "radial-gradient(circle, rgba(200,168,78,0.22) 0%, rgba(200,168,78,0.06) 55%, transparent 75%)",
        pointerEvents: "none",
        animation: "glowPulse 3s ease-in-out infinite",
    },
    iconBox: {
        position: "relative", zIndex: 1,
        animation: "iconPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both, iconFloat 3.5s ease-in-out 0.5s infinite",
        display: "flex", alignItems: "center", justifyContent: "center",
    },

    infoCol: {
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column", gap: "2px",
    },
    nameKcalRow: {
        display: "flex", alignItems: "center", gap: "8px",
    },
    itemName: {
        fontSize: "19px", fontWeight: 900, color: "#e8f5e9",
        textShadow: "0 1px 6px rgba(0,0,0,0.5)", lineHeight: 1.2,
    },
    kcalDivider: {
        display: "inline-block",
        width: "1px", height: "16px", borderRadius: "1px",
        background: "rgba(255,255,255,0.15)",
        flexShrink: 0,
    },
    kcalBadge: {
        display: "inline-flex", alignItems: "baseline", gap: "2px",
        flexShrink: 0,
    },
    itemDesc: {
        fontSize: "11px", color: "rgba(255,255,255,0.42)",
        fontWeight: 500, lineHeight: 1.4,
    },
    pricePill: {
        fontSize: "11px", fontWeight: 800, color: "#edd87e",
        background: "rgba(200,168,78,0.15)",
        border: "1px solid rgba(200,168,78,0.35)",
        padding: "2px 8px", borderRadius: "20px",
    },
    kcalNum: {
        fontSize: "20px", fontWeight: 900, color: "#f0d060",
        textShadow: "0 0 12px rgba(200,168,78,0.45)", lineHeight: 1,
    },
    kcalUnit: {
        fontSize: "11px", fontWeight: 700, color: "rgba(200,168,78,0.6)",
    },
    macroGrid: {
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "4px", marginTop: "6px",
    },
    macroPill: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "4px 6px", borderRadius: "8px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
    },
    macroVal: {
        fontSize: "14px", fontWeight: 900, lineHeight: 1,
    },
    macroLabel: {
        fontSize: "9px", fontWeight: 600,
        color: "rgba(255,255,255,0.35)",
        marginTop: "1px",
    },

    // ── Tags ──────────────────────────────────────────────────
    tagsRow: {
        display: "flex", flexWrap: "wrap", gap: "5px",
        padding: "0 16px 12px",
    },
    tagPill: {
        fontSize: "11px", fontWeight: 700,
        padding: "3px 10px", borderRadius: "20px",
        display: "inline-flex", alignItems: "center", gap: "3px",
    },

    // ── Fact ─────────────────────────────────────────────────
    factBox: {
        margin: "0 16px 12px", padding: "11px 14px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(200,168,78,0.07), rgba(200,168,78,0.02))",
        border: "1px solid rgba(200,168,78,0.13)",
    },
    factTitle: {
        fontSize: "10px", fontWeight: 800,
        color: "rgba(200,168,78,0.6)",
        marginBottom: "4px", letterSpacing: "0.04em",
    },
    factText: {
        fontSize: "12px", color: "rgba(255,255,255,0.68)",
        lineHeight: 1.65, fontWeight: 500,
    },

    // ── CTAs ─────────────────────────────────────────────────
    ctaWrap: {
        display: "flex", flexDirection: "column", gap: "8px",
        padding: "4px 16px 0",
    },
    ctaAdd: {
        width: "100%", padding: "13px",
        borderRadius: "14px", border: "none",
        background: "linear-gradient(135deg, #c8a832, #f0d060)",
        color: "#1a1000", fontSize: "15px", fontWeight: 900,
        cursor: "pointer", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
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
        cursor: "pointer", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
        animation: "fadeUp 0.3s ease 0.1s both",
    },
    closeBtn: {
        width: "100%", padding: "11px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.35)",
        fontSize: "13px", fontWeight: 700,
        cursor: "pointer", fontFamily: "var(--font-heebo), var(--font-heebo), 'Heebo', sans-serif",
    },
};

const KF = `
@keyframes overlayIn  { from{opacity:0} to{opacity:1} }
@keyframes sheetUp    { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes iconPop    { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes iconFloat  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-6px) rotate(1deg)} }
@keyframes glowPulse  { 0%,100%{opacity:0.7} 50%{opacity:1.0} }
@keyframes fadeUp     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

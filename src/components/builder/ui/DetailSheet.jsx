import { NUTRI } from "../../../data/salad-data.js";

export default function DetailSheet({ item, onClose }) {
    const n = NUTRI[item.id];

    // Scale bars relative to the largest value in this item
    const maxVal = n ? Math.max(n.p || 0, n.c || 0, n.f || 0, n.fb || 0, 1) : 1;
    const barPct = (val) => `${Math.max(Math.round((val / maxVal) * 100), 3)}%`;

    const nutrients = n && n.kcal > 0 ? [
        { label: "חלבון",    val: n.p,  unit: "g", color: "#c8a832", track: "rgba(200,168,78,0.12)" },
        { label: "פחמימות", val: n.c,  unit: "g", color: "#4caf82", track: "rgba(76,175,130,0.1)" },
        { label: "שומן",     val: n.f,  unit: "g", color: "#64b5f6", track: "rgba(100,181,246,0.1)" },
        { label: "סיבים",   val: n.fb, unit: "g", color: "#a5d6a7", track: "rgba(165,214,167,0.1)" },
    ] : [];

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
                {/* drag handle */}
                <div style={S.handle} />

                {/* Hero header */}
                <div style={S.hero}>
                    <div style={S.heroIcon}>{item.icon}</div>
                    <div style={S.heroGlow} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={S.heroName}>{item.he}</div>
                        {item.desc && <div style={S.heroDesc}>{item.desc}</div>}
                        {item.price > 0 && (
                            <div style={S.priceBadge}>+₪{item.price}</div>
                        )}
                    </div>
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

                {/* Divider */}
                {n?.fact && <div style={S.divider} />}

                {/* Fun fact */}
                {n?.fact && (
                    <div style={S.factBox}>
                        <div style={S.factTitle}>💡 הידעת?</div>
                        <div style={S.factText}>{n.fact}</div>
                    </div>
                )}

                <button onClick={onClose} style={S.closeBtn}>סגור</button>
            </div>
            <style>{KF}</style>
        </div>
    );
}

const S = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        animation: "overlayIn 0.2s ease",
    },
    sheet: {
        width: "100%", maxWidth: "430px",
        padding: "0 0 28px",
        borderRadius: "22px 22px 0 0",
        background: "linear-gradient(175deg, rgba(18,52,18,0.99) 0%, rgba(10,32,10,0.99) 100%)",
        border: "1px solid rgba(200,168,78,0.2)",
        borderBottom: "none",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
        animation: "sheetUp 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        fontFamily: "'Heebo',sans-serif",
        direction: "rtl",
        overflow: "hidden",
    },

    handle: {
        width: "36px", height: "4px", borderRadius: "2px",
        background: "rgba(255,255,255,0.15)",
        margin: "12px auto 0",
    },

    hero: {
        position: "relative",
        display: "flex", alignItems: "center", gap: "14px",
        padding: "16px 20px 14px",
        overflow: "hidden",
    },
    heroIcon: {
        fontSize: "44px", lineHeight: 1, flexShrink: 0,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        position: "relative", zIndex: 1,
        animation: "iconPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
    },
    heroGlow: {
        position: "absolute", top: 0, right: 0,
        width: "120px", height: "120px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,168,78,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
    },
    heroName: {
        fontSize: "19px", fontWeight: 900, color: "#e8f5e9",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
    },
    heroDesc: {
        fontSize: "12px", color: "rgba(255,255,255,0.5)",
        marginTop: "2px", fontWeight: 500, lineHeight: 1.4,
    },
    priceBadge: {
        display: "inline-block", marginTop: "5px",
        fontSize: "12px", fontWeight: 800, color: "#edd87e",
        background: "rgba(200,168,78,0.15)",
        border: "1px solid rgba(200,168,78,0.3)",
        padding: "2px 10px", borderRadius: "8px",
    },

    kcalRow: {
        padding: "0 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
    },
    kcalPill: {
        display: "inline-flex", alignItems: "baseline", gap: "4px",
        padding: "6px 14px", borderRadius: "12px",
        background: "linear-gradient(135deg, rgba(200,168,78,0.15), rgba(200,168,78,0.06))",
        border: "1px solid rgba(200,168,78,0.3)",
    },
    kcalNum: {
        fontSize: "26px", fontWeight: 900, color: "#f0d060",
        textShadow: "0 0 16px rgba(200,168,78,0.5)",
    },
    kcalUnit: { fontSize: "13px", fontWeight: 700, color: "rgba(200,168,78,0.7)" },
    kcalSub: { fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.3)", marginRight: "4px" },

    nutriSection: { padding: "14px 20px 10px" },
    nutriTitle: {
        fontSize: "10px", fontWeight: 800,
        color: "rgba(255,255,255,0.3)",
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
        height: "1px", margin: "2px 20px 12px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.2), transparent)",
    },

    factBox: {
        margin: "0 16px", padding: "12px 14px", borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(200,168,78,0.08), rgba(200,168,78,0.03))",
        border: "1px solid rgba(200,168,78,0.15)",
    },
    factTitle: {
        fontSize: "10px", fontWeight: 800,
        color: "rgba(200,168,78,0.65)",
        marginBottom: "5px", letterSpacing: "0.04em",
    },
    factText: {
        fontSize: "12px", color: "rgba(255,255,255,0.7)",
        lineHeight: 1.65, fontWeight: 500,
    },

    closeBtn: {
        display: "block", width: "calc(100% - 32px)", margin: "16px 16px 0",
        padding: "12px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.5)",
        fontSize: "14px", fontWeight: 700,
        cursor: "pointer", fontFamily: "'Heebo',sans-serif",
        transition: "background 0.15s",
    },
};

const KF = `
@keyframes overlayIn  { from{opacity:0} to{opacity:1} }
@keyframes sheetUp    { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes iconPop    { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
@keyframes barGrow    { from{width:0} }
`;

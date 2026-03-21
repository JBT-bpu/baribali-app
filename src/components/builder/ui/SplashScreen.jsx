'use client';
import { useState, useEffect } from "react";

const logoImage = "/builder-assets/logo-alpha.png";

export default function SplashScreen({ onDone }) {
    const [phase, setPhase] = useState("in"); // in → hold → out

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("hold"), 800);
        const t2 = setTimeout(() => setPhase("out"),  2000);
        const t3 = setTimeout(() => onDone(),          2600);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onDone]);

    return (
        <div style={{
            ...S.root,
            opacity: phase === "out" ? 0 : 1,
            transform: phase === "out" ? "scale(1.04)" : "scale(1)",
            transition: phase === "out"
                ? "opacity 0.55s ease-in, transform 0.55s ease-in"
                : "none",
        }}>
            {/* deep radial ambient */}
            <div style={S.ambient} />
            <div style={{
                ...S.ambientPulse,
                animation: phase === "hold" ? "splashPulse 2s ease-in-out infinite" : "none",
            }} />

            {/* logo */}
            <div style={{
                ...S.logoWrap,
                opacity: phase === "in" ? 0 : 1,
                transform: phase === "in" ? "scale(0.86)" : "scale(1)",
                transition: "opacity 0.7s ease-out, transform 0.7s cubic-bezier(0.34,1.3,0.64,1)",
            }}>
                <img
                    src={logoImage}
                    alt="BariBali"
                    style={S.logo}
                    draggable={false}
                />
                {/* gold glow ring under logo */}
                <div style={{
                    ...S.logoGlow,
                    opacity: phase === "hold" ? 1 : 0,
                    transition: "opacity 0.5s ease 0.2s",
                }} />
            </div>

            {/* brand name */}
            <div style={{
                ...S.brandName,
                opacity: phase === "in" ? 0 : 1,
                transform: phase === "in" ? "translateY(10px)" : "translateY(0)",
                transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
            }}>
                <span style={S.brandText}>BARIBALI</span>
                <div style={S.brandUnderline} />
            </div>

            {/* tagline */}
            <div style={{
                ...S.tagline,
                opacity: phase === "hold" ? 1 : 0,
                transition: "opacity 0.6s ease 0.1s",
            }}>
                בנה את הסלט שלך
            </div>

            <style>{KF}</style>
        </div>
    );
}

const S = {
    root: {
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(160deg, #020802 0%, #061306 40%, #09180a 70%, #061306 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Heebo', sans-serif",
        userSelect: "none",
    },
    ambient: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 48%, rgba(200,168,78,0.07) 0%, transparent 70%)",
    },
    ambientPulse: {
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 40% at 50% 48%, rgba(200,168,78,0.06) 0%, transparent 65%)",
    },

    logoWrap: {
        position: "relative",
        width: "180px", height: "180px",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "4px",
    },
    logo: {
        width: "160px", height: "160px",
        objectFit: "contain",
        filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(200,168,78,0.2))",
        position: "relative", zIndex: 1,
    },
    logoGlow: {
        position: "absolute", inset: "-20px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,168,78,0.12) 0%, rgba(200,168,78,0.04) 50%, transparent 70%)",
        animation: "splashGlow 2.5s ease-in-out infinite",
        pointerEvents: "none",
    },

    brandName: {
        textAlign: "center", marginTop: "8px",
    },
    brandText: {
        fontSize: "22px", fontWeight: 900, letterSpacing: "0.22em",
        backgroundImage: "linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe599 55%, #c8a832 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        animation: "shimmerSweep 3s linear 0.5s infinite",
    },
    brandUnderline: {
        height: "1px", marginTop: "6px",
        background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.5), transparent)",
        animation: "underlineGrow 0.6s ease 0.5s both",
    },

    tagline: {
        marginTop: "14px",
        fontSize: "13px", fontWeight: 500,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.06em",
    },
};

const KF = `
@keyframes splashPulse {
    0%,100% { opacity: 0.6; }
    50%     { opacity: 1; }
}
@keyframes splashGlow {
    0%,100% { transform: scale(1);    opacity: 0.8; }
    50%     { transform: scale(1.12); opacity: 1; }
}
@keyframes shimmerSweep {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
}
@keyframes underlineGrow {
    from { transform: scaleX(0); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
}
`;

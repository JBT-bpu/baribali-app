'use client';

import ParticleCanvas from './ParticleCanvas';

interface ComingSoonProps {
    icon: string;
    title: string;
}

export default function ComingSoon({ icon, title }: ComingSoonProps) {
    return (
        <>
            <style>{`
                @keyframes fadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmer {
                    0% {
                        background-position: -200% center;
                    }
                    100% {
                        background-position: 200% center;
                    }
                }
                @keyframes pulse {
                    0%, 100% {
                        filter: drop-shadow(0 0 8px rgba(240, 208, 96, 0.3));
                        transform: scale(1);
                    }
                    50% {
                        filter: drop-shadow(0 0 24px rgba(240, 208, 96, 0.6));
                        transform: scale(1.05);
                    }
                }
            `}</style>
            <ParticleCanvas intensity="medium" />
            <div
                style={{
                    minHeight: '100vh',
                    background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
                    fontFamily: "'Heebo', sans-serif",
                    direction: 'rtl',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        animation: 'fadeUp 0.8s ease-out forwards',
                        opacity: 0,
                        marginBottom: '48px',
                        fontSize: '28px',
                        fontWeight: 800,
                        color: '#f0d060',
                        letterSpacing: '1px',
                    }}
                >
                    🥗 BariBali
                </div>

                {/* Page Icon */}
                <div
                    style={{
                        animation: 'pulse 3s ease-in-out infinite, fadeUp 0.8s ease-out 0.2s forwards',
                        opacity: 0,
                        fontSize: '72px',
                        marginBottom: '24px',
                    }}
                >
                    {icon}
                </div>

                {/* Page Title */}
                <h1
                    style={{
                        animation: 'fadeUp 0.8s ease-out 0.4s forwards',
                        opacity: 0,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#ffffff',
                        margin: '0 0 16px 0',
                    }}
                >
                    {title}
                </h1>

                {/* Coming Soon Subtitle */}
                <div
                    style={{
                        animation: 'fadeUp 0.8s ease-out 0.6s forwards',
                        opacity: 0,
                        fontSize: '24px',
                        fontWeight: 600,
                        background: 'linear-gradient(90deg, #f0d060, #ffe08a, #f0d060, #c9a83c, #f0d060)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        // @ts-expect-error - textFillColor for non-webkit browsers
                        textFillColor: 'transparent',
                        animationName: 'fadeUp, shimmer',
                        animationDuration: '0.8s, 3s',
                        animationTimingFunction: 'ease-out, linear',
                        animationDelay: '0.6s, 0.6s',
                        animationIterationCount: '1, infinite',
                        animationFillMode: 'forwards, none',
                        marginBottom: '48px',
                    }}
                >
                    בקרוב...
                </div>

                {/* Back to Home Button */}
                <a
                    href="/"
                    style={{
                        animation: 'fadeUp 0.8s ease-out 0.8s forwards',
                        opacity: 0,
                        display: 'inline-block',
                        padding: '12px 36px',
                        borderRadius: '50px',
                        border: '2px solid #f0d060',
                        color: '#f0d060',
                        fontSize: '16px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontFamily: "'Heebo', sans-serif",
                        transition: 'all 0.3s ease',
                        background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(240, 208, 96, 0.15)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    חזור לדף הבית
                </a>
            </div>
        </>
    );
}

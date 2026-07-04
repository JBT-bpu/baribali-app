'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface Props {
    onClose: () => void;
}

export default function CatPopup({ onClose }: Props) {
    const [visible, setVisible] = useState(false);
    const [anim, setAnim] = useState<object | null>(null);

    useEffect(() => {
        // Slide in after mount
        const t = setTimeout(() => setVisible(true), 60);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        fetch('/cat-salad.json').then(r => r.json()).then(setAnim).catch(() => {});
    }, []);

    function dismiss() {
        setVisible(false);
        setTimeout(onClose, 380);
    }

    return (
        <div
            onClick={dismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.38s ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '310px',
                    background: 'linear-gradient(160deg, rgba(4,16,4,0.97) 0%, rgba(8,28,8,0.97) 100%)',
                    border: '1.5px solid rgba(240,200,50,0.25)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(240,200,50,0.08)',
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
                    transition: 'transform 0.4s cubic-bezier(0.34,1.4,0.64,1)',
                    fontFamily: "'Heebo', sans-serif",
                    direction: 'rtl',
                }}
            >
                {/* Lottie animation */}
                <div style={{ background: 'rgba(240,200,50,0.04)', padding: '8px 8px 0' }}>
                    {anim && (
                        <Lottie
                            animationData={anim}
                            loop
                            autoplay
                            style={{ width: '100%', height: '220px' }}
                        />
                    )}
                </div>

                {/* Text content */}
                <div style={{ padding: '16px 22px 22px', textAlign: 'center' }}>
                    <div style={{
                        fontSize: '20px', fontWeight: 900, color: '#f0d060',
                        textShadow: '0 2px 12px rgba(240,200,50,0.4)',
                        marginBottom: '6px',
                    }}>
                        מוכן לסלט? 🥗
                    </div>
                    <div style={{
                        fontSize: '13px', fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.65,
                        marginBottom: '18px',
                    }}>
                        בנה את הסלט שלך בדיוק כמו שאתה אוהב
                    </div>

                    {/* Divider */}
                    <div style={{ width: '40px', height: '1.5px', background: 'linear-gradient(90deg,transparent,rgba(240,200,50,0.4),transparent)', margin: '0 auto 18px' }} />

                    {/* CTA */}
                    <button
                        onClick={dismiss}
                        style={{
                            width: '100%', padding: '13px 0',
                            borderRadius: '50px',
                            background: 'linear-gradient(135deg,#c8a832 0%,#f0d060 45%,#ffe066 55%,#c8a832 100%)',
                            border: 'none', cursor: 'pointer',
                            fontSize: '15px', fontWeight: 900, color: '#1a0e00',
                            fontFamily: "'Heebo', sans-serif",
                            boxShadow: '0 4px 20px rgba(240,200,50,0.35)',
                        }}
                    >
                        בואו נתחיל ←
                    </button>
                </div>
            </div>
        </div>
    );
}

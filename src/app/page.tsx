'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import LegalLinks from '@/components/legal/LegalLinks';
import { BariButton } from '@/components/ui/bari';
import { useUser } from '@/lib/auth';
import { usePrefersReducedMotion } from '@/lib/motionHooks';

/**
 * The app's front door. A short (~1.2s) brand animation that doubles as an
 * auth-check cover, then resolves into two choices: join the club (Google) or
 * continue as guest. Guest-first — the club is the hero, guest is a clear,
 * unpunished alternative. Shown every visit until sign-in (sessionStorage
 * `bb-welcome-done`, same flag the old home2 welcome overlay used); returning
 * guests and signed-in members skip straight to /home2 with no animation/gate.
 */
export default function EntryPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const reducedMotion = usePrefersReducedMotion();

    const [started, setStarted]   = useState(false);  // mount ran, not short-circuited
    const [introDone, setIntroDone] = useState(false);
    const [leaving, setLeaving]   = useState(false);

    // Decide on mount: returning guest → straight in; else run the door.
    useEffect(() => {
        if (sessionStorage.getItem('bb-welcome-done')) {
            router.replace('/home2');
            return;
        }
        setStarted(true);
        if (reducedMotion) { setIntroDone(true); return; }
        const t = setTimeout(() => setIntroDone(true), 1200);
        return () => clearTimeout(t);
    }, [router, reducedMotion]);

    // Signed-in members never see the gate.
    useEffect(() => {
        if (!started || loading) return;
        if (user) router.replace('/home2');
    }, [started, loading, user, router]);

    const continueAsGuest = useCallback(() => {
        sessionStorage.setItem('bb-welcome-done', '1');
        navigator.vibrate?.(12);
        setLeaving(true);
        router.push('/home2');
    }, [router]);

    const showChoose = started && !loading && !user && introDone;

    return (
        <div
            onClick={() => { if (started && !introDone) setIntroDone(true); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '20px', padding: '28px', direction: 'rtl',
                fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                background: 'url(/homepage-assets/BG_8K.webp) center center / cover no-repeat, #020a02',
                overflow: 'hidden', userSelect: 'none',
                opacity: leaving ? 0 : 1,
                transition: 'opacity 0.4s ease',
            }}
        >
            <style>{`
                @keyframes fdLogoForge { from{opacity:0;transform:scale(0.82) translateY(8px)} to{opacity:1;transform:none} }
                @keyframes fdGlowPulse { 0%,100%{opacity:0.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
                @keyframes fdShimmer   { 0%{background-position:0% center} 100%{background-position:200% center} }
                @keyframes fdRiseIn    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
                @keyframes fdEyebrow   { from{opacity:0;letter-spacing:0.5em} to{opacity:1;letter-spacing:0.28em} }
            `}</style>

            {/* Darkening gradient so the content reads over the photo bg */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 45%, rgba(2,10,2,0.82) 100%)' }} />
            <ParticleCanvas intensity="medium" />

            {/* Logo + gold glow ring */}
            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: reducedMotion ? 'none' : 'fdLogoForge 0.9s cubic-bezier(0.34,1.3,0.64,1) both',
            }}>
                <div aria-hidden style={{
                    position: 'absolute', inset: '-30px', borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle, rgba(200,168,78,0.22) 0%, rgba(200,168,78,0.06) 50%, transparent 72%)',
                    animation: reducedMotion ? 'none' : 'fdGlowPulse 2.6s ease-in-out infinite',
                }} />
                <Image src="/homepage-assets/logo.webp" alt="BariBali" width={220} height={140} priority
                    style={{ width: '168px', height: 'auto', position: 'relative', filter: 'drop-shadow(0 0 30px rgba(240,200,50,0.45)) drop-shadow(0 6px 18px rgba(0,0,0,0.7))' }} />
            </div>

            {/* Club eyebrow */}
            <div style={{
                position: 'relative', zIndex: 1, marginTop: '-6px',
                fontSize: '12px', fontWeight: 800, letterSpacing: '0.28em',
                backgroundImage: 'linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe599 55%, #c8a832 100%)',
                backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: reducedMotion ? 'none' : 'fdEyebrow 0.8s ease 0.4s both, fdShimmer 3s linear 0.8s infinite',
            }}>
                מועדון BariBali
            </div>

            {/* Choose block — rises in once the intro settles & auth resolves signed-out */}
            {showChoose && (
                <div style={{
                    position: 'relative', zIndex: 1, width: '100%', maxWidth: '320px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    marginTop: '6px',
                    animation: reducedMotion ? 'none' : 'fdRiseIn 0.5s cubic-bezier(0.22,1.2,0.36,1) both',
                }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.7 }}>
                        חברי מועדון שומרים היסטוריית הזמנות
                        <br />ומזמינים שוב בלחיצה אחת.
                    </div>

                    <GoogleSignInButton fullWidth label="הצטרפו למועדון עם Google" />

                    <BariButton variant="secondary" fullWidth onClick={continueAsGuest} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                        המשך כאורח ←
                    </BariButton>

                    <div style={{ textAlign: 'center' }}><LegalLinks /></div>
                </div>
            )}

            {/* Reserve space during the intro so the logo doesn't jump when the choices arrive */}
            {!showChoose && <div style={{ height: '188px' }} aria-hidden />}
        </div>
    );
}

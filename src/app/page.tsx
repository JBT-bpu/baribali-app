'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GoldField from '@/components/ui/GoldField';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import LegalLinks from '@/components/legal/LegalLinks';
import { BariButton } from '@/components/ui/bari';
import { useUser } from '@/lib/auth';
import { usePrefersReducedMotion } from '@/lib/motionHooks';

/**
 * The app's front door — a members'-club entrance. A short (~1.2s) brand forge
 * that doubles as an auth-check cover, then a frosted "concierge" panel resolves
 * in with two equally-weighted choices: join the club (Google) or continue as
 * guest. Guest-first — the club is the hero framing, guest is a clear, unpunished
 * alternative that never costs a feature.
 *
 * The gate stays on for every entry until the user actually signs in: only
 * signed-in members skip straight to /home2. Guests see it each time they enter
 * (deep links / internal nav go to /home2, so it isn't re-triggered mid-session).
 *
 * Robustness: the guest choice is never held hostage by the auth check — if the
 * session lookup stalls (flaky network, stale token refresh), a 2.5s fallback
 * reveals the choice anyway. A user who turns out to be signed in is redirected
 * the moment auth resolves, so the brief reveal is harmless.
 */
export default function EntryPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const reducedMotion = usePrefersReducedMotion();

    const [started, setStarted]     = useState(false);  // mount ran
    const [introDone, setIntroDone] = useState(false);
    const [authWaited, setAuthWaited] = useState(false); // fallback so the door never hangs
    const [leaving, setLeaving]     = useState(false);

    // Run the door on mount (play the intro; auth resolves underneath).
    useEffect(() => {
        setStarted(true);
        if (reducedMotion) { setIntroDone(true); return; }
        const t = setTimeout(() => setIntroDone(true), 1200);
        return () => clearTimeout(t);
    }, [reducedMotion]);

    // Never let a stalled auth lookup trap a guest on the door.
    useEffect(() => {
        const t = setTimeout(() => setAuthWaited(true), 2500);
        return () => clearTimeout(t);
    }, []);

    // Signed-in members never see the gate; everyone else stays on the door.
    useEffect(() => {
        if (!started || loading) return;
        if (user) router.replace('/home2');
    }, [started, loading, user, router]);

    const continueAsGuest = useCallback(() => {
        navigator.vibrate?.(12);
        setLeaving(true);
        router.push('/home2');
    }, [router]);

    const authKnown = !loading || authWaited;
    const showChoose = started && introDone && authKnown && !user;

    return (
        <div
            onClick={() => { if (started && !introDone) setIntroDone(true); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '18px', padding: '28px', direction: 'rtl',
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
                @keyframes fdSheen     { from{transform:translateX(-160%) skewX(-16deg)} to{transform:translateX(280%) skewX(-16deg)} }
                @keyframes fdShimmer   { 0%{background-position:0% center} 100%{background-position:200% center} }
                @keyframes fdRiseIn    { from{opacity:0;transform:translateY(18px) scale(0.98)} to{opacity:1;transform:none} }
                @keyframes fdItemIn    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
                @keyframes fdEyebrow   { from{opacity:0;letter-spacing:0.5em} to{opacity:1;letter-spacing:0.28em} }
                @keyframes fdDraw      { from{width:0;opacity:0} to{width:52px;opacity:1} }
            `}</style>

            {/* Darkening gradient so the content reads over the photo bg */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.55) 45%, rgba(2,10,2,0.86) 100%)' }} />
            <GoldField zIndex={0} />

            {/* Logo + gold glow ring + one-time sheen sweep */}
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
                {/* Gold light sweep — fires once as the logo settles */}
                {!reducedMotion && (
                    <div aria-hidden style={{
                        position: 'absolute', top: '-4px', left: '50%', width: '168px', height: '116px',
                        transform: 'translateX(-50%)', overflow: 'hidden', borderRadius: '10px', pointerEvents: 'none',
                    }}>
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0, width: '55%',
                            background: 'linear-gradient(100deg, transparent 0%, rgba(255,246,210,0.0) 35%, rgba(255,248,220,0.55) 50%, rgba(255,246,210,0.0) 65%, transparent 100%)',
                            mixBlendMode: 'screen',
                            animation: 'fdSheen 1.05s ease 1.15s both',
                        }} />
                    </div>
                )}
            </div>

            {/* Club eyebrow */}
            <div style={{
                position: 'relative', zIndex: 1, marginTop: '-4px',
                fontSize: '12px', fontWeight: 800, letterSpacing: '0.28em',
                backgroundImage: 'linear-gradient(135deg, #c8a832 0%, #f0d060 45%, #ffe599 55%, #c8a832 100%)',
                backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: reducedMotion ? 'none' : 'fdEyebrow 0.8s ease 0.4s both, fdShimmer 3s linear 0.8s infinite',
            }}>
                מועדון BariBali
            </div>

            {/* Concierge choice panel — rises in once the intro settles & auth resolves signed-out */}
            {showChoose && (
                <div style={{
                    position: 'relative', zIndex: 1, width: '100%', maxWidth: '340px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    marginTop: '2px', padding: '20px 20px 16px',
                    borderRadius: '22px',
                    background: 'linear-gradient(160deg, rgba(10,26,10,0.60) 0%, rgba(4,14,4,0.72) 100%)',
                    border: '1px solid rgba(240,200,50,0.26)',
                    backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                    boxShadow: '0 22px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(240,200,50,0.07)',
                    animation: reducedMotion ? 'none' : 'fdRiseIn 0.55s cubic-bezier(0.22,1.2,0.36,1) both',
                }}>
                    {/* Welcome headline */}
                    <div style={{
                        fontFamily: "var(--font-display), 'Secular One', sans-serif",
                        fontSize: '22px', color: '#fff', letterSpacing: '0.01em',
                        textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 22px rgba(200,168,78,0.35)',
                        animation: reducedMotion ? 'none' : 'fdItemIn 0.5s ease 0.12s both',
                    }}>
                        ברוכים הבאים
                    </div>

                    {/* Drawn gold divider */}
                    <div aria-hidden style={{
                        height: '1.5px', background: 'linear-gradient(90deg, transparent, rgba(240,200,50,0.6), transparent)',
                        animation: reducedMotion ? 'none' : 'fdDraw 0.5s ease 0.22s both', width: reducedMotion ? '52px' : 0,
                    }} />

                    {/* Member benefits — short, three-beat */}
                    <div style={{
                        fontSize: '12.5px', color: 'rgba(255,255,255,0.62)', textAlign: 'center', lineHeight: 1.75, fontWeight: 600,
                        animation: reducedMotion ? 'none' : 'fdItemIn 0.5s ease 0.3s both',
                    }}>
                        היסטוריית הזמנות · הזמנה חוזרת בלחיצה
                        <br />הטבות חברים קבועות
                    </div>

                    <div style={{ width: '100%', animation: reducedMotion ? 'none' : 'fdItemIn 0.5s ease 0.42s both' }}>
                        <GoogleSignInButton fullWidth label="הצטרפו למועדון עם Google" />
                    </div>

                    <div style={{ width: '100%', animation: reducedMotion ? 'none' : 'fdItemIn 0.5s ease 0.52s both' }}>
                        <BariButton variant="secondary" fullWidth onClick={continueAsGuest} style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                            המשך כאורח ←
                        </BariButton>
                    </div>

                    <div style={{ textAlign: 'center', animation: reducedMotion ? 'none' : 'fdItemIn 0.5s ease 0.62s both' }}>
                        <LegalLinks />
                    </div>
                </div>
            )}

            {/* Reserve space during the intro so the logo doesn't jump when the panel arrives */}
            {!showChoose && <div style={{ height: '236px' }} aria-hidden />}
        </div>
    );
}

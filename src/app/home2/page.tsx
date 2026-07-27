'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'lucide-react';
import ReviewsStrip from '@/components/ui/ReviewsStrip';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import GoldField from '@/components/ui/GoldField';
import HeroSelector from '@/components/home/HeroSelector';
import SizePicker from '@/components/home/SizePicker';
import { BariButton, BariModal, BariGlowBackground, BariBottomNav } from '@/components/ui/bari';
import { usePrefersReducedMotion } from '@/lib/motionHooks';
import { useUser, avatarUrl, getAccessToken } from '@/lib/auth';
import { buildReorderHref, stashReorder } from '@/lib/reorder';

// The product pick is the hero-select roster (HeroSelector); choosing the salad
// hero opens the shared SizePicker overlay (also used by the builder).

// Minimal shape of a past order we need to surface a one-tap reorder.
interface HistoryOrder {
    id: string;
    items: { id: string; he: string; icon: string; price: number }[];
    total: number;
    size: string | null;
}


// ─── Members' one-tap reorder strip ────────────────────────────────────────────
// Only shown to signed-in members with history — the concrete club payoff, right
// on the landing. Reuses the same reorder plumbing as /orders (stash + build href).
function ReorderStrip({ order, onReorder }: { order: HistoryOrder; onReorder: () => void }) {
    return (
        <button
            type="button"
            onClick={onReorder}
            style={{
                width: '100%', maxWidth: '360px',
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '16px', cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(200,168,78,0.16), rgba(200,168,78,0.06))',
                border: '1px solid rgba(240,200,50,0.32)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
                animation: 'labelIn 0.5s ease 0.1s both',
            }}
        >
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🔁</span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f0d060' }}>הזמן שוב בלחיצה</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ההזמנה האחרונה שלך · ₪{order.total}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                {order.items.slice(0, 4).map((it, idx) => (
                    it.icon && it.icon.startsWith('/')
                        ? <img key={idx} src={it.icon} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                        : <span key={idx} style={{ fontSize: '15px' }}>{it.icon}</span>
                ))}
            </div>
            <span style={{ fontSize: '16px', color: '#f0d060', flexShrink: 0 }}>←</span>
        </button>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeV2() {
    const router = useRouter();
    const { user } = useUser();
    const reducedMotion = usePrefersReducedMotion();

    // ── Screen state ──
    const [sizePicker, setSizePicker] = useState(false);
    const [loginSheet, setLoginSheet] = useState(false);
    const [ready, setReady]           = useState(false);
    const [lastOrder, setLastOrder]   = useState<HistoryOrder | null>(null);
    const [heroIdx, setHeroIdx]       = useState(0); // active hero → background parallax
    const nudgeRef = useRef(0); // swipe impulse shared with the particle field

    // The guest-or-Google gate now lives on the app's front door (src/app/page.tsx),
    // not as an overlay here.

    useEffect(() => { setReady(true); router.prefetch('/build'); }, [router]);

    // Members get their last order surfaced here for a true one-tap reorder —
    // the club promise ("הזמנה חוזרת בלחיצה") delivered on the first screen.
    // Guests have no history, so nothing shows (guest-first intact).
    useEffect(() => {
        if (!user) return; // guests: nothing to fetch; the strip is gated on `user` in render
        let cancelled = false;
        getAccessToken().then(token => {
            if (!token || cancelled) return;
            fetch('/api/my/orders', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : [])
                .then(data => { if (!cancelled && Array.isArray(data) && data.length) setLastOrder(data[0]); })
                .catch(() => {});
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [user]);

    // Warm the builder while the size picker is open. The route chunk is already
    // prefetched, but its heavy bits (the Lottie runtime, the bowl animation, the
    // header art) were fetched on mount — which is what left a black beat between
    // the wipe covering and the builder painting. Fetching them now means the
    // arrival is mostly just React rendering.
    useEffect(() => {
        if (!sizePicker) return;
        router.prefetch('/build');
        import('lottie-react').catch(() => {});
        fetch('/cat-salad-bowl.json').catch(() => {});
        for (const src of ['/builder-assets/header-brand.png', '/builder-assets/footer-brand.png']) {
            const img = new window.Image();
            img.src = src;
        }
    }, [sizePicker, router]);

    const reorderLast = useCallback(() => {
        if (!lastOrder) return;
        navigator.vibrate?.([15, 40, 30]);
        stashReorder(lastOrder.items.map(i => i.id), 'same');
        router.push(buildReorderHref(lastOrder));
    }, [lastOrder, router]);

    // Fires at the dive's hand-off — the picker has already played the outbound
    // half from its own field and sealed the screen, so we navigate immediately
    // and the builder resumes the motion from exactly there.
    const handleSizeSelect = useCallback((size: string) => {
        try { sessionStorage.setItem('bb-drop', '1'); } catch { /* private mode — just skip the intro */ }
        // Plain push, deliberately: startViewTransition cross-fades the whole
        // document, which fought the wipe (it read as "fade to black, then the
        // builder appears"). The wipe already covers the swap.
        router.push(`/build?size=${size}`);
    }, [router]);

    if (!ready) return <div style={{ minHeight: '100vh', background: '#020a02' }} />;

    const avatar = user ? avatarUrl(user) : null;

    return (
        <div style={{
            minHeight: '100vh', width: '100%', position: 'relative',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', overflowX: 'hidden', overflowY: 'auto', userSelect: 'none',
            background: '#020a02',
        }}>
            <style>{`
                @keyframes pageIn   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }
                @keyframes pageOut  { to{opacity:0;transform:scale(0.96)} }
                @keyframes logoIn   { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }
                @keyframes labelIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
                @keyframes glowFade { 0%,100%{opacity:0.5} 50%{opacity:1} }
            `}</style>

            {/* Background photo — a far parallax layer, zoomed for crop headroom,
                that glides as you move through the roster for a sense of 3D space.
                (Offset assumes the 3-hero roster; center index = 1.) */}
            <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url(/homepage-assets/BG_8K.webp)',
                    backgroundSize: 'cover', backgroundPosition: 'center center',
                    transform: `scale(1.18) translateX(${(heroIdx - 1) * 30}px)`,
                    transition: reducedMotion ? 'none' : 'transform 0.75s cubic-bezier(0.2,0.85,0.25,1)',
                    willChange: 'transform',
                }} />
            </div>
            {/* Darkening gradient so foreground content stays legible over the photo */}
            <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.42) 50%, rgba(2,10,2,0.8) 100%)' }} />

            <GoldField impulseRef={nudgeRef} />

            {/* Header: profile chip + centered logo (spacer balances the chip so the logo stays centered) */}
            <div style={{
                position: 'relative', zIndex: 2, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))',
                animation: 'logoIn 0.6s cubic-bezier(0.34,1.3,0.64,1) both',
            }}>
                <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(8); user ? router.push('/profile') : setLoginSheet(true); }}
                    aria-label={user ? 'הפרופיל שלי' : 'התחברות'}
                    style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        border: '2px solid rgba(200,168,78,0.4)', cursor: 'pointer',
                        background: avatar ? `url(${avatar}) center / cover` : 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    }}
                >
                    {!avatar && <User size={17} color="rgba(255,255,255,0.65)" strokeWidth={2.3} />}
                </button>

                <Image src="/homepage-assets/logo.webp" alt="BariBali" width={220} height={140}
                    style={{ width: '150px', height: 'auto', filter: 'drop-shadow(0 0 32px rgba(240,200,50,0.5)) drop-shadow(0 4px 14px rgba(0,0,0,0.65))' }} priority />

                <div style={{ width: '38px', flexShrink: 0 }} aria-hidden />
            </div>

            {/* ── Product hero-select roster (+ members' one-tap reorder) ── */}
            <div style={{
                position: 'relative', zIndex: 2, width: '100%', flex: '1 1 auto',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '4px 16px 0',
                animation: 'pageIn 0.7s cubic-bezier(0.34,1.15,0.64,1) 0.08s both',
            }}>
                {user && lastOrder && <ReorderStrip order={lastOrder} onReorder={reorderLast} />}
                <HeroSelector onChooseSalad={() => setSizePicker(true)} onNudge={(dir) => { nudgeRef.current = dir * 26; }} onActiveChange={setHeroIdx} />
            </div>

            {/* Reviews strip */}
            <ReviewsStrip />

            {/* Bottom Nav */}
            <BariBottomNav />


            {/* Size picker overlay */}
            {sizePicker && <SizePicker onSelect={handleSizeSelect} onBack={() => setSizePicker(false)} dive />}

            {/* Login bottom sheet — a quick, in-place offer, never a gate.
                Reachable from the header profile chip; ordering never routes
                through here. */}
            <BariModal open={loginSheet} onClose={() => setLoginSheet(false)} variant="sheet">
                <div style={{
                    position: 'relative',
                    padding: '8px 24px max(28px, env(safe-area-inset-bottom))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                }}>
                    <BariGlowBackground />
                    <Image src="/homepage-assets/card-login.png" alt="" width={160} height={200} style={{ width: '110px', height: 'auto', position: 'relative' }} />
                    <div style={{ position: 'relative', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.7, maxWidth: '250px', fontWeight: 600 }}>
                        שמור היסטוריית הזמנות · כניסה מהירה בפעם הבאה
                    </div>
                    <GoogleSignInButton />
                    <BariButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setLoginSheet(false)}
                        style={{ position: 'relative', border: 'none', color: 'rgba(255,255,255,0.4)', fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}
                    >
                        ביטול
                    </BariButton>
                </div>
            </BariModal>
        </div>
    );
}

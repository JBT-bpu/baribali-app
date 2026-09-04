'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import BariBaliBuilder from '@/components/builder/BariBaliBuilder';
import GoldField from '@/components/ui/GoldField';
import { BariBadge, BariPanel } from '@/components/ui/bari';
import { BUILDER_VEIL_Z, DropSettle, DropCover, SWEEP } from '@/components/transition/BowlDrop';
import { isOrderableProduct, type OrderProduct } from '@/lib/orderRules';
import {
    persistBuilderNavigationFromHome,
    readBuilderNavigationFromHome,
} from '@/lib/builderNavigation';

function BuildLoadingFallback() {
    return (
        <div style={{ minHeight: '100dvh', background: '#020a02' }}>
            <DropCover />
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: 'fixed', inset: 0, zIndex: BUILDER_VEIL_Z + 1,
                    pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxSizing: 'border-box', direction: 'rtl',
                    padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
                }}
            >
                <div style={{
                    width: 'min(240px, calc(100vw - 32px))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                    color: '#f5df88', textAlign: 'center',
                    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                }}>
                    <div aria-hidden="true" style={{
                        width: '44px', height: '44px', borderRadius: '50%', display: 'grid', placeItems: 'center',
                        border: '1px solid rgba(240,208,96,0.7)',
                        boxShadow: '0 0 24px rgba(200,168,50,0.24), inset 0 0 14px rgba(200,168,50,0.1)',
                        fontSize: '20px', lineHeight: 1,
                    }}>✦</div>
                    <div aria-hidden="true" style={{
                        width: '64px', height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(240,208,96,0.85), transparent)',
                    }} />
                    <span style={{ fontSize: '16px', lineHeight: 1.45, fontWeight: 800 }}>
                        טוענים את בונה הסלט…
                    </span>
                </div>
            </div>
        </div>
    );
}

function ProductUnavailable({ requestedType }: { requestedType: string }) {
    const tortilla = requestedType === 'tortilla';

    return (
        <div style={{ position: 'relative', minHeight: '100dvh', overflowX: 'hidden', background: '#020a02' }}>
            <GoldField zIndex={0} density={0.75} />
            <main
                aria-labelledby="product-unavailable-title"
                dir="rtl"
                style={{
                    position: 'relative', zIndex: 1, minHeight: '100dvh',
                    display: 'grid', placeItems: 'center', boxSizing: 'border-box',
                    padding: 'max(24px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
                    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                }}
            >
                <BariPanel
                    highlighted
                    style={{
                        width: 'min(100%, 390px)', padding: '28px 22px', textAlign: 'center',
                        background: 'linear-gradient(180deg, rgba(20,57,20,0.88), rgba(5,20,7,0.92))',
                        boxShadow: '0 24px 70px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,78,0.14)',
                    }}
                >
                    {tortilla && (
                        <div style={{ height: '154px', position: 'relative', margin: '-8px auto 8px' }}>
                            <Image
                                src="/homepage-assets/card-tortilla.png"
                                alt=""
                                fill
                                sizes="(max-width: 430px) 70vw, 300px"
                                priority
                                style={{ objectFit: 'contain', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.42))' }}
                            />
                        </div>
                    )}
                    <BariBadge icon={<span aria-hidden="true">✦</span>}>בקרוב</BariBadge>
                    <h1
                        id="product-unavailable-title"
                        style={{ margin: '16px 0 8px', color: '#fff8dc', fontSize: 'clamp(26px, 8vw, 34px)', lineHeight: 1.15, fontWeight: 900 }}
                    >
                        {tortilla ? 'הטורטייה עדיין בדרך' : 'המנה הזו עדיין לא זמינה'}
                    </h1>
                    <p style={{ margin: '0 auto 24px', maxWidth: '31ch', color: 'rgba(255,250,220,0.78)', fontSize: '16px', lineHeight: 1.6 }}>
                        {tortilla
                            ? 'אנחנו מסיימים להכין אותה. בינתיים אפשר לבנות סלט בדיוק כמו שאוהבים.'
                            : 'כרגע אפשר להזמין את הסלט שלנו מהתפריט.'}
                    </p>
                    <Link
                        href="/home2"
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-gold-bright/50 px-7 py-3.5 text-base font-extrabold text-green-ink transition-transform duration-150 active:scale-[0.97]"
                        style={{
                            textDecoration: 'none',
                            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 42%), linear-gradient(135deg, var(--color-gold-deep) 0%, var(--color-gold-light) 45%, var(--color-gold-bright) 55%, var(--color-gold-deep) 100%)',
                            boxShadow: '0 10px 26px rgba(0,0,0,0.45), var(--shadow-gold-glow-lg), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 3px rgba(120,90,10,0.3)',
                        }}
                    >
                        חזרה לתפריט
                    </Link>
                </BariPanel>
            </main>
        </div>
    );
}

function BuilderExperience({ size, type }: { size: string | null; type: OrderProduct }) {
    // Read during the FIRST render, not in an effect: the covering panel, the
    // field and full opacity all have to exist on the very first painted frame.
    // Setting them from an effect left one frame with no panel over an
    // opacity-0 page — that frame was the black flash. (Read-only here; the flag
    // is consumed in an effect so a double-invoked initializer can't eat it.)
    const [arrived] = useState(() => {
        try { return sessionStorage.getItem('bb-drop') === '1'; } catch { return false; }
    });
    const [enteredFromHome] = useState(readBuilderNavigationFromHome);
    const [visible, setVisible] = useState(false);
    // Panel covers from frame one when arriving, and holds until the page paints.
    const [settling, setSettling] = useState(arrived);
    const [revealing, setRevealing] = useState(false);
    // The field mounts immediately on an arrival so it can restore the picker's
    // motes and carry their sweep; on a direct visit it can wait.
    const [ambient, setAmbient] = useState(arrived);

    useEffect(() => {
        if (enteredFromHome) persistBuilderNavigationFromHome();
    }, [enteredFromHome]);

    useEffect(() => {
        if (arrived) { try { sessionStorage.removeItem('bb-drop'); } catch { /* ignore */ } }

        const timers: number[] = [];
        const rafs: number[] = [];
        const id = requestAnimationFrame(() => {
            setVisible(true);
            if (!arrived) { timers.push(window.setTimeout(() => setAmbient(true), 200)); return; }

            // Two frames: the builder's tree has committed and been painted, so
            // the wipe reveals a finished page instead of an empty one.
            const reveal = () => {
                setRevealing(true);
                timers.push(window.setTimeout(() => setSettling(false), 700));
            };
            rafs.push(requestAnimationFrame(() => { rafs.push(requestAnimationFrame(reveal)); }));
            // Safety net: never leave the panel up if a frame is missed.
            timers.push(window.setTimeout(reveal, 1200));
        });
        return () => {
            cancelAnimationFrame(id);
            rafs.forEach(cancelAnimationFrame);
            timers.forEach(clearTimeout);
        };
    }, [arrived]);

    return (
        <div style={{
            // Arriving from the transition the wrapper stays put — the builder's
            // own regions rise into place in sequence instead (see `entrance`),
            // which carries the upward motion into the UI rather than sliding the
            // whole page as one slab. Never faded in: that read as "black, then
            // it appears".
            opacity: arrived ? 1 : (visible ? 1 : 0),
            transform: arrived || visible ? 'none' : 'translateY(-14px)',
            transition: arrived
                ? 'none'
                : 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.95s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: visible ? 'auto' : 'opacity, transform',
            minHeight: '100dvh',
        }}>
            {/* Same gold field as the landing and the size picker — and arriving
                from the dive it restores that field mote-for-mote (persistKey) and
                carries its rush to a stop, so the motion never actually breaks. */}
            {ambient && <GoldField zIndex={1} entrySweep={arrived ? SWEEP : 0} entryHold={arrived && !revealing} persistKey="bb-field" />}
            <BariBaliBuilder sizeParam={size} type={type} entrance={revealing} skipIntro={arrived} enteredFromHome={enteredFromHome} />
            {settling && <DropSettle exiting={revealing} />}
        </div>
    );
}

function BuilderWithSize() {
    const searchParams = useSearchParams();
    const size = searchParams.get('size');
    const requestedType = searchParams.get('type') ?? 'salad';

    if (!isOrderableProduct(requestedType)) {
        return <ProductUnavailable requestedType={requestedType} />;
    }

    return <BuilderExperience size={size} type={requestedType} />;
}

export default function BuildPage() {
    // Dark fallback matches the landing's portal-dive wash, so a slow load can't
    // flash a bright screen between the two pages.
    return (
        <Suspense fallback={<BuildLoadingFallback />}>
            <BuilderWithSize />
        </Suspense>
    );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BariBaliBuilder from '@/components/builder/BariBaliBuilder';
import GoldField from '@/components/ui/GoldField';
import { DropSettle, DropCover, SWEEP } from '@/components/transition/BowlDrop';

function BuilderWithSize() {
    const searchParams = useSearchParams();
    const size = searchParams.get('size');
    const type = searchParams.get('type') ?? 'salad';
    // Read during the FIRST render, not in an effect: the covering panel, the
    // field and full opacity all have to exist on the very first painted frame.
    // Setting them from an effect left one frame with no panel over an
    // opacity-0 page — that frame was the black flash. (Read-only here; the flag
    // is consumed in an effect so a double-invoked initializer can't eat it.)
    const [arrived] = useState(() => {
        try { return sessionStorage.getItem('bb-drop') === '1'; } catch { return false; }
    });
    const [visible, setVisible] = useState(false);
    // Panel covers from frame one when arriving, and holds until the page paints.
    const [settling, setSettling] = useState(arrived);
    const [revealing, setRevealing] = useState(false);
    // The field mounts immediately on an arrival so it can restore the picker's
    // motes and carry their sweep; on a direct visit it can wait.
    const [ambient, setAmbient] = useState(arrived);

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
            <BariBaliBuilder sizeParam={size ?? null} type={type} entrance={revealing} skipIntro={arrived} />
            {settling && <DropSettle exiting={revealing} />}
        </div>
    );
}

export default function BuildPage() {
    // Dark fallback matches the landing's portal-dive wash, so a slow load can't
    // flash a bright screen between the two pages.
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100dvh', background: '#020a02' }}>
                <DropCover />
            </div>
        }>
            <BuilderWithSize />
        </Suspense>
    );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BariBaliBuilder from '@/components/builder/BariBaliBuilder';
import ParticleCanvas from '@/components/ui/ParticleCanvas';

function BuilderWithSize() {
    const searchParams = useSearchParams();
    const size = searchParams.get('size');
    const type = searchParams.get('type') ?? 'salad';
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // rAF ensures the browser has painted the initial opacity:0 frame first
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'scale(0.95)',
            filter: visible ? 'blur(0px)' : 'blur(4px)',
            transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            minHeight: '100vh',
        }}>
            {/* Atmospheric bokeh blobs — behind UI (zIndex 1) */}
            <ParticleCanvas intensity="medium" mode="bokeh" style={{ zIndex: 1 }} />
            {/* Golden sparks — float over ingredient cards, under modals (zIndex 5) */}
            <ParticleCanvas intensity="low" mode="sparks" style={{ zIndex: 5 }} />
            <BariBaliBuilder sizeParam={size ?? null} type={type} />
        </div>
    );
}

export default function BuildPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1a6006' }} />}>
            <BuilderWithSize />
        </Suspense>
    );
}

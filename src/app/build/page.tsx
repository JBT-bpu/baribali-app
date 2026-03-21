'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BariBaliBuilder from '@/components/builder/BariBaliBuilder';

function BuilderWithSize() {
    const searchParams = useSearchParams();
    const size = searchParams.get('size');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // rAF ensures the browser has painted the initial opacity:0 frame first
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'scale(0.98)',
            transition: 'opacity 0.32s ease, transform 0.32s ease',
            minHeight: '100vh',
        }}>
            <BariBaliBuilder sizeParam={size ?? null} />
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

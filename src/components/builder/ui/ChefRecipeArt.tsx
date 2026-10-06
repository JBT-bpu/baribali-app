'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ChefRecipeArt({ src, fallbackSrc, size = 52 }: { src: string | null; fallbackSrc: string; size?: number }) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const artwork = src && failedSrc !== src ? src : fallbackSrc;
    return <Image src={artwork} alt="" aria-hidden width={size} height={size} sizes={`${size}px`}
        style={{ flexShrink: 0, objectFit: 'contain' }}
        onError={() => { if (src && artwork === src) setFailedSrc(src); }} />;
}

'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ChefRecipeArt({ src, fallbackSrc }: { src: string | null; fallbackSrc: string }) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const artwork = src && failedSrc !== src ? src : fallbackSrc;
    return <Image src={artwork} alt="" aria-hidden width={52} height={52} sizes="52px"
        style={{ flexShrink: 0, objectFit: 'contain' }}
        onError={() => { if (src && artwork === src) setFailedSrc(src); }} />;
}

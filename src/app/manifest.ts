import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'BariBali - בנה סלט כפר',
        short_name: 'BariBali',
        description: 'BariBali - Hebrew salad-building mobile app',
        start_url: '/',
        display: 'standalone',
        background_color: '#020a02',
        theme_color: '#020a02',
        lang: 'he',
        dir: 'rtl',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}

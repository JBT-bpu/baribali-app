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
        // Long-pressing the installed icon opens the staff board directly. Without
        // this the app always starts at the customer door, which is wrong for the
        // kitchen tablet.
        shortcuts: [
            {
                name: 'מטבח BariBali',
                short_name: 'מטבח',
                description: 'לוח ההזמנות של המטבח',
                url: '/kitchen',
                icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
        ],
    };
}

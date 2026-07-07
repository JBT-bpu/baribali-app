import type { Metadata, Viewport } from 'next';
import { Heebo, Secular_One } from 'next/font/google';
import PageTransition from '@/components/PageTransition';
import './globals.css';

// Self-hosted via next/font — zero external request, zero layout shift.
// Exposed as CSS variables (not the literal "Heebo" family name next/font
// generates internally) so both new Tailwind-based components and the
// existing inline-style components can reference the same font.
const heebo = Heebo({
    subsets: ['hebrew', 'latin'],
    weight: ['400', '600', '700', '800', '900'],
    variable: '--font-heebo',
    display: 'swap',
});

const secularOne = Secular_One({
    subsets: ['hebrew', 'latin'],
    weight: '400',
    variable: '--font-display',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'BariBali - בנה סלט כפר',
    description: 'BariBali - Hebrew salad-building mobile app',
    // manifest.ts + icon.png/apple-icon.png (all auto-detected by Next's
    // file-based metadata convention — no manual <link> tags needed) make
    // this installable to a home screen. Deliberately no service worker/
    // offline caching in this pass.
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#020a02',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="he" dir="rtl" className={`${heebo.variable} ${secularOne.variable}`}>
            <body>
                <PageTransition>{children}</PageTransition>
            </body>
        </html>
    );
}

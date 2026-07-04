import type { Metadata, Viewport } from 'next';
import { Heebo, Secular_One } from 'next/font/google';
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
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="he" dir="rtl" className={`${heebo.variable} ${secularOne.variable}`}>
            <body>{children}</body>
        </html>
    );
}

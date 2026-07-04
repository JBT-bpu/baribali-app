import type { Metadata, Viewport } from 'next';
import './globals.css';

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
        <html lang="he" dir="rtl">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                {/*
                  eslint-disable-next-line @next/next/no-page-custom-font --
                  Intentional: dozens of components across the app hardcode
                  fontFamily: "'Heebo', sans-serif" as an inline style, so a
                  next/font/google migration (which generates an internal,
                  non-"Heebo" family name) needs every one of those inline
                  styles rewritten to a CSS variable first. Tracked as part of
                  the Phase E typography pass. Until then, this global link is
                  what makes Heebo actually load on every page instead of only
                  /kitchen.
                */}
                <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    );
}

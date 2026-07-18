'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { useUser } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useUser();

    // Already signed in — go straight to the profile.
    useEffect(() => {
        if (!loading && user) router.replace('/profile');
    }, [loading, user, router]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
            fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
            direction: 'rtl',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '18px', padding: '20px', position: 'relative', overflow: 'hidden',
        }}>
            <ParticleCanvas intensity="medium" />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', maxWidth: '320px', width: '100%' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-gold-light)' }}>🥗 BariBali</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', textAlign: 'center' }}>התחברות</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.7 }}>
                    חשבון שומר את היסטוריית ההזמנות שלכם.
                    <br />
                    <strong style={{ color: 'rgba(255,255,255,0.75)' }}>לא צריך חשבון כדי להזמין</strong> — אפשר תמיד כאורח.
                </div>
                <GoogleSignInButton fullWidth />
                <Link href="/home2" style={{
                    fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none', padding: '10px 24px',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px',
                }}>
                    המשך כאורח ←
                </Link>
            </div>
        </div>
    );
}

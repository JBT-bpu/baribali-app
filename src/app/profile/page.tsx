'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ChevronLeft } from 'lucide-react';
import ParticleCanvas from '@/components/ui/ParticleCanvas';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariPanel, BariButton } from '@/components/ui/bari';
import { useUser, signOut, displayName, avatarUrl } from '@/lib/auth';

const bg: React.CSSProperties = {
    minHeight: '100vh',
    background: 'url(/homepage-assets/bg-bokeh.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)',
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    direction: 'rtl', position: 'relative', overflow: 'hidden',
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading } = useUser();

    if (loading) {
        return <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: 600 }}>טוען…</span>
        </div>;
    }

    if (!user) {
        return (
            <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '20px' }}>
                <ParticleCanvas intensity="medium" />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', width: '100%' }}>
                    <div style={{ fontSize: '48px' }}>👤</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>האזור שלי</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.7 }}>
                        התחברו כדי לשמור את היסטוריית ההזמנות ולהזמין שוב בקלות.
                        <br />להזמין אפשר תמיד גם בלי חשבון.
                    </div>
                    <GoogleSignInButton fullWidth />
                    <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← חזרה לדף הבית</Link>
                </div>
            </div>
        );
    }

    const avatar = avatarUrl(user);

    return (
        <div style={{ ...bg, padding: '0 0 60px' }}>
            <ParticleCanvas intensity="medium" />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '430px', margin: '0 auto', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Identity card */}
                <BariPanel className="p-4" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid rgba(200,168,78,0.5)' }} />
                        : <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,168,78,0.2)', border: '2px solid rgba(200,168,78,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👤</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(user)}</div>
                        {user.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>}
                    </div>
                </BariPanel>

                {/* My Orders — the history lives on its own screen now */}
                <Link href="/orders" style={{ textDecoration: 'none' }}>
                    <BariPanel className="p-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <ClipboardList size={22} color="var(--color-gold-light)" strokeWidth={2.2} />
                        <span style={{ flex: 1, fontSize: '15px', fontWeight: 800, color: '#fff' }}>ההזמנות שלי</span>
                        <ChevronLeft size={20} color="rgba(255,255,255,0.4)" strokeWidth={2.4} />
                    </BariPanel>
                </Link>

                <BariButton variant="ghost" fullWidth onClick={async () => { await signOut(); router.push('/home2'); }}>
                    התנתקות
                </BariButton>

                {/* Legal & info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: '10px' }}>
                    {[
                        { href: '/terms', label: 'תנאי שימוש' },
                        { href: '/privacy', label: 'פרטיות' },
                        { href: '/cancellations', label: 'ביטולים' },
                        { href: '/allergens', label: 'אלרגנים' },
                        { href: '/accessibility', label: 'נגישות' },
                        { href: '/contact', label: 'יצירת קשר' },
                    ].map(l => (
                        <Link key={l.href} href={l.href} style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                            {l.label}
                        </Link>
                    ))}
                </div>

                <Link href="/home2" style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', textAlign: 'center', marginTop: '4px' }}>
                    ← חזרה לדף הבית
                </Link>
            </div>
        </div>
    );
}

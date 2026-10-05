'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, ChevronLeft, UserRound } from 'lucide-react';
import BariJournalArt from '@/components/ui/bari/BariJournalArt';
import GoldField from '@/components/ui/GoldField';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { BariPanel, BariBottomNav, BariButton } from '@/components/ui/bari';
import { useUser, signOut, displayName, avatarUrl } from '@/lib/auth';

const bg: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(1,8,1,0.68) 55%, rgba(2,10,2,0.88) 100%), url(/homepage-assets/BG_8K.webp) center top / cover no-repeat',
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    direction: 'rtl', position: 'relative', overflow: 'hidden',
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading } = useUser();

    if (loading) {
        return <div aria-busy="true" style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="status" aria-live="polite" style={{ color: 'rgba(255,255,255,0.62)', fontSize: '14px', fontWeight: 600 }}>טוען…</span>
            <BariBottomNav />
        </div>;
    }

    if (!user) {
        return (
            <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '20px', paddingBottom: 'calc(106px + env(safe-area-inset-bottom))' }}>
                <GoldField zIndex={0} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', width: '100%' }}>
                    <BariJournalArt />
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#fff' }}>האזור שלי</h1>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.74)', textAlign: 'center', lineHeight: 1.7 }}>
                        התחברו כדי לשמור את היסטוריית ההזמנות ולהזמין שוב בקלות.
                        <br />להזמין אפשר תמיד גם בלי חשבון.
                    </div>
                    <GoogleSignInButton fullWidth />
                    <BariButton fullWidth onClick={() => router.push('/home2')}>להמשיך לתפריט כאורח ←</BariButton>
                </div>
                <BariBottomNav />
            </div>
        );
    }

    const avatar = avatarUrl(user);

    return (
        <div style={{ ...bg, padding: '0 0 calc(106px + env(safe-area-inset-bottom))' }}>
            <GoldField zIndex={0} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '430px', margin: '0 auto', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff' }}>האזור שלי</h1>

                {/* Identity card */}
                <BariPanel ornate className="p-4" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {avatar
                        ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid rgba(200,168,78,0.5)' }} />
                        : <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,168,78,0.2)', border: '2px solid rgba(200,168,78,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={24} color="#ead482" aria-hidden /></div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(user)}</div>
                        {user.email && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>}
                    </div>
                </BariPanel>

                {/* My Orders — the history lives on its own screen now */}
                <Link href="/orders" style={{ textDecoration: 'none' }}>
                    <BariPanel ornate className="p-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
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

            </div>
            <BariBottomNav />
        </div>
    );
}

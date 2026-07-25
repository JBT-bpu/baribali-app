import { cookies } from 'next/headers';
import { adminAuthEnabled, verifyAdminToken, ADMIN_COOKIE } from '@/lib/adminAuth';
import AdminLogin from './AdminLogin';
import AdminBoard from './AdminBoard';

// Always evaluate the guard at request time; never serve a static admin.
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    // Locked entirely unless ADMIN_PASSWORD is configured (it is NOT set on
    // Vercel, so /admin is inert in production and only usable locally).
    if (!adminAuthEnabled()) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0a0a0a', color: 'rgba(255,255,255,0.5)', direction: 'rtl',
                fontFamily: "var(--font-heebo), 'Heebo', sans-serif", padding: '24px', textAlign: 'center',
            }}>
                ניהול אינו זמין בסביבה זו.
            </div>
        );
    }

    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!verifyAdminToken(token)) {
        return <AdminLogin />;
    }
    return <AdminBoard />;
}

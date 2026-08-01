'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BariButton from '@/components/ui/bari/BariButton';

export default function AdminLogin() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) { router.refresh(); return; }
            const data = await res.json().catch(() => ({}));
            setError(data.error || 'ההתחברות נכשלה');
        } catch {
            setError('שגיאת רשת — נסו שוב');
        }
        setBusy(false);
    };

    return (
        <div style={S.root}>
            <form onSubmit={submit} style={S.card}>
                <div style={S.emoji}>🛠️</div>
                <div style={S.title}>ניהול BariBali</div>
                <div style={S.subtitle}>הזינו סיסמת מנהל</div>
                <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="סיסמה"
                    autoFocus
                    autoComplete="current-password"
                    style={{ ...S.input, ...(error ? S.inputError : {}) }}
                />
                {error && <div style={S.error}>{error}</div>}
                <BariButton type="submit" variant="primary" fullWidth disabled={busy || !password}
                    style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", marginTop: '4px' }}>
                    {busy ? 'רגע…' : 'כניסה'}
                </BariButton>
            </form>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100dvh', background: '#0a0a0a',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    },
    card: {
        width: '100%', maxWidth: '340px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '32px 24px', borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    },
    emoji: { fontSize: '40px', lineHeight: 1 },
    title: { fontSize: '22px', fontWeight: 900, color: 'var(--color-gold-light)' },
    subtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' },
    input: {
        width: '100%', padding: '13px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)',
        color: '#fff', fontSize: '16px', fontWeight: 600, textAlign: 'center',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: 'none', letterSpacing: '0.1em',
    },
    inputError: { border: '1.5px solid rgba(229,57,53,0.6)' },
    error: { fontSize: '12px', color: '#ff7575', fontWeight: 700 },
};

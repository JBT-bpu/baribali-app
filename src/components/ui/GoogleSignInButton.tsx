'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * The one Google entry point used everywhere (welcome step, login sheet,
 * /login, /profile). Guest-first: this is always presented as an option,
 * never a gate. Degrades to a disabled hint when Supabase isn't configured
 * (demo deployments).
 */
export default function GoogleSignInButton({ fullWidth = false, label = 'המשך עם Google' }: { fullWidth?: boolean; label?: string }) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const available = isSupabaseConfigured();

    return (
        <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button
                type="button"
                disabled={!available || busy}
                onClick={async () => {
                    setBusy(true);
                    setError(null);
                    const { error: err } = await signInWithGoogle().catch(() => ({ error: new Error('failed') }));
                    if (err) {
                        // Most likely cause: Google provider not yet enabled in
                        // the Supabase dashboard.
                        setError('ההתחברות אינה זמינה כרגע — נסו שוב מאוחר יותר');
                        setBusy(false);
                    }
                    // On success the browser navigates away to Google.
                }}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    width: fullWidth ? '100%' : 'auto',
                    padding: '13px 28px', borderRadius: '50px',
                    background: '#fff', border: 'none',
                    cursor: available ? 'pointer' : 'not-allowed',
                    opacity: available ? (busy ? 0.7 : 1) : 0.5,
                    fontSize: '15px', fontWeight: 800, color: '#1a1a1a',
                    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                }}
            >
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#4285F4' }}>G</span>
                {busy ? 'רגע…' : label}
            </button>
            {!available && (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                    התחברות תהיה זמינה בקרוב
                </span>
            )}
            {error && (
                <span style={{ fontSize: '11px', color: '#ff7575', fontWeight: 600 }}>{error}</span>
            )}
        </div>
    );
}

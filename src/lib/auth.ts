'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Client-side auth on top of the existing anon Supabase client. Guest-first
 * by design: nothing in the app requires a session — signing in only links
 * orders to the user (order history on /profile) and personalizes the UI.
 *
 * Google sign-in requires one-time dashboard setup (Supabase → Authentication
 * → Providers → Google, with a Google Cloud OAuth client). Until that's done
 * the OAuth call returns an error which callers surface gracefully.
 */

export function signInWithGoogle(): Promise<{ error: Error | null }> {
    return supabase.auth
        .signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/home2` },
        })
        .then(({ error }) => ({ error: error ?? null }));
}

export function signOut(): Promise<void> {
    return supabase.auth.signOut().then(() => undefined);
}

/** Access token for authenticated API calls (null for guests). */
export async function getAccessToken(): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

export interface UseUserResult {
    user: User | null;
    loading: boolean;
}

export function useUser(): UseUserResult {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        supabase.auth.getSession().then(({ data }) => {
            if (cancelled) return;
            setUser(data.session?.user ?? null);
            setLoading(false);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (cancelled) return;
            setUser(session?.user ?? null);
            setLoading(false);
        });
        return () => { cancelled = true; sub.subscription.unsubscribe(); };
    }, []);

    return { user, loading };
}

/** Best-available display name for a signed-in user. */
export function displayName(user: User): string {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    return (meta?.full_name as string) || (meta?.name as string) || user.email || 'משתמש';
}

/** Google avatar URL, if the provider supplied one. */
export function avatarUrl(user: User): string | null {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    return (meta?.avatar_url as string) || (meta?.picture as string) || null;
}

import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER = 'https://placeholder.supabase.co';

const url      = process.env.NEXT_PUBLIC_SUPABASE_URL      || PLACEHOLDER;
const anonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safe to call client-side too — only reads the NEXT_PUBLIC_ url, same as
// the anon client above. Centralizes the check that used to live inline
// in kitchen/page.tsx; API routes use this to fall back to the in-memory
// demo store (see src/lib/demoStore.ts) instead of hitting Supabase.
export function isSupabaseConfigured(): boolean {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(u && !u.includes('your-project'));
}

// Browser / client-side client (uses anon key, respects RLS)
export const supabase = createClient(url, anonKey);

// Server-side client (uses service role, bypasses RLS — API routes only)
export const supabaseAdmin = serviceKey
    ? createClient(url, serviceKey)
    : supabase; // fallback to anon if service key not set

/*
 * Schema and policy SQL belongs in `supabase/`, not in an executable-looking
 * comment here. In particular, do not restore the former public INSERT policy:
 * customers write through `/api/orders`, which validates the catalog, price,
 * opening hours and any supplied authentication identity before the
 * service-role insert. The
 * current lockdown is documented in `supabase/002_orders_rls.sql`; the durable
 * Hyp ledger is in `supabase/migrations/20260902184747_payment_foundation.sql`
 * and has not yet been applied to the live project.
 */

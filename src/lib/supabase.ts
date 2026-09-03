import { createClient } from '@supabase/supabase-js';
import {
    isSupabaseConfigured,
    publicSupabaseKey,
} from './supabaseConfig';

export {
    isSupabaseConfigured,
    isSupabaseDemoMode,
    supabaseConfigurationState,
} from './supabaseConfig';

const PLACEHOLDER = 'https://placeholder.supabase.co';

const configured = isSupabaseConfigured();
const url = configured ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim() : PLACEHOLDER;
const publicKey = configured ? publicSupabaseKey()! : 'placeholder';

// Browser/client client only (publishable or legacy anon key, respects RLS).
// Server code must call getSupabaseAdmin() from serverSupabase.ts; there is no
// admin export here and therefore no possible fallback to this public client.
export const supabase = createClient(url, publicKey);

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

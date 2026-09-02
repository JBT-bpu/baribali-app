import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Payment and order settlement must never fall back to the browser anon key.
 * A missing server credential is a deployment error, not demo mode.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (adminClient) return adminClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || url.includes('your-project') || !serviceKey) {
        throw new Error('SUPABASE_ADMIN_NOT_CONFIGURED');
    }

    adminClient = createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return adminClient;
}

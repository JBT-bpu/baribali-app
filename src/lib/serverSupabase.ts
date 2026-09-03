import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfigurationState } from '@/lib/supabaseConfig';
import {
    serverSupabaseKey,
    supabaseConfigurationState,
} from '@/lib/supabaseServerConfig';

let adminClient: SupabaseClient | null = null;
let adminClientUrl: string | null = null;
let adminClientKey: string | null = null;

export function serverSupabaseConfigurationState(): SupabaseConfigurationState {
    return supabaseConfigurationState();
}

export class SupabaseAdminConfigurationError extends Error {
    readonly code = 'SUPABASE_ADMIN_NOT_CONFIGURED';

    constructor(public readonly state: SupabaseConfigurationState) {
        super('SUPABASE_ADMIN_NOT_CONFIGURED');
        this.name = 'SupabaseAdminConfigurationError';
    }
}

/**
 * Payment and order settlement must never fall back to the browser anon key.
 * A missing server credential is a deployment error, not demo mode.
 */
export function getSupabaseAdmin(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serverKey = serverSupabaseKey();
    const state = serverSupabaseConfigurationState();

    if (state !== 'configured' || !url || !serverKey) {
        throw new SupabaseAdminConfigurationError(state);
    }

    if (adminClient && adminClientUrl === url && adminClientKey === serverKey) return adminClient;

    adminClient = createClient(url, serverKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    adminClientUrl = url;
    adminClientKey = serverKey;
    return adminClient;
}

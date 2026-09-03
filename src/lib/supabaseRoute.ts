import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { SUPABASE_CONFIGURATION_ERROR_CODE } from '@/lib/supabaseConfig';

/** Stable public response: identifies deployment configuration, never the missing key. */
export function supabaseConfigurationErrorResponse() {
    return NextResponse.json({
        error: 'Service is temporarily unavailable',
        code: SUPABASE_CONFIGURATION_ERROR_CODE,
    }, { status: 503 });
}

/** Dynamic import keeps plain Node demo tests independent of Next's server-only marker. */
export async function loadSupabaseAdmin(): Promise<SupabaseClient> {
    const { getSupabaseAdmin } = await import('@/lib/serverSupabase');
    return getSupabaseAdmin();
}

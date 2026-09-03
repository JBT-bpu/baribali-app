import { NextResponse } from 'next/server';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { resetDemoStore } from '@/lib/demoStore';
import { supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

// Demo-mode-only convenience — clears the in-memory demo store so testing
// can start fresh. No-ops (rather than touching anything) if real Supabase
// is configured, since there's nothing here to reset in that case.
export async function POST() {
    const configuration = supabaseConfigurationState();
    if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();
    if (configuration === 'demo') {
        resetDemoStore();
    }
    return NextResponse.json({ ok: true });
}

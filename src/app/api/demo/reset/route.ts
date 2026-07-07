import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { resetDemoStore } from '@/lib/demoStore';

// Demo-mode-only convenience — clears the in-memory demo store so testing
// can start fresh. No-ops (rather than touching anything) if real Supabase
// is configured, since there's nothing here to reset in that case.
export async function POST() {
    if (!isSupabaseConfigured()) {
        resetDemoStore();
    }
    return NextResponse.json({ ok: true });
}

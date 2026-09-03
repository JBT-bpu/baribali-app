import {
    firstUsableSupabaseKey,
    resolveSupabaseConfiguration,
    type SupabaseConfigurationState,
} from '@/lib/supabaseConfig';

/**
 * Server-only environment view. Keep this module out of client components:
 * unlike supabaseConfig.ts, it deliberately inspects private key names.
 *
 * It stays free of the `server-only` marker so the pure configuration matrix
 * can run under the repository's plain Node test runner.
 */
export function serverSupabaseKey(): string | undefined {
    return firstUsableSupabaseKey(
        process.env.SUPABASE_SECRET_KEY,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
}

export function supabaseConfigurationState(): SupabaseConfigurationState {
    return resolveSupabaseConfiguration({
        nodeEnv: process.env.NODE_ENV,
        demoOptIn: process.env.NEXT_PUBLIC_BARIBALI_DEMO_MODE,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        publicKey: firstUsableSupabaseKey(
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        ),
        requireAdminKey: true,
        adminKey: serverSupabaseKey(),
    });
}

/**
 * Supabase can be deliberately disabled for local/demo development, fully
 * configured, or broken. Keeping those states distinct prevents a missing
 * production credential from silently turning the deployed restaurant into
 * an in-memory demo.
 *
 * This module is client-safe: it only knows values explicitly passed to it and
 * never reads a server credential. Server env access lives in
 * `supabaseServerConfig.ts` and the actual admin client in
 * `serverSupabase.ts`.
 */

export type SupabaseConfigurationState = 'configured' | 'demo' | 'misconfigured';

export interface SupabaseConfigurationInput {
    nodeEnv?: string;
    demoOptIn?: string;
    url?: string;
    publicKey?: string;
    /** Server callers set this to true and provide adminKey. */
    requireAdminKey?: boolean;
    adminKey?: string;
}

export const SUPABASE_CONFIGURATION_ERROR_CODE = 'SUPABASE_CONFIGURATION_ERROR';

function normalized(value: string | undefined): string {
    return value?.trim() ?? '';
}

function usableUrl(value: string | undefined, nodeEnv: string | undefined): boolean {
    const raw = normalized(value);
    if (!raw || raw.includes('your-project') || raw.includes('placeholder')) return false;
    try {
        const parsed = new URL(raw);
        if (parsed.protocol === 'https:') return true;
        return parsed.protocol === 'http:'
            && nodeEnv !== 'production'
            && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    } catch {
        return false;
    }
}

function usableKey(value: string | undefined): boolean {
    const raw = normalized(value);
    return Boolean(raw && raw !== 'placeholder');
}

function jwtRole(value: string): string | null {
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    try {
        const payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padding = '='.repeat((4 - (payload.length % 4)) % 4);
        const parsed = JSON.parse(globalThis.atob(`${payload}${padding}`)) as { role?: unknown };
        return typeof parsed.role === 'string' ? parsed.role : null;
    } catch {
        return null;
    }
}

function keyKind(value: string | undefined): 'empty' | 'public' | 'admin' | 'unknown' {
    const raw = normalized(value);
    if (!usableKey(raw)) return 'empty';
    const role = jwtRole(raw);
    if (raw.startsWith('sb_secret_') || role === 'service_role') return 'admin';
    if (raw.startsWith('sb_publishable_') || role === 'anon') return 'public';
    return 'unknown';
}

export function firstUsableSupabaseKey(
    ...values: (string | undefined)[]
): string | undefined {
    const value = values.find(usableKey);
    return value?.trim();
}

/** Pure resolver used by both browser and server wrappers and by env-matrix tests. */
export function resolveSupabaseConfiguration(
    input: SupabaseConfigurationInput,
): SupabaseConfigurationState {
    const hasUrl = usableUrl(input.url, input.nodeEnv);
    const publicKeyKind = keyKind(input.publicKey);
    const hasPublicKey = publicKeyKind !== 'empty' && publicKeyKind !== 'admin';
    const needsAdminKey = input.requireAdminKey === true;
    const adminKeyKind = keyKind(input.adminKey);
    const hasAdminKey = adminKeyKind !== 'empty' && adminKeyKind !== 'public';
    const suppliedAnyCredential = Boolean(
        normalized(input.url)
        && !normalized(input.url).includes('your-project')
        && !normalized(input.url).includes('placeholder'),
    ) || usableKey(input.publicKey) || (needsAdminKey && usableKey(input.adminKey));

    // Exact, public opt-in. Values such as "1" or "TRUE" do not silently
    // weaken a production deployment. It must not coexist with real
    // credentials: that usually means a stale flag would discard live writes.
    if (input.demoOptIn === 'true') {
        return suppliedAnyCredential ? 'misconfigured' : 'demo';
    }

    const complete = hasUrl && hasPublicKey && (!needsAdminKey || hasAdminKey);
    if (complete) return 'configured';

    // A completely empty local/test setup remains the convenient in-memory
    // demo. Partial credentials are treated as a mistake in every environment.
    if (input.nodeEnv !== 'production' && !suppliedAnyCredential) return 'demo';
    return 'misconfigured';
}

export function publicSupabaseKey(): string | undefined {
    return firstUsableSupabaseKey(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
}

export function supabaseConfigurationState(): SupabaseConfigurationState {
    return resolveSupabaseConfiguration({
        nodeEnv: process.env.NODE_ENV,
        demoOptIn: process.env.NEXT_PUBLIC_BARIBALI_DEMO_MODE,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        publicKey: publicSupabaseKey(),
    });
}

export function isSupabaseConfigured(): boolean {
    return supabaseConfigurationState() === 'configured';
}

export function isSupabaseDemoMode(): boolean {
    return supabaseConfigurationState() === 'demo';
}

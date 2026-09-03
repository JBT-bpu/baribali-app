const ISOLATED_ENV_NAMES = [
    'NODE_ENV',
    'NEXT_PUBLIC_BARIBALI_DEMO_MODE',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'KITCHEN_PASSWORD',
] as const;

type IsolatedEnvName = typeof ISOLATED_ENV_NAMES[number];
type MutableEnvironment = Record<string, string | undefined>;

/**
 * Prevent a developer's real shell credentials from changing a demo test —
 * or, worse, letting a test reach the live project. The returned callback
 * restores the environment byte-for-byte.
 */
export function isolateSupabaseTestEnvironment(
    overrides: Partial<Record<IsolatedEnvName, string>> = {},
): () => void {
    const env = process.env as MutableEnvironment;
    const saved = Object.fromEntries(ISOLATED_ENV_NAMES.map(name => [name, env[name]]));

    for (const name of ISOLATED_ENV_NAMES) delete env[name];
    env.NODE_ENV = 'test';
    for (const [name, value] of Object.entries(overrides)) {
        if (value === undefined) delete env[name];
        else env[name] = value;
    }

    return () => {
        for (const name of ISOLATED_ENV_NAMES) {
            const value = saved[name];
            if (value === undefined) delete env[name];
            else env[name] = value;
        }
    };
}

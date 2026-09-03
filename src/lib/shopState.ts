import { supabaseConfigurationState } from '@/lib/supabase';
import { type ShopOverride } from '@/lib/shopHours';

/**
 * The live open/closed override — the half of opening hours that cannot be
 * config in code.
 *
 * Server-only (service role). One row, id = 1.
 *
 * Every failed read — table missing, database unreachable, permissions wrong —
 * carries `available: false`. Customer and order routes use that signal to fail
 * closed, because silently losing a staff "closed now" override can accept an
 * order the kitchen cannot fulfil. Demo mode still has an explicit available
 * in-memory state.
 */

const TABLE = 'shop_state';

export interface StoredShopState {
    override: ShopOverride;
    note: string | null;
    /** False when the store could not be read — the caller may want to say so. */
    available: boolean;
}

const NO_OVERRIDE: StoredShopState = { override: null, note: null, available: false };

interface DemoShopState {
    override: ShopOverride;
    note: string | null;
}

// Next compiles route handlers into separate module graphs. A module-local
// object therefore lets /api/shop report a successful override while
// /api/orders keeps reading a different copy. Store the demo value on the
// process global and resolve it on every access so every route bundle shares
// the same object. This remains a local/demo convenience, not persistence.
const demoGlobal = globalThis as typeof globalThis & {
    __baribaliDemoShopState?: DemoShopState;
};

function demoState(): DemoShopState {
    return demoGlobal.__baribaliDemoShopState ??= { override: null, note: null };
}

// Logged once rather than on every request — the board polls, and a missing
// table would otherwise fill the function logs with the same line forever.
let warned = false;
function warnOnce(message: string) {
    if (warned) return;
    warned = true;
    console.warn(`[shopState] ${message} — live shop state is unavailable.`);
}

export async function readShopState(): Promise<StoredShopState> {
    const configuration = supabaseConfigurationState();
    if (configuration === 'demo') return { ...demoState(), available: true };
    if (configuration === 'misconfigured') return NO_OVERRIDE;
    try {
        const { getSupabaseAdmin } = await import('@/lib/serverSupabase');
        const { data, error } = await getSupabaseAdmin()
            .from(TABLE)
            .select('override, note')
            .eq('id', 1)
            .maybeSingle();
        if (error) { warnOnce(error.message); return NO_OVERRIDE; }
        if (!data) return { override: null, note: null, available: true };
        const override = data.override === 'open' || data.override === 'closed' ? data.override : null;
        return { override, note: data.note ?? null, available: true };
    } catch (err) {
        warnOnce(err instanceof Error ? err.message : 'unreadable');
        return NO_OVERRIDE;
    }
}

export async function writeShopState(override: ShopOverride, note: string | null): Promise<boolean> {
    const configuration = supabaseConfigurationState();
    if (configuration === 'demo') {
        Object.assign(demoState(), { override, note });
        return true;
    }
    if (configuration === 'misconfigured') return false;
    try {
        const { getSupabaseAdmin } = await import('@/lib/serverSupabase');
        const { error } = await getSupabaseAdmin()
            .from(TABLE)
            .upsert({ id: 1, override, note, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (error) { warnOnce(error.message); return false; }
        return true;
    } catch (err) {
        warnOnce(err instanceof Error ? err.message : 'unwritable');
        return false;
    }
}

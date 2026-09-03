import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { type ShopOverride } from '@/lib/shopHours';

/**
 * The live open/closed override — the half of opening hours that cannot be
 * config in code.
 *
 * Server-only (service role). One row, id = 1.
 *
 * DEGRADES TO THE SCHEDULE. Every read that fails — table missing, database
 * unreachable, permissions wrong — returns "no override", which means the shop
 * follows its normal hours. That is the safe direction: a broken read must not
 * be able to close a shop that is standing open, and must not be able to open
 * one that is shut on a Saturday (the schedule still says closed).
 *
 * It also means the feature can ship before the migration is applied. Until the
 * table exists the board's toggle simply reports that it is unavailable, and
 * the schedule runs everything.
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
    console.warn(`[shopState] ${message} — falling back to the schedule.`);
}

export async function readShopState(): Promise<StoredShopState> {
    if (!isSupabaseConfigured()) return { ...demoState(), available: true };
    try {
        const { data, error } = await supabaseAdmin
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
    if (!isSupabaseConfigured()) {
        Object.assign(demoState(), { override, note });
        return true;
    }
    try {
        const { error } = await supabaseAdmin
            .from(TABLE)
            .upsert({ id: 1, override, note, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        if (error) { warnOnce(error.message); return false; }
        return true;
    } catch (err) {
        warnOnce(err instanceof Error ? err.message : 'unwritable');
        return false;
    }
}

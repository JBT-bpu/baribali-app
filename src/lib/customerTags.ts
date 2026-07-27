import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { findDiscount, type Discount } from '@/lib/discounts';

/**
 * Customer "tags" — a standing discount assigned to a specific signed-in
 * customer (e.g. an approved municipal worker who always gets 10% off). The
 * assignment lives in Supabase (live: approve someone and it works at their
 * very next order, no deploy). Only the *link* customer→code is dynamic; what a
 * code is worth stays config-in-code in discounts.json, so `findDiscount`
 * remains the single source of truth for a discount's value and active state.
 *
 * Server-only (imports supabaseAdmin / service role). Never import into a
 * client component — the checkout reads a customer's own tag through the
 * token-gated /api/my/discount route instead.
 *
 * Table (run the migration in Supabase):
 *   create table if not exists customer_tags (
 *     user_id       uuid primary key references auth.users(id) on delete cascade,
 *     discount_code text not null,
 *     updated_at    timestamptz not null default now()
 *   );
 *   alter table customer_tags enable row level security;   -- no policies:
 *   -- only the service role (which bypasses RLS) can read/write it.
 *
 * Every read is wrapped so a missing table (migration not yet run) degrades to
 * "no tag" rather than breaking ordering — guest-first, never a hard gate.
 */

/** The active discount assigned to a customer, or null (unknown code / inactive / no tag). */
export async function getCustomerDiscount(userId: string | null | undefined): Promise<Discount | null> {
    if (!userId || !isSupabaseConfigured()) return null;
    try {
        const { data, error } = await supabaseAdmin
            .from('customer_tags')
            .select('discount_code')
            .eq('user_id', userId)
            .maybeSingle();
        if (error || !data?.discount_code) return null;
        // Resolve through the catalog so a deactivated/removed code yields nothing.
        return findDiscount(data.discount_code);
    } catch {
        return null;
    }
}

/** Map of user_id → assigned discount_code for a set of customers (one query). */
export async function getCustomerTagMap(userIds: string[]): Promise<Record<string, string>> {
    if (!userIds.length || !isSupabaseConfigured()) return {};
    try {
        const { data, error } = await supabaseAdmin
            .from('customer_tags')
            .select('user_id, discount_code')
            .in('user_id', userIds);
        if (error || !data) return {};
        const map: Record<string, string> = {};
        for (const row of data) if (row.user_id && row.discount_code) map[row.user_id] = row.discount_code;
        return map;
    } catch {
        return {};
    }
}

/** Assign (upsert) a discount code to a customer. Returns false on failure. */
export async function setCustomerTag(userId: string, code: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabaseAdmin
            .from('customer_tags')
            .upsert({ user_id: userId, discount_code: code, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        return !error;
    } catch {
        return false;
    }
}

/** Remove a customer's tag. Returns false on failure. */
export async function removeCustomerTag(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
        const { error } = await supabaseAdmin.from('customer_tags').delete().eq('user_id', userId);
        return !error;
    } catch {
        return false;
    }
}

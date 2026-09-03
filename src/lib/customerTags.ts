import type { SupabaseClient } from '@supabase/supabase-js';
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
 * A missing table or failed read is deliberately different from "no tag". At
 * an order-pricing boundary, silently treating either failure as no discount
 * could overcharge a customer who has a standing discount.
 */

export type CustomerDiscountLookupClient = Pick<SupabaseClient, 'from'>;

export type CustomerDiscountLookupErrorCode =
    | 'CUSTOMER_TAG_ADMIN_REQUIRED'
    | 'CUSTOMER_TAG_QUERY_FAILED'
    | 'CUSTOMER_TAG_RESULT_INVALID';

export class CustomerDiscountLookupError extends Error {
    constructor(
        public readonly code: CustomerDiscountLookupErrorCode,
        public readonly cause: unknown = null,
    ) {
        super(`Customer discount lookup failed (${code})`);
        this.name = 'CustomerDiscountLookupError';
    }
}

export type CustomerDiscountLookupResult =
    | { ok: true; discount: Discount | null }
    | { ok: false; error: CustomerDiscountLookupError };

function noCustomerDiscount(): CustomerDiscountLookupResult {
    return { ok: true, discount: null };
}

function lookupFailure(
    code: CustomerDiscountLookupErrorCode,
    cause: unknown = null,
): CustomerDiscountLookupResult {
    return { ok: false, error: new CustomerDiscountLookupError(code, cause) };
}

/**
 * Resolve a customer's active standing discount without collapsing database
 * failures into "no tag". A supplied client takes precedence over the legacy
 * module singleton so pricing routes can pass their strict service-role client.
 */
export async function lookupCustomerDiscount(
    userId: string | null | undefined,
    client?: CustomerDiscountLookupClient,
): Promise<CustomerDiscountLookupResult> {
    if (!userId) return noCustomerDiscount();
    if (!client && !isSupabaseConfigured()) return noCustomerDiscount();

    // supabaseAdmin falls back to the public anon client when this secret is
    // absent. That fallback is unsafe here: RLS can make an entitled customer
    // look exactly like a customer with no tag.
    if (!client && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        return lookupFailure('CUSTOMER_TAG_ADMIN_REQUIRED');
    }

    try {
        const { data, error } = await (client ?? supabaseAdmin)
            .from('customer_tags')
            .select('discount_code')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) return lookupFailure('CUSTOMER_TAG_QUERY_FAILED', error);
        if (data === null) return noCustomerDiscount();
        if (
            typeof data !== 'object'
            || Array.isArray(data)
            || typeof data.discount_code !== 'string'
            || !data.discount_code.trim()
        ) {
            return lookupFailure('CUSTOMER_TAG_RESULT_INVALID', data);
        }

        // Resolve through the catalog so a deactivated/removed code yields nothing.
        return { ok: true, discount: findDiscount(data.discount_code) };
    } catch (error) {
        return lookupFailure('CUSTOMER_TAG_QUERY_FAILED', error);
    }
}

/**
 * The active discount assigned to a customer, or null for unknown/inactive/no
 * tag. Database failures throw CustomerDiscountLookupError so order creation
 * fails closed instead of silently charging an undiscounted total.
 */
export async function getCustomerDiscount(
    userId: string | null | undefined,
    client?: CustomerDiscountLookupClient,
): Promise<Discount | null> {
    const result = await lookupCustomerDiscount(userId, client);
    if (!result.ok) throw result.error;
    return result.discount;
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

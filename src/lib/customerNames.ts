import { supabaseAdmin } from '@/lib/supabase';

/**
 * Resolves a signed-in customer's display name/email from their user id.
 *
 * Server-only (uses the service role). Results are cached in module memory for
 * the life of the server instance: a person's name doesn't change between
 * polls, and the kitchen board asks every 4 seconds. Without the cache that
 * would be an auth lookup per order per poll, forever, for a field that is
 * usually empty — ordering is guest-first, so most orders have no user at all.
 *
 * Failures (deleted user, auth hiccup) cache as "no name" rather than retrying
 * on every poll; a missing name is cosmetic and must never slow the board.
 */

interface Customer { name: string | null; email: string | null }

const cache = new Map<string, Customer>();

async function resolveOne(userId: string): Promise<Customer> {
    const hit = cache.get(userId);
    if (hit) return hit;

    let result: Customer = { name: null, email: null };
    try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
        result = {
            name: (meta.full_name as string) ?? (meta.name as string) ?? null,
            email: data.user?.email ?? null,
        };
    } catch { /* deleted or unreachable — cached as blank below */ }

    cache.set(userId, result);
    return result;
}

/** Display name for one user id (null for guests / unknown users). */
export async function customerName(userId: string | null | undefined): Promise<string | null> {
    if (!userId) return null;
    return (await resolveOne(userId)).name;
}

/** user_id → {name, email} for a set of ids, resolving each at most once. */
export async function customerMap(userIds: (string | null | undefined)[]): Promise<Record<string, Customer>> {
    const unique = [...new Set(userIds.filter((id): id is string => !!id))];
    const entries = await Promise.all(unique.map(async id => [id, await resolveOne(id)] as const));
    return Object.fromEntries(entries);
}

import { effectiveBase, effectiveSizePrice } from '@/lib/menuConfig';
import { SIZE_CONFIG } from '@/data/salad-data.js';

/**
 * "Order again" plumbing. A past order is a flat list of item ids plus a base
 * price; to reorder we hand the builder that item set (via sessionStorage) and
 * point it at the right product/size (via the /build URL it already
 * understands). The builder reconstructs its selection state from the ids.
 *
 *  - 'same' → rebuild and jump straight to the summary (pick a fresh pickup
 *    time + pay; prices are recomputed server-side from current catalog).
 *  - 'edit' → rebuild and drop the customer into the builder to change things.
 *
 * Note on type detection: the builder renders the salad step set for BOTH
 * products (TORTILLA_STEPS is currently unused), so a tortilla order's items
 * are ordinary salad-catalog ids — the only thing that distinguishes it is the
 * stored base price (TORTILLA_BASE). So we key type off the base, not the ids.
 */

export type ReorderMode = 'same' | 'edit';
export interface ReorderPayload { itemIds: string[]; mode: ReorderMode; }

const KEY = 'bb-reorder';

/** Salad vs tortilla, from the stored base price (tortilla == the tortilla base). */
export function detectOrderType(size: number | string | null | undefined): 'salad' | 'tortilla' {
    return Number(size) === effectiveBase('tortilla') ? 'tortilla' : 'salad';
}

/** Maps a stored salad base price back to the ml size the /build URL expects,
 *  using current effective size prices. Null for an unknown value → default. */
export function sizeMlFromBase(base: number | string | null | undefined): number | null {
    const b = Number(base);
    if (!Number.isFinite(b)) return null;
    const ml = [750, 1000, 1500].find(m => effectiveSizePrice(m) === b);
    return ml ?? null;
}

/**
 * What the customer (or the cook) should read for "which bowl is this".
 * `size` on an order is the BASE PRICE paid (54 / 59 / 72 / 42), not a size, so
 * showing it raw prints "59" — a number that means nothing to either of them.
 */
export function orderSizeLabel(size: number | string | null | undefined): string | null {
    if (size === null || size === undefined || size === '') return null;
    if (detectOrderType(size) === 'tortilla') return 'טורטייה';
    const ml = sizeMlFromBase(size);
    const cfg = ml ? (SIZE_CONFIG as Record<string, { label: string }>)[String(ml)] : null;
    return cfg?.label ?? null;
}

/** The /build destination for reordering a past order. */
export function buildReorderHref(order: { size?: string | number | null }): string {
    const type = detectOrderType(order.size);
    const params = new URLSearchParams({ type });
    if (type === 'salad') {
        const ml = sizeMlFromBase(order.size);
        if (ml) params.set('size', String(ml));
    }
    return `/build?${params.toString()}`;
}

export function stashReorder(itemIds: string[], mode: ReorderMode): void {
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ itemIds, mode } satisfies ReorderPayload));
    } catch { /* sessionStorage unavailable — reorder just falls back to a fresh build */ }
}

/** Reads and clears the stashed reorder (one-shot, so a later manual /build
 *  visit doesn't resurrect it). */
export function takeReorder(): ReorderPayload | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        sessionStorage.removeItem(KEY);
        const p = JSON.parse(raw);
        if (!p || !Array.isArray(p.itemIds)) return null;
        return { itemIds: p.itemIds.filter((x: unknown): x is string => typeof x === 'string'), mode: p.mode === 'edit' ? 'edit' : 'same' };
    } catch {
        return null;
    }
}

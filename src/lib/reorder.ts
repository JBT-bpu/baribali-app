import { effectiveSizePrice } from '@/lib/menuConfig';
import { SIZE_CONFIG } from '@/data/salad-data.js';
import {
    isOrderableProduct,
    type OrderProduct,
} from '@/lib/orderRules';
import { resolveOrderProduct } from '@/lib/pricing';

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
 * Note on type detection: the dormant tortilla implementation uses salad item
 * ids (TORTILLA_STEPS is currently unused), so the only reliable distinction
 * in historic orders is the stored base price. Reorder payloads carry that
 * detected product so they can never leak into a different active builder.
 */

export type ReorderMode = 'same' | 'edit';
export interface ReorderPayload {
    itemIds: string[];
    mode: ReorderMode;
    product: OrderProduct;
}

const KEY = 'bb-reorder';

/**
 * Salad vs tortilla from a stored base price. Unknown, stale or ambiguous
 * prices return null: without a persisted product column it is unsafe to turn
 * an unrecognized historic order into today's salad by default.
 */
export function detectOrderType(
    size: number | string | null | undefined,
): OrderProduct | null {
    if (size === null || size === undefined || size === '') return null;
    const base = Number(size);
    if (!Number.isFinite(base)) return null;
    return resolveOrderProduct(base, undefined);
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
    const product = detectOrderType(size);
    if (product === 'tortilla') return 'טורטייה';
    if (product !== 'salad') return null;
    const ml = sizeMlFromBase(size);
    const cfg = ml ? (SIZE_CONFIG as Record<string, { label: string }>)[String(ml)] : null;
    return cfg?.label ?? null;
}

/** The /build destination for reordering a past order. */
export function buildReorderHref(order: { size?: string | number | null }): string {
    const type = detectOrderType(order.size);
    if (!type) return '/home2';
    const params = new URLSearchParams({ type });
    if (type === 'salad') {
        const ml = sizeMlFromBase(order.size);
        if (ml) params.set('size', String(ml));
    }
    return `/build?${params.toString()}`;
}

export function isOrderReorderable(order: { size?: string | number | null }): boolean {
    const product = detectOrderType(order.size);
    return product !== null && isOrderableProduct(product);
}

export function stashReorder(itemIds: string[], mode: ReorderMode, product: OrderProduct): void {
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ itemIds, mode, product } satisfies ReorderPayload));
    } catch { /* sessionStorage unavailable — reorder just falls back to a fresh build */ }
}

/** Reads and clears the stashed reorder (one-shot, so a later manual /build
 *  visit doesn't resurrect it). The expected product prevents an unavailable
 *  or stale payload from being reconstructed in a different builder. */
export function takeReorder(expectedProduct: OrderProduct): ReorderPayload | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        sessionStorage.removeItem(KEY);
        const p = JSON.parse(raw);
        if (
            !p
            || !Array.isArray(p.itemIds)
            || (p.product !== 'salad' && p.product !== 'tortilla')
            || p.product !== expectedProduct
        ) return null;
        return {
            itemIds: p.itemIds.filter((x: unknown): x is string => typeof x === 'string'),
            mode: p.mode === 'edit' ? 'edit' : 'same',
            product: p.product,
        };
    } catch {
        return null;
    }
}

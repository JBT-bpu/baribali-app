import discountsJson from '@/data/discounts.json';

/**
 * Discount codes — config in code (src/data/discounts.json), edited by the
 * manager admin and published on the next deploy. Simple reusable codes; usage
 * caps / single-use would need a DB (future). Client- and server-safe.
 *
 * Validation is always re-done server-side in /api/orders — the client preview
 * is only UX, never trusted for the charged amount.
 */

export interface Discount {
    code: string;
    type: 'percent' | 'amount';
    value: number;
    active: boolean;
    note?: string;
}

export function allDiscounts(): Discount[] {
    return (discountsJson as Discount[]).filter(d => d && typeof d.code === 'string');
}

/** The active discount matching `code` (case-insensitive), or null. */
export function findDiscount(code: string | null | undefined): Discount | null {
    if (!code) return null;
    const c = String(code).trim().toUpperCase();
    if (!c) return null;
    return allDiscounts().find(d => d.active && d.code.trim().toUpperCase() === c) ?? null;
}

/** The whole-shekel amount a discount takes off a subtotal (capped at it). */
export function discountAmount(subtotal: number, d: Discount | null | undefined): number {
    if (!d) return 0;
    const raw = d.type === 'percent' ? subtotal * (d.value / 100) : d.value;
    return Math.max(0, Math.min(subtotal, Math.round(raw)));
}

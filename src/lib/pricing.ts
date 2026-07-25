import { effectiveItemPriceMap, effectiveValidBases } from '@/lib/menuConfig';

export interface OrderItemInput {
    id: string;
}

export interface ComputedTotal {
    total: number;
    valid: boolean;
}

/**
 * Recomputes an order's true total server-side from the canonical ingredient/
 * base prices — ignoring any price the client submitted. Prices come from the
 * effective-price layer (code defaults merged with the manager's overrides in
 * menu-prices.json), so this stays authoritative even after prices are edited.
 */
export function computeOrderTotal(items: OrderItemInput[], base: number): ComputedTotal {
    if (typeof base !== 'number' || !effectiveValidBases().includes(base)) {
        return { total: 0, valid: false };
    }
    const priceMap = effectiveItemPriceMap();
    let sum = base;
    for (const item of items) {
        const price = priceMap[item?.id];
        if (price === undefined) {
            return { total: 0, valid: false };
        }
        sum += price;
    }
    return { total: sum, valid: true };
}

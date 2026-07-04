import { STEPS, TORTILLA_STEPS, BASE, TORTILLA_BASE, SIZE_CONFIG } from '@/data/salad-data.js';

interface StepItem {
    id: string;
    price: number;
}

interface Subgroup {
    items: StepItem[];
}

interface Step {
    subgroups: Subgroup[];
}

function buildPriceMap(steps: Step[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const step of steps) {
        for (const sg of step.subgroups) {
            for (const item of sg.items) {
                map[item.id] = item.price;
            }
        }
    }
    return map;
}

const ITEM_PRICE_MAP: Record<string, number> = {
    ...buildPriceMap(STEPS as Step[]),
    ...buildPriceMap(TORTILLA_STEPS as Step[]),
};

// Valid order "base" prices: the plain salad base, the tortilla base, and each size tier's price.
export const VALID_BASES: number[] = [
    BASE as number,
    TORTILLA_BASE as number,
    ...Object.values(SIZE_CONFIG as Record<string, { price: number }>).map(s => s.price),
];

export interface OrderItemInput {
    id: string;
}

export interface ComputedTotal {
    total: number;
    valid: boolean;
}

/**
 * Recomputes an order's true total server-side from canonical ingredient/base prices,
 * ignoring any price the client may have submitted.
 */
export function computeOrderTotal(items: OrderItemInput[], base: number): ComputedTotal {
    if (typeof base !== 'number' || !VALID_BASES.includes(base)) {
        return { total: 0, valid: false };
    }
    let sum = base;
    for (const item of items) {
        const price = ITEM_PRICE_MAP[item?.id];
        if (price === undefined) {
            return { total: 0, valid: false };
        }
        sum += price;
    }
    return { total: sum, valid: true };
}

export type OrderProduct = 'salad' | 'tortilla';

export type ProductAvailability = 'orderable' | 'coming_soon';

/**
 * One shared switch for every place that can expose or accept a product.
 * Keeping future products in this map lets us retain their catalog/pricing
 * work without accidentally making them orderable before launch.
 */
export const PRODUCT_AVAILABILITY: Readonly<Record<OrderProduct, ProductAvailability>> = Object.freeze({
    salad: 'orderable',
    tortilla: 'coming_soon',
});

export function isOrderProduct(value: unknown): value is OrderProduct {
    return value === 'salad' || value === 'tortilla';
}

export function isOrderableProduct(value: unknown): value is OrderProduct {
    return isOrderProduct(value) && PRODUCT_AVAILABILITY[value] === 'orderable';
}

/**
 * Maximum number of ordinary ingredient picks in each product. Protein,
 * sauces, finish preferences and paid upgrades have their own rules and do
 * not consume this allowance.
 *
 * Shared by the client and the server so a UI change cannot silently weaken
 * the order API (or make it reject a selection the builder allows).
 */
export const INGREDIENT_PICK_LIMIT: Readonly<Record<OrderProduct, number>> = {
    salad: 14,
    tortilla: 8,
};

export function countsTowardIngredientPickLimit(step: {
    id: string;
    maxPicks?: number;
}): boolean {
    return step.maxPicks === undefined
        && step.id !== 'finish'
        && step.id !== 'upgrade'
        && step.id !== 't_upgrade';
}

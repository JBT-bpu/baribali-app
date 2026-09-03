export type OrderProduct = 'salad' | 'tortilla';

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

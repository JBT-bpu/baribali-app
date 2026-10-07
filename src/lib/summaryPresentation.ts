// Presentation only: these choices still belong to the order and its estimate.
// Keep the explicit list narrow; unknown or future ingredients stay visible.
const PREPARATION_IDS = new Set([
    'mix_no_sauce', 'no_mix', 'none_side',
]);

export function isPreparationChoice(item: { id: string }): boolean {
    return PREPARATION_IDS.has(item.id);
}

export function preparationLabel(item: { id: string; he: string }): string {
    return item.id === 'none_side' ? 'ללא תוספת צד' : item.he;
}

/** Group-local counts: preparation instructions must never pretend to be food. */
export function summaryGroupCountLabel(items: readonly { id: string }[], stepId: string): string {
    const foodCount = items.filter(item => !isPreparationChoice(item)).length;
    const instructionCount = items.length - foodCount;
    const labels: string[] = [];
    if (foodCount > 0 || instructionCount === 0) {
        const noun = stepId === 'sauces'
            ? (foodCount === 1 ? 'רוטב' : 'רטבים')
            : (foodCount === 1 ? 'מרכיב' : 'מרכיבים');
        labels.push(`${foodCount} ${noun}`);
    }
    if (instructionCount > 0) {
        labels.push(`${instructionCount} ${instructionCount === 1 ? 'הנחיית הכנה' : 'הנחיות הכנה'}`);
    }
    return labels.join(' · ');
}

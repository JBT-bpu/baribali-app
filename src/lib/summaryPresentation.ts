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

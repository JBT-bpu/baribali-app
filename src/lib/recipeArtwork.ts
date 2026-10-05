/** Decorative recipe illustrations, never a pricing or ingredient authority.
 * A changed recipe falls back to a real ingredient until its art is revised. */
const ART_RECIPE_ITEMS: Readonly<Record<string, readonly string[]>> = {
    signature: ['baby_leaf', 'tomato', 'cucumber', 'quinoa', 'chickpeas', 'baked_sweet_potato', 'red_onion', 'sunflower_seeds', 'tahini', 'lemon'],
    mediterranean: ['baby_leaf', 'tomato', 'cucumber', 'bell_pepper', 'red_onion', 'black_olives', 'green_olives', 'feta5', 'balsamic'],
    asian_fusion: ['cabbage_purple', 'baby_leaf', 'carrot', 'cucumber', 'corn', 'green_onion', 'tofu_olive', 'sesame', 'teriyaki'],
    protein_beast: ['lettuce', 'mushrooms', 'quinoa', 'black_lentils', 'chickpeas', 'egg', 'sunflower_seeds', 'tahini'],
    rainbow: ['baby_leaf', 'tomato', 'carrot', 'bell_pepper', 'fresh_beet', 'corn', 'cabbage_purple', 'green_peas', 'citrus_vin'],
    fire_spice: ['lettuce', 'tomato', 'radish', 'hot_pepper', 'pickles', 'red_onion', 'chickpeas', 'tofu_olive', 'zhug'],
    warm_earth: ['lettuce', 'roasted_eggplant', 'baked_sweet_potato', 'chickpeas', 'red_onion', 'parsley', 'zaatar', 'egg', 'tahini'],
    garden_fresh: ['baby_leaf', 'sprouts', 'cucumber', 'celery', 'green_onion', 'tomato', 'cilantro', 'parsley', 'lemon'],
    pasta_garden: ['baby_leaf', 'fusilli_pasta', 'tomato', 'cucumber', 'bell_pepper', 'black_olives', 'parsley', 'balsamic', 'feta5'],
    detox_bowl: ['baby_leaf', 'sprouts', 'fresh_beet', 'carrot', 'celery', 'chia', 'green_peas', 'lemon', 'green_onion'],
    crunchy_master: ['cabbage_white', 'cabbage_purple', 'carrot', 'celery', 'radish', 'pickles', 'sunflower_seeds', 'sesame', 'citrus_vin'],
    eastern_night: ['baby_leaf', 'bulgur', 'roasted_eggplant', 'chickpeas', 'tomato', 'parsley', 'cilantro', 'red_onion', 'tahini', 'lemon'],
};

export function matchingRecipeArtwork(preset: { id: string; items: readonly string[] }): string | null {
    if (!preset || !Object.hasOwn(ART_RECIPE_ITEMS, preset.id) || !Array.isArray(preset.items)) return null;
    const expected = ART_RECIPE_ITEMS[preset.id];
    if (preset.items.length !== expected.length) return null;
    const actual = new Set(preset.items);
    if (actual.size !== expected.length || expected.some(id => !actual.has(id))) return null;
    return `/builder-assets/recipes/${preset.id}-bowl-v1.webp`;
}

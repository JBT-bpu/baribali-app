export type NutritionMetric = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

export type NutritionRange = {
    low: number;
    high: number;
    midpoint: number;
};

export type NutritionEstimate = {
    calories: NutritionRange;
    macros: Record<Exclude<NutritionMetric, 'calories'>, NutritionRange>;
    coverage: number;
    drivers: string[];
};

type NutritionValues = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
};

type BuilderItem = {
    id?: string;
    tags?: string[];
    _meta?: { stepId?: string };
};

/**
 * Typical-portion assumptions used only by the customer-facing BariMeter.
 *
 * These are deliberately not presented as product nutrition facts. BariBali's
 * ingredients are assembled by hand and recipes have not yet been weighed, so
 * the simulator returns a broad range and names that limitation in the UI.
 * Replace these assumptions with measured gram weights before using them for a
 * nutrition label or any exact dietary claim.
 */
const TYPICAL_PORTION_ESTIMATES: Record<string, NutritionValues> = {
    lettuce: n(8, .6, 1.5, .1, .6), baby_leaf: n(12, 1, 1.8, .2, .9),
    cabbage_white: n(18, 1, 4, .1, 1.8), cabbage_purple: n(22, 1.1, 5, .2, 1.6), sprouts: n(15, 1.8, 1.5, .1, .8),
    tomato: n(14, .7, 3, .2, .9), cucumber: n(8, .4, 1.8, .1, .3), bell_pepper: n(20, .7, 4.5, .2, 1.3),
    carrot: n(25, .6, 5.8, .1, 1.7), red_onion: n(16, .4, 3.6, .1, .6), green_onion: n(5, .3, 1, .1, .4),
    radish: n(10, .4, 2, .1, 1), celery: n(6, .3, 1.2, .1, .8), fresh_beet: n(28, .8, 6, .1, 1.4),
    mushrooms: n(15, 2.2, 1.5, .2, .7), corn: n(55, 2, 12, .7, 1.2), green_peas: n(45, 3, 8, .2, 2.5),
    hot_pepper: n(6, .3, 1.2, .1, .4), quinoa: n(90, 3.5, 16, 1.5, 2.2), brown_rice: n(82, 1.8, 17, .7, 1.4),
    bulgur: n(76, 2.8, 15, .2, 3.2), black_lentils: n(80, 6.5, 12, .3, 4), green_lentils: n(75, 6, 12, .3, 3.8),
    chickpeas: n(95, 5.5, 15, 1.8, 4.5), fusilli_pasta: n(95, 3.5, 19, .5, 1), roasted_eggplant: n(35, .8, 5, 1.5, 2),
    baked_sweet_potato: n(65, 1, 15, .1, 2.5), baked_potato: n(70, 1.5, 16, .1, 1.5), cilantro: n(2, .2, .3, 0, .2),
    parsley: n(4, .3, .6, .1, .3), pickles: n(8, .3, 1.5, .1, .5), cranberries: n(45, .1, 11, .2, .8),
    black_olives: n(36, .3, 1.5, 3.2, .8), green_olives: n(30, .3, 1, 2.8, .9), sunflower_seeds: n(90, 3.2, 3, 7.5, 1.3),
    sesame: n(85, 2.5, 3.5, 7, 1.7), chia: n(70, 2.5, 6, 4.5, 5), zaatar: n(10, .5, 1.5, .5, .8),

    egg: n(78, 6.3, .6, 5.3, 0), tuna: n(45, 10, 0, .5, 0), tofu_olive: n(85, 8, 2, 5, .3),
    feta5: n(55, 7, 1, 2.5, 0), baby_mozzarella: n(70, 6, .5, 5, 0),

    olive_oil: n(120, 0, 0, 14, 0), lemon: n(4, .1, 1.3, 0, 0), tahini: n(90, 2.6, 3, 8, .7),
    balsamic: n(14, .1, 2.7, 0, 0), thousand: n(60, .2, 4, 5, 0), garlic_s: n(55, .3, 2, 5, 0),
    citrus_vin: n(45, .1, 3, 3.5, 0), sweet_chili: n(40, .2, 9, .1, .1), teriyaki: n(35, .5, 7, 0, 0),
    soy_s: n(8, 1, 1, 0, 0), caesar: n(80, .5, .5, 8.5, 0), pesto: n(75, 1.5, 1, 7, .3), zhug: n(15, .3, 1.5, 1, .5),

    mix_no_sauce: n(0, 0, 0, 0, 0), no_mix: n(0, 0, 0, 0, 0), bread: n(70, 2.5, 13, .8, .7),
    croutons_s: n(55, 1, 8, 2.5, .3), none_side: n(0, 0, 0, 0, 0),

    halloumi_p: n(110, 7, 1, 9, 0), tofu_teri_p: n(95, 8, 4, 5, .3), tuna_p: n(45, 10, 0, .5, 0),
    feta_p: n(55, 7, 1, 2.5, 0), egg_p: n(78, 6.3, .6, 5.3, 0), parmesan_p: n(55, 5, .5, 3.8, 0),
    honey_p: n(45, 0, 12, 0, 0), jala_p: n(85, 2, 6, 6, .8), bread_p: n(70, 2.5, 13, .8, .7),
    croutons_p: n(55, 1, 8, 2.5, .3),
};

const ZERO = n(0, 0, 0, 0, 0);
const VOLUME_STEP = 'veggies';
const SIZE_FACTOR: Record<number, number> = { 750: .78, 1000: 1, 1500: 1.3 };

const DRIVER_LABELS: Record<string, string> = {
    produce: 'ירקות ובסיס',
    grains: 'דגנים וקטניות',
    toppings: 'תוספים וזרעים',
    protein: 'חלבון',
    sauces: 'רטבים',
    sides: 'לחם ותוספות',
};

const TOPPING_IDS = new Set(['cranberries', 'black_olives', 'green_olives', 'sunflower_seeds', 'sesame', 'chia', 'zaatar']);
const SIDE_IDS = new Set(['bread', 'croutons_s', 'bread_p', 'croutons_p']);

function n(calories: number, protein: number, carbs: number, fat: number, fiber: number): NutritionValues {
    return { calories, protein, carbs, fat, fiber };
}

function add(target: NutritionValues, values: NutritionValues, factor = 1) {
    target.calories += values.calories * factor;
    target.protein += values.protein * factor;
    target.carbs += values.carbs * factor;
    target.fat += values.fat * factor;
    target.fiber += values.fiber * factor;
}

function stepOf(item: BuilderItem) {
    return item._meta?.stepId || '';
}

function driverOf(item: BuilderItem) {
    const step = stepOf(item);
    if (step === 'sauces') return 'sauces';
    if (step === 'protein' || step === 'upgrade') return 'protein';
    if (step === 'finish' || SIDE_IDS.has(item.id || '')) return 'sides';
    if (item.tags?.includes('grain')) return 'grains';
    if (TOPPING_IDS.has(item.id || '')) return 'toppings';
    return 'produce';
}

function range(value: number, metric: NutritionMetric): NutritionRange {
    const step = metric === 'calories' ? 10 : 1;
    const low = Math.max(0, Math.floor((value * .78) / step) * step);
    const high = Math.max(low, Math.ceil((value * 1.25) / step) * step);
    return { low, high, midpoint: Math.round(value) };
}

/**
 * Builds a deliberately broad order-level estimate.
 *
 * Vegetable portions share the bowl volume: selecting twice as many options
 * does not mean twice as much food. Bowl size scales that shared volume, while
 * proteins, sauces and paid extras remain typical fixed portions.
 */
export function estimateNutritionRange(items: BuilderItem[], sizeMl = 1000): NutritionEstimate | null {
    if (!Array.isArray(items) || items.length === 0) return null;

    const knownItems = items.filter(item => !!item.id && TYPICAL_PORTION_ESTIMATES[item.id]);
    const caloricItems = knownItems.filter(item => TYPICAL_PORTION_ESTIMATES[item.id!].calories > 0);
    if (caloricItems.length === 0) return null;

    const volumeItems = knownItems.filter(item => stepOf(item) === VOLUME_STEP);
    const sizeFactor = SIZE_FACTOR[sizeMl] ?? SIZE_FACTOR[1000];
    const sharedVolumeFactor = volumeItems.length
        ? sizeFactor * Math.min(1.15, 7 / volumeItems.length)
        : 1;

    const totals = { ...ZERO };
    const driverTotals = new Map<string, number>();

    for (const item of knownItems) {
        const values = TYPICAL_PORTION_ESTIMATES[item.id!];
        const factor = stepOf(item) === VOLUME_STEP ? sharedVolumeFactor : 1;
        add(totals, values, factor);
        const driver = driverOf(item);
        driverTotals.set(driver, (driverTotals.get(driver) || 0) + values.calories * factor);
    }

    const drivers = [...driverTotals.entries()]
        .filter(([, calories]) => calories > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([driver]) => DRIVER_LABELS[driver]);

    return {
        calories: range(totals.calories, 'calories'),
        macros: {
            protein: range(totals.protein, 'protein'),
            carbs: range(totals.carbs, 'carbs'),
            fat: range(totals.fat, 'fat'),
            fiber: range(totals.fiber, 'fiber'),
        },
        coverage: Math.round((knownItems.length / items.length) * 100),
        drivers,
    };
}


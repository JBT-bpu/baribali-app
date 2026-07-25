import { STEPS, TORTILLA_STEPS, BASE, TORTILLA_BASE, SIZE_CONFIG } from '@/data/salad-data.js';
import overridesJson from '@/data/menu-prices.json';

/**
 * The effective-price layer. Prices are editable by the local manager admin,
 * which writes overrides into src/data/menu-prices.json (committed to the repo;
 * changes go live on the next deploy — "config in code, not a live DB"). Here
 * we merge those overrides over the code defaults in salad-data.js.
 *
 * Client- and server-safe (pure JSON + functions, no fs/crypto). The server
 * money authority (src/lib/pricing.ts) and the client price displays both read
 * through this, so they always agree — which the order price-mismatch check
 * depends on.
 *
 * Override keys: an item id for ingredient prices, plus the special base keys
 * `__base_salad`, `__base_tortilla`, `__size_750`, `__size_1000`, `__size_1500`.
 */

type Overrides = Record<string, number>;
const overrides: Overrides = overridesJson as Overrides;

interface CatItem { id: string; price: number; icon?: string; he?: string }
interface CatSub { label?: string | null; shortLabel?: string; items: CatItem[] }
interface CatStep { id?: string; title?: string; emoji?: string; subgroups: CatSub[] }

function num(v: unknown): number | undefined {
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function effectiveItemPrice(id: string, fallback: number): number {
    return num(overrides[id]) ?? fallback;
}

export function effectiveBase(kind: 'salad' | 'tortilla'): number {
    const codeDefault = kind === 'tortilla' ? (TORTILLA_BASE as number) : (BASE as number);
    return num(overrides[kind === 'tortilla' ? '__base_tortilla' : '__base_salad']) ?? codeDefault;
}

export function effectiveSizePrice(ml: number | string): number {
    const cfg = (SIZE_CONFIG as Record<string, { price: number }>)[String(ml)];
    return num(overrides[`__size_${ml}`]) ?? (cfg ? cfg.price : (BASE as number));
}

/** Default (code) price for every catalog item, id -> price. */
function defaultItemPrices(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const step of [...(STEPS as CatStep[]), ...(TORTILLA_STEPS as CatStep[])]) {
        for (const sg of step.subgroups) for (const it of sg.items) map[it.id] = it.price;
    }
    return map;
}

/** Effective (override-merged) price for every catalog item — used by pricing.ts. */
export function effectiveItemPriceMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const [id, def] of Object.entries(defaultItemPrices())) map[id] = effectiveItemPrice(id, def);
    return map;
}

/** Effective valid "base" prices (salad/tortilla base + the three size tiers). */
export function effectiveValidBases(): number[] {
    return [
        effectiveBase('salad'),
        effectiveBase('tortilla'),
        effectiveSizePrice(750),
        effectiveSizePrice(1000),
        effectiveSizePrice(1500),
    ];
}

/**
 * The full editable price set as the admin sees/saves it: every item id plus
 * the base/size keys, with current effective values. The admin "save" writes
 * this whole object back to menu-prices.json.
 */
export function fullEffectivePriceMap(): Record<string, number> {
    return {
        ...effectiveItemPriceMap(),
        __base_salad: effectiveBase('salad'),
        __base_tortilla: effectiveBase('tortilla'),
        __size_750: effectiveSizePrice(750),
        __size_1000: effectiveSizePrice(1000),
        __size_1500: effectiveSizePrice(1500),
    };
}

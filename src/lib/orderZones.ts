import { STEPS, TORTILLA_STEPS } from '@/data/salad-data.js';

/**
 * Groups a saved order's items into the zones a cook actually works through.
 *
 * A saved order item is only `{ id, he, icon, price }` — the category the
 * customer picked it from is not stored. So the mapping is rebuilt here from the
 * catalog itself, which means the kitchen board can group by assembly order with
 * no schema change and no change to the orders API.
 *
 * The zone order below IS the order of work: greens and bases into the bowl,
 * then the protein/premium toppings, then sauces, then the mixing/bread choices.
 */

export type ZoneId = 'base' | 'protein' | 'sauce' | 'finish' | 'other';

export interface Zone {
    id: ZoneId;
    title: string;
    /** Catalog step ids that feed this zone. */
    steps: string[];
}

export const ZONES: Zone[] = [
    { id: 'base',    title: 'ירקות ובסיסים',  steps: ['veggies'] },
    { id: 'protein', title: 'תוספות וחלבון',  steps: ['protein', 'upgrade', 't_upgrade'] },
    { id: 'sauce',   title: 'רטבים',          steps: ['sauces'] },
    { id: 'finish',  title: 'ערבוב ולחם',     steps: ['finish'] },
    // Anything the catalog no longer knows about lands here. An ingredient must
    // never silently disappear from a cook's list because the menu changed after
    // the order was placed.
    { id: 'other',   title: 'נוספים',         steps: [] },
];

interface CatItem { id: string }
interface CatSub { items: CatItem[] }
interface CatStep { id?: string; subgroups: CatSub[] }

/** item id → zone id, built once from the catalog. */
const ITEM_ZONE: Record<string, ZoneId> = (() => {
    const stepToZone: Record<string, ZoneId> = {};
    for (const z of ZONES) for (const s of z.steps) stepToZone[s] = z.id;

    const map: Record<string, ZoneId> = {};
    for (const step of [...(STEPS as CatStep[]), ...(TORTILLA_STEPS as CatStep[])]) {
        const zone = step.id ? stepToZone[step.id] : undefined;
        if (!zone) continue;
        for (const sg of step.subgroups) for (const it of sg.items) map[it.id] = zone;
    }
    return map;
})();

export function zoneOf(itemId: string): ZoneId {
    return ITEM_ZONE[itemId] ?? 'other';
}

/**
 * Splits an order's items into the zones, preserving each zone's order and
 * dropping zones that would render empty.
 */
export function groupByZone<T extends { id: string }>(items: T[]): { zone: Zone; items: T[] }[] {
    const buckets = new Map<ZoneId, T[]>();
    for (const item of items) {
        const z = zoneOf(item.id);
        const list = buckets.get(z);
        if (list) list.push(item);
        else buckets.set(z, [item]);
    }
    return ZONES
        .map(zone => ({ zone, items: buckets.get(zone.id) ?? [] }))
        .filter(g => g.items.length > 0);
}

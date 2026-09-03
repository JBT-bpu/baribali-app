import { STEPS } from '@/data/salad-data.js';
import { effectiveBase, effectiveItemPrice, effectiveSizePrice } from '@/lib/menuConfig';
import {
    countsTowardIngredientPickLimit,
    INGREDIENT_PICK_LIMIT,
    isOrderableProduct,
    isOrderProduct,
    type OrderProduct,
} from '@/lib/orderRules';

interface CatalogItem {
    id: string;
    he: string;
    icon: string;
    price: number;
}

interface CatalogSubgroup {
    items: CatalogItem[];
}

interface CatalogStep {
    id: string;
    maxPicks?: number;
    subgroups: CatalogSubgroup[];
}

interface CatalogEntry extends CatalogItem {
    stepId: string;
    subgroupIndex: number;
    maxPicks?: number;
}

export interface CanonicalOrderItem {
    id: string;
    he: string;
    icon: string;
    price: number;
}

export type ComputedTotal =
    | { total: number; valid: true; items: CanonicalOrderItem[] }
    | { total: 0; valid: false; items: [] };

function invalidResult(): ComputedTotal {
    return { total: 0, valid: false, items: [] };
}

export function resolveOrderProduct(base: number, requestedProduct: unknown): OrderProduct | null {
    const matchingProducts = new Set<OrderProduct>();
    const saladBases = [
        effectiveBase('salad'),
        effectiveSizePrice(750),
        effectiveSizePrice(1000),
        effectiveSizePrice(1500),
    ];
    if (saladBases.includes(base)) matchingProducts.add('salad');
    if (base === effectiveBase('tortilla')) matchingProducts.add('tortilla');

    // `productType` is not persisted yet, while order history/reorder still
    // infer it from this base. Therefore even an explicit request cannot make
    // an ambiguous base safe to store; reject it until the DB has that column.
    if (matchingProducts.size !== 1) return null;
    const matchedProduct = [...matchingProducts][0];

    // Backward compatibility for an already-open client from before the
    // product field existed. A current client must also agree with the base.
    if (requestedProduct === undefined) return matchedProduct;
    if (!isOrderProduct(requestedProduct)) return null;
    return requestedProduct === matchedProduct ? matchedProduct : null;
}

function activeCatalog(product: OrderProduct): Map<string, CatalogEntry> | null {
    // The dormant tortilla builder uses the salad steps minus `finish` (see
    // BariBaliBuilder and reorder.ts). Keep that future catalog ready behind
    // PRODUCT_AVAILABILITY; TORTILLA_STEPS must not become orderable through a
    // forged request before the UI adopts it.
    const steps = (STEPS as CatalogStep[]).filter(
        step => product === 'salad' || step.id !== 'finish',
    );
    const catalog = new Map<string, CatalogEntry>();

    for (const step of steps) {
        for (const [subgroupIndex, subgroup] of step.subgroups.entries()) {
            for (const item of subgroup.items) {
                // Duplicate ids in the source catalog would make pricing and
                // category rules ambiguous. Fail closed rather than allowing
                // whichever duplicate happened to be visited last.
                if (
                    typeof item.id !== 'string'
                    || item.id.length === 0
                    || typeof item.he !== 'string'
                    || typeof item.icon !== 'string'
                    || !Number.isFinite(item.price)
                    || item.price < 0
                    || catalog.has(item.id)
                ) return null;
                const price = effectiveItemPrice(item.id, item.price);
                if (!Number.isFinite(price) || price < 0) return null;
                catalog.set(item.id, {
                    id: item.id,
                    he: item.he,
                    icon: item.icon,
                    price,
                    stepId: step.id,
                    subgroupIndex,
                    maxPicks: step.maxPicks,
                });
            }
        }
    }

    return catalog;
}

/**
 * Validates an order against the builder's selection rules and reconstructs
 * every saved item from the canonical catalog. Client-supplied labels, icons,
 * prices and metadata are ignored. Prices come from the effective-price layer
 * (code defaults merged with the manager's menu overrides).
 */
export function computeOrderTotal(
    items: unknown,
    base: unknown,
    requestedProduct?: unknown,
): ComputedTotal {
    if (!Array.isArray(items) || typeof base !== 'number' || !Number.isFinite(base)) return invalidResult();

    const product = resolveOrderProduct(base, requestedProduct);
    if (!product || !isOrderableProduct(product)) return invalidResult();
    const catalog = activeCatalog(product);
    if (!catalog || items.length > catalog.size) return invalidResult();

    const seenIds = new Set<string>();
    const stepCounts = new Map<string, number>();
    const finishSubgroupCounts = new Map<number, number>();
    const canonicalItems: CanonicalOrderItem[] = [];
    let ingredientPicks = 0;
    let sum = base;

    for (const submitted of items) {
        if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) return invalidResult();
        const id = (submitted as { id?: unknown }).id;
        if (typeof id !== 'string' || id.length === 0 || seenIds.has(id)) return invalidResult();

        // Map lookup intentionally avoids prototype-chain keys such as
        // `constructor`, `toString` and `__proto__` becoming phantom products.
        const item = catalog.get(id);
        if (!item) return invalidResult();
        seenIds.add(id);

        const stepCount = (stepCounts.get(item.stepId) ?? 0) + 1;
        stepCounts.set(item.stepId, stepCount);
        if (item.maxPicks !== undefined && stepCount > item.maxPicks) return invalidResult();

        if (item.stepId === 'finish') {
            const subgroupCount = (finishSubgroupCounts.get(item.subgroupIndex) ?? 0) + 1;
            finishSubgroupCounts.set(item.subgroupIndex, subgroupCount);
            if (subgroupCount > 1) return invalidResult();
        }

        if (countsTowardIngredientPickLimit({ id: item.stepId, maxPicks: item.maxPicks })) {
            ingredientPicks += 1;
            if (ingredientPicks > INGREDIENT_PICK_LIMIT[product]) return invalidResult();
        }

        canonicalItems.push({ id: item.id, he: item.he, icon: item.icon, price: item.price });
        sum += item.price;
        if (!Number.isFinite(sum) || sum < 0) return invalidResult();
    }

    return { total: sum, valid: true, items: canonicalItems };
}

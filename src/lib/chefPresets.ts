import { computeOrderTotal, type CanonicalOrderItem } from '@/lib/pricing';

interface BuilderIngredient {
    id: string;
    he?: string;
    icon?: string;
    price?: number;
    tags?: string[];
    desc?: string;
}

interface BuilderSubgroup {
    items: BuilderIngredient[];
}

interface BuilderStep {
    id: string;
    subgroups: BuilderSubgroup[];
}

interface ChefPreset {
    items: string[];
}

interface ResolvedBuilderIngredient extends BuilderIngredient {
    _meta: { stepId: string };
}

export type ResolvedChefPreset =
    | {
        valid: true;
        total: number;
        items: CanonicalOrderItem[];
        selections: Record<string, ResolvedBuilderIngredient[]>;
    }
    | {
        valid: false;
        total: 0;
        items: [];
        selections: Record<string, never>;
    };

function invalidPreset(): ResolvedChefPreset {
    return { valid: false, total: 0, items: [], selections: {} };
}

/**
 * Resolves a chef recipe once for every customer-facing use: quoted price,
 * ingredient preview and the exact builder selections loaded by its CTA.
 * The canonical server quote remains the money/rule authority, while the
 * catalog pass proves the builder can represent every quoted item exactly.
 */
export function resolveChefPreset(
    preset: ChefPreset,
    steps: BuilderStep[],
    base: number,
): ResolvedChefPreset {
    if (!preset || !Array.isArray(preset.items) || preset.items.length === 0 || !Array.isArray(steps)) {
        return invalidPreset();
    }

    const catalog = new Map<string, { item: BuilderIngredient; stepId: string }>();
    for (const step of steps) {
        if (!step || typeof step.id !== 'string' || !Array.isArray(step.subgroups)) return invalidPreset();
        for (const subgroup of step.subgroups) {
            if (!subgroup || !Array.isArray(subgroup.items)) return invalidPreset();
            for (const item of subgroup.items) {
                if (!item || typeof item.id !== 'string' || !item.id || catalog.has(item.id)) {
                    return invalidPreset();
                }
                catalog.set(item.id, { item, stepId: step.id });
            }
        }
    }

    const selectionsByStep = new Map<string, ResolvedBuilderIngredient[]>();
    const seen = new Set<string>();
    const loadedIds: string[] = [];
    for (const id of preset.items) {
        if (typeof id !== 'string' || !id || seen.has(id)) return invalidPreset();
        const entry = catalog.get(id);
        if (!entry) return invalidPreset();
        seen.add(id);
        loadedIds.push(id);
        const stepSelections = selectionsByStep.get(entry.stepId) ?? [];
        stepSelections.push({
            ...entry.item,
            _meta: { stepId: entry.stepId },
        });
        selectionsByStep.set(entry.stepId, stepSelections);
    }

    const quote = computeOrderTotal(loadedIds.map(id => ({ id })), base, 'salad');
    if (
        !quote.valid
        || quote.items.length !== loadedIds.length
        || quote.items.some((item, index) => item.id !== loadedIds[index])
    ) return invalidPreset();

    return { ...quote, selections: Object.fromEntries(selectionsByStep) };
}

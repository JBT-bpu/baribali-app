import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateNutritionRange } from '../../src/lib/nutritionSimulator';

const veggie = (id: string, tags: string[] = []) => ({ id, tags, _meta: { stepId: 'veggies' } });
const fixed = (id: string, stepId: string) => ({ id, _meta: { stepId } });

test('BariMeter makes bowl size materially affect shared-volume ingredients', () => {
    const items = [
        veggie('lettuce'), veggie('tomato'), veggie('cucumber'), veggie('carrot'),
        veggie('quinoa', ['grain']), veggie('chickpeas', ['grain']), veggie('baked_sweet_potato'),
    ];

    const small = estimateNutritionRange(items, 750);
    const large = estimateNutritionRange(items, 1500);

    assert.ok(small && large);
    assert.ok(large.calories.low > small.calories.low);
    assert.ok(large.calories.midpoint > small.calories.midpoint);
});

test('BariMeter treats sauces as fixed portions and surfaces their impact', () => {
    const ingredients = [veggie('lettuce'), veggie('tomato'), veggie('cucumber')];
    const plain = estimateNutritionRange(ingredients, 1000);
    const dressed = estimateNutritionRange([...ingredients, fixed('olive_oil', 'sauces')], 1000);

    assert.ok(plain && dressed);
    assert.ok(dressed.calories.midpoint > plain.calories.midpoint + 100);
    assert.ok(dressed.drivers.includes('רטבים'));
});

test('BariMeter shares bowl volume instead of multiplying portions without limit', () => {
    const seven = Array.from({ length: 7 }, () => veggie('quinoa', ['grain']));
    const fourteen = Array.from({ length: 14 }, () => veggie('quinoa', ['grain']));
    const normal = estimateNutritionRange(seven, 1000);
    const crowded = estimateNutritionRange(fourteen, 1000);

    assert.ok(normal && crowded);
    assert.equal(crowded.calories.midpoint, normal.calories.midpoint);
});

test('BariMeter never invents values for unknown selections', () => {
    const estimate = estimateNutritionRange([veggie('tomato'), veggie('future_item')], 1000);

    assert.ok(estimate);
    assert.equal(estimate.coverage, 50);
    assert.equal(estimateNutritionRange([veggie('future_item')], 1000), null);
    assert.equal(estimateNutritionRange([], 1000), null);
});


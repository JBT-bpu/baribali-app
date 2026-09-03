import assert from 'node:assert/strict';
import test from 'node:test';

import { STEPS, TORTILLA_STEPS } from '../../src/data/salad-data.js';
import { effectiveBase, effectiveItemPriceMap, effectiveSizePrice } from '../../src/lib/menuConfig';
import { computeOrderTotal, type CanonicalOrderItem, type ComputedTotal } from '../../src/lib/pricing';

interface TestItem { id: string; he: string; icon: string; price: number }
interface TestSubgroup { items: TestItem[] }
interface TestStep { id: string; subgroups: TestSubgroup[] }

const saladSteps = STEPS as TestStep[];
const allCatalogItems = [...saladSteps, ...(TORTILLA_STEPS as TestStep[])]
    .flatMap(step => step.subgroups.flatMap(subgroup => subgroup.items));

function step(stepId: string): TestStep {
    const found = saladSteps.find(candidate => candidate.id === stepId);
    assert.ok(found, `missing test catalog step: ${stepId}`);
    return found;
}

function stepIds(stepId: string): string[] {
    return step(stepId).subgroups.flatMap(subgroup => subgroup.items.map(item => item.id));
}

function canonical(id: string): CanonicalOrderItem {
    const item = allCatalogItems.find(candidate => candidate.id === id);
    assert.ok(item, `missing test catalog item: ${id}`);
    return {
        id: item.id,
        he: item.he,
        icon: item.icon,
        price: effectiveItemPriceMap()[id],
    };
}

function inputs(ids: string[]): { id: string }[] {
    return ids.map(id => ({ id }));
}

function assertInvalid(result: ComputedTotal): void {
    assert.deepEqual(result, { valid: false, total: 0, items: [] });
}

test('server pricing returns canonical catalog snapshots in submitted order', () => {
    const base = effectiveSizePrice(750);
    const ids = ['lettuce', 'caesar', 'halloumi_p'];
    const prices = effectiveItemPriceMap();

    assert.deepEqual(computeOrderTotal(inputs(ids), base), {
        valid: true,
        total: base + prices.lettuce + prices.caesar + prices.halloumi_p,
        items: ids.map(canonical),
    });
});

test('client-supplied fields are discarded rather than persisted', () => {
    const base = effectiveSizePrice(1000);
    const canonicalItem = canonical('halloumi_p');
    const tamperedItem = {
        id: 'halloumi_p',
        price: -10_000,
        he: '<script>fake</script>',
        icon: 'https://attacker.invalid/tracker.png',
        _meta: { stepId: 'veggies' },
        arbitrary: 'not part of the order contract',
    };

    assert.deepEqual(computeOrderTotal([tamperedItem], base), {
        valid: true,
        total: base + canonicalItem.price,
        items: [canonicalItem],
    });
});

test('unknown, malformed and prototype-chain item ids fail closed', () => {
    const base = effectiveSizePrice(750);
    const invalidInputs: unknown[][] = [
        [{ id: 'not-in-the-menu' }],
        [{ id: '' }],
        [{ id: 42 }],
        [{}],
        [null],
        [[]],
        [{ id: 'constructor' }],
        [{ id: 'toString' }],
        [{ id: '__proto__' }],
    ];

    for (const itemList of invalidInputs) assertInvalid(computeOrderTotal(itemList, base));
});

test('duplicate item ids are rejected globally', () => {
    assertInvalid(computeOrderTotal(
        [{ id: 'lettuce' }, { id: 'lettuce', he: 'different payload' }],
        effectiveSizePrice(750),
    ));
});

test('invalid bases and non-array item payloads are rejected', () => {
    assertInvalid(computeOrderTotal([{ id: 'lettuce' }], 1));
    assertInvalid(computeOrderTotal([{ id: 'lettuce' }], Number.NaN));
    assertInvalid(computeOrderTotal({ id: 'lettuce' }, effectiveSizePrice(750)));
});

test('an explicit product must agree with its configured base', () => {
    assert.equal(computeOrderTotal(
        [{ id: 'lettuce' }],
        effectiveSizePrice(750),
        'salad',
    ).valid, true);
    assert.equal(computeOrderTotal(
        [{ id: 'lettuce' }],
        effectiveBase('tortilla'),
        'tortilla',
    ).valid, true);
    assertInvalid(computeOrderTotal(
        [{ id: 'lettuce' }],
        effectiveSizePrice(750),
        'tortilla',
    ));
    assertInvalid(computeOrderTotal(
        [{ id: 'lettuce' }],
        effectiveBase('tortilla'),
        'salad',
    ));
    assertInvalid(computeOrderTotal(
        [{ id: 'lettuce' }],
        effectiveSizePrice(750),
        'bowl',
    ));
});

test('the included-protein limit allows one pick and rejects two', () => {
    const base = effectiveSizePrice(750);
    const proteins = stepIds('protein');
    assert.equal(computeOrderTotal(inputs(proteins.slice(0, 1)), base).valid, true);
    assertInvalid(computeOrderTotal(inputs(proteins.slice(0, 2)), base));
});

test('the sauce limit allows two picks and rejects three', () => {
    const base = effectiveSizePrice(750);
    const sauces = stepIds('sauces');
    assert.equal(computeOrderTotal(inputs(sauces.slice(0, 2)), base).valid, true);
    assertInvalid(computeOrderTotal(inputs(sauces.slice(0, 3)), base));
});

test('finish permits one choice per subgroup but not two from either subgroup', () => {
    const base = effectiveSizePrice(750);
    const finish = step('finish');
    const mixing = finish.subgroups[0].items.map(item => item.id);
    const sides = finish.subgroups[1].items.map(item => item.id);

    assert.equal(computeOrderTotal(inputs([mixing[0], sides[0]]), base).valid, true);
    assertInvalid(computeOrderTotal(inputs(mixing.slice(0, 2)), base));
    assertInvalid(computeOrderTotal(inputs(sides.slice(0, 2)), base));
});

test('ordinary ingredient caps match the salad and current tortilla builders', () => {
    const veggies = stepIds('veggies');
    const saladBase = effectiveSizePrice(750);
    const tortillaBase = effectiveBase('tortilla');

    assert.equal(computeOrderTotal(inputs(veggies.slice(0, 14)), saladBase).valid, true);
    assertInvalid(computeOrderTotal(inputs(veggies.slice(0, 15)), saladBase));
    assert.equal(computeOrderTotal(inputs(veggies.slice(0, 8)), tortillaBase).valid, true);
    assertInvalid(computeOrderTotal(inputs(veggies.slice(0, 9)), tortillaBase));
});

test('protein, sauces, finish and upgrades do not consume the ingredient allowance', () => {
    const ids = [
        ...stepIds('veggies').slice(0, 14),
        stepIds('protein')[0],
        ...stepIds('sauces').slice(0, 2),
        step('finish').subgroups[0].items[0].id,
        step('finish').subgroups[1].items[0].id,
        ...stepIds('upgrade').slice(0, 3),
    ];

    assert.equal(computeOrderTotal(inputs(ids), effectiveSizePrice(1500)).valid, true);
});

test('premium proteins are upgrades, not extra included-protein picks', () => {
    assert.equal(computeOrderTotal(
        inputs(['egg', 'halloumi_p', 'tuna_p']),
        effectiveSizePrice(750),
    ).valid, true);
});

test('current tortilla orders use salad item ids, exclude finish and reject inactive t_* ids', () => {
    const base = effectiveBase('tortilla');
    assert.equal(computeOrderTotal(inputs(['lettuce', 'egg', 'caesar']), base).valid, true);
    assertInvalid(computeOrderTotal(inputs(['mix_no_sauce']), base));
    assertInvalid(computeOrderTotal(inputs(['t_lettuce']), base));
});

test('empty and optional-step selections remain valid', () => {
    const base = effectiveSizePrice(750);
    assert.deepEqual(computeOrderTotal([], base), { valid: true, total: base, items: [] });
    assert.equal(computeOrderTotal(inputs(['lettuce']), base).valid, true);
});

test('catalog ids are globally unique', () => {
    const ids = allCatalogItems.map(item => item.id);
    assert.equal(new Set(ids).size, ids.length);
});

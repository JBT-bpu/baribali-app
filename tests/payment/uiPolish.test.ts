import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isPreparationChoice, preparationLabel } from '../../src/lib/summaryPresentation';
import { estimateNutritionRange } from '../../src/lib/nutritionSimulator';

const builder = readFileSync(new URL('../../src/components/builder/BariBaliBuilder.jsx', import.meta.url), 'utf8');
const summary = readFileSync(new URL('../../src/components/builder/SummaryView.jsx', import.meta.url), 'utf8');

test('preparation presentation preserves food and unknown selections', () => {
    for (const id of ['mix_no_sauce', 'no_mix', 'none_side']) assert.equal(isPreparationChoice({ id }), true);
    for (const id of ['bread', 'croutons_s', 'bread_p', 'egg', 'future_finish']) assert.equal(isPreparationChoice({ id }), false);
    assert.equal(preparationLabel({ id: 'none_side', he: 'ללא' }), 'ללא תוספת צד');
    assert.equal(preparationLabel({ id: 'no_mix', he: 'לא לערבב' }), 'לא לערבב');
});

test('separating pictured ingredients never alters the order or nutrition inputs', () => {
    const all = Object.freeze([
        Object.freeze({ id: 'egg', he: 'ביצה', _meta: { stepId: 'protein' } }),
        Object.freeze({ id: 'mix_no_sauce', he: 'לערבב ללא רוטב', _meta: { stepId: 'finish' } }),
        Object.freeze({ id: 'none_side', he: 'ללא', _meta: { stepId: 'finish' } }),
    ]);
    const before = estimateNutritionRange([...all], 1000);
    assert.deepEqual(all.filter(it => !isPreparationChoice(it)).map(it => it.id), ['egg']);
    assert.equal(all.filter(isPreparationChoice).length, 2);
    assert.equal(all.length, 3);
    assert.deepEqual(estimateNutritionRange([...all], 1000), before);
    assert.match(summary, /estimateNutritionRange\(all, sizeMl\)/);
});

test('large ingredient cards reserve room for sibling information and price controls', () => {
    assert.match(builder, /<Icon src=\{item.icon\} size="64px"/);
    assert.match(builder, /chipName: \{ fontSize: "13px"/);
    assert.match(builder, /padding: "14px 6px 44px"/);
    assert.match(builder, /chipInfoHit: \{[\s\S]*?insetInlineEnd: "2px"[\s\S]*?width: "44px", height: "44px"/);
    assert.match(builder, /chipCost: \{[\s\S]*?insetInlineStart: "6px"/);
    assert.match(builder, /<span style=\{S.chipCost\}><bdi dir="ltr">/);
    const costStyle = builder.slice(builder.indexOf('chipCost: {'), builder.indexOf('\n', builder.indexOf('chipCost: {')));
    assert.doesNotMatch(costStyle, /direction: "ltr"/, 'numeric direction must not reverse the logical price inset');
    assert.match(builder, /!reducedMotion && lastAdd === item.id/);
});

test('nutrition simulation keeps explicit units and does not invent a health score', () => {
    assert.match(summary, /label: 'פחמימות'/);
    assert.match(summary, /fontSize: "32px"/);
    assert.match(summary, /סימולציה/);
    assert.match(summary, /הערכה לפי מנות טיפוסיות · הכמויות וההכנה בפועל משתנות/);
    assert.doesNotMatch(summary, /nutritionMeterFill|bariMeterFill|bariMeterGlow/);
});

test('short summary viewports retain pickup and legal consent while compacting decoration', () => {
    assert.match(summary, /@media \(max-height: 700px\)/);
    assert.match(summary, /\.summary-brand \{ height:48px !important; \}/);
    assert.match(summary, /aria-controls="pickup-time-picker"/);
    for (const href of ['/terms', '/privacy', '/cancellations']) assert.ok(summary.includes(`href="${href}"`));
    assert.doesNotMatch(summary, /height: "110px"/);
});

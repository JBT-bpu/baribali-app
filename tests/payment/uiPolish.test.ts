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

test('compact ingredient cards keep readable artwork and separate corner controls', () => {
    assert.match(builder, /<Icon src=\{item.icon\} size="56px"/);
    assert.match(builder, /chipName: \{ fontSize: "13px"/);
    assert.match(builder, /padding: "28px 6px 8px"/);
    assert.match(builder, /minHeight: "134px"/);
    assert.match(builder, /gridTemplateColumns: "repeat\(3, minmax\(0, 1fr\)\)"/);
    assert.match(builder, /chipInfoHit: \{[\s\S]*?top: 0, insetInlineEnd: 0[\s\S]*?width: "44px", height: "44px"/);
    assert.match(builder, /chipCost: \{[\s\S]*?top: "8px", insetInlineStart: "4px"/);
    assert.match(builder, /<span style=\{S.chipCost\}><bdi dir="ltr">/);
    const costStyle = builder.slice(builder.indexOf('chipCost: {'), builder.indexOf('\n', builder.indexOf('chipCost: {')));
    assert.doesNotMatch(costStyle, /direction: "ltr"/, 'numeric direction must not reverse the logical price inset');
    assert.match(builder, /!reducedMotion && lastAdd === item.id/);
});

test('selection accents do not grow or animate the ingredient-card borders', () => {
    const visual = builder.slice(builder.indexOf('function chipVisual('), builder.indexOf('\n}', builder.indexOf('function chipVisual(')));
    assert.doesNotMatch(visual, /2\.5px|translateY|animationIterationCount|animationName: "shimmer"/);
    assert.match(visual, /border: "1px solid rgba\(240,208,96,0\.95\)"/);
    assert.match(builder, /aria-checked=\{on\}/);
    assert.match(builder, /\{on && <div style=\{S.check\}/);
    assert.match(builder, /title="פופולרי"/);
    assert.match(builder, /item.pop \? ", פופולרי"/);
});

test('card and bowl removal have no dangling animation setter', () => {
    assert.doesNotMatch(builder, /setLastRemove\(/);
    assert.match(builder, /\[sid\]: cur.filter\(i => i.id !== item.id\)/);
    assert.match(builder, /next\[k\] = v.filter\(i => i.id !== itemId\)/);
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

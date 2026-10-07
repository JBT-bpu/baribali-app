import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const summary = source('src/components/builder/SummaryView.jsx');
const frame = source('src/components/builder/ui/BariMeterFrame.tsx');
const css = source('src/components/builder/ui/BariMeterFrame.module.css');

test('Atelier uses dedicated encoded artwork, not a flattened order screenshot', () => {
    let total = 0;
    for (const name of ['frame', 'macros', 'bowl']) {
        const filename = `barimeter-atelier-${name}-v1.webp`;
        const data = readFileSync(new URL(`../../public/builder-assets/${filename}`, import.meta.url));
        assert.equal(data.toString('ascii', 0, 4), 'RIFF');
        assert.equal(data.toString('ascii', 8, 12), 'WEBP');
        assert.ok(data.length < 220_000);
        assert.ok((frame + css).includes(filename));
        total += data.length;
    }
    assert.ok(total < 370_000);
    assert.match(frame, /<h2 className=\{styles.srOnly\}>BariMeter<\/h2>/);
    assert.match(css, /border-image-slice: 365 53 135 53 fill/);
    assert.doesNotMatch(summary, /summary-panel\.webp|style=\{S.panelNut\}/);
});

test('Atelier keeps real calorie and macro ranges, RTL units and honest missing coverage', () => {
    assert.match(summary, /\{estimate.calories.low\}–\{estimate.calories.high\}/);
    assert.match(summary, /\{value.low\}–\{value.high\}/);
    assert.match(summary, /dir="ltr" className=\{meterStyles.calories\}/);
    assert.match(summary, /dir="ltr" className=\{meterStyles.macroValue\}/);
    assert.match(summary, /if \(!estimate\)/);
    assert.match(summary, /אין הערכה תזונתית לבחירות האלה/);
    assert.match(summary, /estimate.coverage < 100 && <p/);
    assert.match(summary, /חלק מהבחירות אינן כלולות בהערכה/);
    assert.match(summary, /הערכה לפי מנות טיפוסיות · הכמויות וההכנה בפועל משתנות/);
    assert.doesNotMatch(summary, /healthScore|nutritionMeterFill/);
});

test('Atelier data drives frame height and reflows rather than clipping enlarged text', () => {
    assert.match(css, /container-type: inline-size/);
    assert.match(css, /@container \(max-width: 19rem\)/);
    assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /flex-wrap: wrap/);
    assert.doesNotMatch(css, /border-width:\s*[\d.]+%/);
    assert.match(css, /@media \(forced-colors: active\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /\.ingredient:focus-visible/);
});

test('Atelier pictures actual ingredients without preparation instructions or checkout mutations', () => {
    assert.match(summary, /all.filter\(it => !isPreparationChoice\(it\)\)/);
    assert.match(summary, /<BariMeterFrame bowl=\{bowlRows.map/);
    assert.match(summary, /onClick=\{\(\) => highlightStep\(it\)\}/);
    assert.match(summary, /<Icon src=\{it.icon\} size="100%"/);
    assert.match(summary, /הדגש את \$\{it.he\} ברשימת הבחירות/);
    assert.match(summary, /estimateNutritionRange\(all, sizeMl\)/);
    assert.doesNotMatch(frame, /fetch\(|setInterval|useEffect|requestHostedPayment/);
});

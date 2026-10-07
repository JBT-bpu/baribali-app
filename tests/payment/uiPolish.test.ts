import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isPreparationChoice, preparationLabel } from '../../src/lib/summaryPresentation';
import { estimateNutritionRange } from '../../src/lib/nutritionSimulator';
import { PANEL, panelHeight, statsColumnHeight, ringFor } from '../../src/components/builder/ui/heroBowlGeometry';

const builder = readFileSync(new URL('../../src/components/builder/BariBaliBuilder.jsx', import.meta.url), 'utf8');
const summary = readFileSync(new URL('../../src/components/builder/SummaryView.jsx', import.meta.url), 'utf8');
const meterCss = readFileSync(new URL('../../src/components/builder/ui/BariMeterFrame.module.css', import.meta.url), 'utf8');
const brandHeader = readFileSync(new URL('../../src/components/builder/ui/BuilderBrandHeader.tsx', import.meta.url), 'utf8');
const brandHeaderCss = readFileSync(new URL('../../src/components/builder/ui/BuilderBrandHeader.module.css', import.meta.url), 'utf8');
const home = readFileSync(new URL('../../src/app/home2/page.tsx', import.meta.url), 'utf8');
const bowl = readFileSync(new URL('../../src/components/builder/ui/HeroBowlCard.jsx', import.meta.url), 'utf8');
const bowlCss = readFileSync(new URL('../../src/components/builder/ui/HeroBowlCard.module.css', import.meta.url), 'utf8');
const field = readFileSync(new URL('../../src/components/ui/GoldField.tsx', import.meta.url), 'utf8');

test('compact bowl geometry stays constant through base ingredients, extras and preparation', () => {
    assert.equal(PANEL.chipW, 44);
    for (const width of [320, 360, 374, 375, 393, 430]) {
        for (let count = 0; count <= 64; count++) {
            assert.equal(panelHeight(width, count), panelHeight(width, 0));
            assert.ok(statsColumnHeight(count, width) <= ringFor(width));
        }
        assert.ok(panelHeight(width, 32) <= 122);
    }
    assert.match(bowl, /all\.map\(item =>/);
    assert.match(bowlCss, /overflow-x:auto/);
    assert.match(bowlCss, /flex:0 0 44px/);
    assert.match(bowlCss, /:focus-visible/);
    assert.match(bowl, /onFocus=\{event => event\.currentTarget\.scrollIntoView\(/);
    assert.match(bowl, /!reducedMotion && lastAdd === item\.id/);
    assert.doesNotMatch(bowl, /Lottie|Tilt|setTimeout|fetch\(/);
});

test('new bowls remain lightweight WebP artwork and the existing art is preserved', () => {
    const paths = ['homepage-assets/salad-bowl-s-v2.webp', 'homepage-assets/salad-bowl-m-v2.webp', 'homepage-assets/salad-bowl-l-v2.webp', 'builder-assets/builder-bowl-empty-v2.webp'];
    for (const path of paths) {
        const art = readFileSync(new URL(`../../public/${path}`, import.meta.url));
        assert.equal(art.toString('ascii', 0, 4), 'RIFF');
        assert.equal(art.toString('ascii', 8, 12), 'WEBP');
        assert.ok(art.length < 140 * 1024);
    }
    assert.ok(readFileSync(new URL('../../public/homepage-assets/card-salad.png', import.meta.url)).length > 0);
    assert.doesNotMatch(builder, /fetch\(file\)|const Lottie/);
    assert.doesNotMatch(home, /import\('lottie-react'\)|fetch\('\/cat-salad-bowl\.json'\)/);
});

test('decorative field pauses while hidden and resumes with reduced-motion still respected', () => {
    assert.match(field, /!motionPreference\.matches && !document\.hidden/);
    assert.match(field, /document\.addEventListener\('visibilitychange', syncAnimation\)/);
    assert.match(field, /document\.removeEventListener\('visibilitychange', syncAnimation\)/);
    assert.match(field, /else cancelAnimationFrame\(raf\)/);
});

test('customer backdrops retain the original luminous photo and full particle density', () => {
    const sizePicker = readFileSync(new URL('../../src/components/home/SizePicker.tsx', import.meta.url), 'utf8');
    const tracking = readFileSync(new URL('../../src/app/order/[id]/OrderStatusView.tsx', import.meta.url), 'utf8');
    assert.ok(home.includes('linear-gradient(to bottom, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.42) 50%, rgba(2,10,2,0.8) 100%)'));
    assert.ok(tracking.includes('url(/homepage-assets/BG_8K.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)'));
    for (const screen of [home, sizePicker, tracking]) {
        assert.match(screen, /<GoldField/);
        assert.doesNotMatch(screen, /<GoldField[^>]*density=/);
    }
    assert.match(field, /density = 1/);
});

test('builder content never waits invisibly for a mount-animation timer', () => {
    assert.match(builder, /const \[anim, setAnim\] = useState\(null\)/);
    assert.doesNotMatch(builder, /opacity: anim === "enter" \? 0/);
    assert.doesNotMatch(builder, /setTimeout\(\(\) => setAnim\(null\), 500\)/);
});

test('the builder header uses lightweight dedicated artwork instead of the wordmark backdrop', () => {
    assert.match(builder, /const builderHeaderImage = "\/builder-assets\/builder-leaf-frame-v1\.webp"/);
    const frameCss = readFileSync(new URL('../../src/components/builder/ui/BuilderVisuals.module.css', import.meta.url), 'utf8');
    const headerStyle = builder.slice(builder.indexOf('header: {'), builder.indexOf('\n', builder.indexOf('header: {')));
    assert.ok(builder.includes('"--builder-frame": `url(${builderHeaderImage})`'));
    assert.doesNotMatch(headerStyle, /backgroundImage|backgroundSize/, 'frame is nine-sliced, not stretched behind controls');
    assert.match(frameCss, /border-image-slice: 145 190 fill/);
    assert.match(frameCss, /pointer-events: none/);
    assert.match(headerStyle, /backgroundColor: "#0b2312"/);
    assert.match(builder, /<BuilderBrandHeader>/, 'starter branding uses the selected full-logo cartouche');
    const art = readFileSync(new URL('../../public/builder-assets/builder-leaf-frame-v1.webp', import.meta.url));
    assert.equal(art.toString('ascii', 0, 4), 'RIFF');
    assert.equal(art.toString('ascii', 8, 12), 'WEBP');
    assert.ok(art.length < 64 * 1024, 'decorative header must remain a lightweight asset');
});

test('matching card surfaces use restrained shading without adding repeated decorative images', () => {
    const chipStyle = builder.slice(builder.indexOf('chip: {'), builder.indexOf('\n', builder.indexOf('chip: {')));
    assert.match(chipStyle, /radial-gradient\(ellipse/);
    assert.match(chipStyle, /inset 0 1px 0/);
    assert.doesNotMatch(chipStyle, /url\(|backdropFilter/);
    assert.match(builder, /style=\{\{ \.\.\.S\.navBtn, opacity: soundOn/, 'sound is a neutral utility, not a destructive control');
});

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
    assert.match(builder, /padding: "28px 6px 6px"/);
    assert.match(builder, /minHeight: "120px"/);
    assert.match(builder, /chipName: \{[^\n]*minHeight: "20px"/);
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
    assert.match(summary, /className=\{meterStyles.calories\}/);
    assert.match(meterCss, /font-size: clamp\(2rem, 12cqw, 3rem\)/);
    assert.match(summary, /סימולציה/);
    assert.match(summary, /הערכה לפי מנות טיפוסיות · הכמויות וההכנה בפועל משתנות/);
    assert.doesNotMatch(summary, /nutritionMeterFill|bariMeterFill|bariMeterGlow/);
});

test('short summary viewports retain pickup and legal consent while compacting decoration', () => {
    assert.match(summary, /@media \(max-height: 700px\)/);
    assert.match(brandHeaderCss, /@media \(max-height: 700px\)/);
    assert.match(brandHeaderCss, /max-height: 480px\) and \(min-width: 600px/);
    assert.doesNotMatch(brandHeaderCss, /height: 82px|aspect-ratio: auto/);
    assert.match(brandHeaderCss, /object-fit: contain/);
    assert.match(summary, /aria-controls="pickup-time-picker"/);
    for (const href of ['/terms', '/privacy', '/cancellations']) assert.ok(summary.includes(`href="${href}"`));
    assert.doesNotMatch(summary, /height: "110px"/);
});

test('entry and summary share the selected compact emblem without duplicate or cropped branding', () => {
    for (const screen of [builder, summary]) {
        assert.match(screen, /<BuilderBrandHeader(?: variant="summary")?>/);
        assert.doesNotMatch(screen, /header-brand\.png/);
    }
    assert.match(brandHeader, /import Image from 'next\/image'/);
    assert.match(brandHeader, /builder-brand-emblem-v7\.webp/);
    assert.match(brandHeader, /alt="BariBali"/);
    assert.match(brandHeader, /sizes="\(max-width: 360px\) 108px, \(max-width: 440px\) 30vw, 132px"/);
    assert.match(brandHeaderCss, /--brand-width: clamp\(108px, 30vw, 132px\)/);
    assert.match(brandHeaderCss, /--brand-height: calc\(var\(--brand-width\) \* 422 \/ 488\)/);
    assert.match(brandHeaderCss, /padding-top: env\(safe-area-inset-top\)/);
    assert.doesNotMatch(brandHeaderCss, /object-fit: cover|animation:|mask-image/);
    const art = readFileSync(new URL('../../public/builder-assets/builder-brand-emblem-v7.webp', import.meta.url));
    assert.equal(art.toString('ascii', 0, 4), 'RIFF');
    assert.equal(art.toString('ascii', 8, 12), 'WEBP');
    assert.ok(art.length < 90 * 1024, 'the branded header must remain lightweight on mobile');
});

test('selected header floats on the unchanged background with real open botanical art', () => {
    assert.match(brandHeaderCss, /\.header[\s\S]*?background: transparent/);
    assert.doesNotMatch(brandHeaderCss, /linear-gradient|builder-brand-frieze-v7/);
    assert.match(brandHeaderCss, /builder-brand-wings-v8\.webp/);
    assert.match(brandHeaderCss, /center \/ contain no-repeat/);
    assert.match(brandHeaderCss, /builder-control-frame-v8\.webp/);
    assert.match(brandHeaderCss, /grid-template-columns: minmax\(0, 1fr\) calc\(var\(--brand-width\) \+ 16px\) minmax\(0, 1fr\)/);
    assert.match(brandHeader, /aria-hidden="true" data-brand-wings/);
    assert.match(brandHeaderCss, /@media \(forced-colors: active\)/);
    assert.match(summary, /url\(\/homepage-assets\/BG_8K\.webp\)/);
    assert.doesNotMatch(brandHeaderCss, /background: #071d0c/);
});

test('cartouche toolbar keeps real accessible controls and request locking', () => {
    assert.match(brandHeaderCss, /min-height: 44px/);
    assert.match(brandHeaderCss, /button:focus-visible/);
    assert.match(brandHeaderCss, /button:disabled/);
    assert.match(summary, /aria-label="חזרה לעריכת ההזמנה"[\s\S]*?disabled=\{requestLocked\}[\s\S]*?onClick=\{leaveSummary\}/);
    assert.match(summary, /aria-label=\{`סך ההזמנה \$\{checkoutTotal\} שקלים`\}/);
    assert.match(summary, /<h1>ההזמנה שלכם<\/h1>/);
});

test('size selection warms the selected native header and chef ornament layers', () => {
    for (const name of ['builder-brand-emblem-v7', 'builder-brand-wings-v8', 'builder-control-frame-v8', 'builder-chef-divider-v8']) {
        assert.ok(home.includes(`/builder-assets/${name}.webp`));
    }
    assert.doesNotMatch(home, /builder-brand-frieze-v7\.webp/);
    assert.doesNotMatch(home, /header-brand\.png/);
});

test('checkout keeps the price and title in native reserved lanes beside the emblem', () => {
    assert.match(summary, /<BuilderBrandHeader variant="summary">/);
    assert.match(brandHeaderCss, /data-variant='summary'\] h1 \{ grid-row: 2;/);
    assert.match(brandHeaderCss, /data-variant='summary'[\s\S]*grid-column: 3;[\s\S]*grid-row: 1;/);
    assert.match(brandHeaderCss, /@media \(max-width: 279px\)/);
    assert.doesNotMatch(brandHeader, /fetch\(|useEffect|requestAnimationFrame/);
});

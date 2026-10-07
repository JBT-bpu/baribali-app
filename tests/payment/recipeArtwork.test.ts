import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { PRESETS } from '../../src/data/salad-data.js';
import { matchingRecipeArtwork } from '../../src/lib/recipeArtwork';

const source = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const builder = source('src/components/builder/BariBaliBuilder.jsx');

test('each of the twelve current recipes has a distinct matching illustration', () => {
    assert.equal(PRESETS.length, 12);
    const paths = PRESETS.map(preset => matchingRecipeArtwork(preset));
    assert.equal(new Set(paths).size, 12);
    assert.equal(paths.includes(null), false);
    PRESETS.forEach(preset => {
        assert.equal(matchingRecipeArtwork({ ...preset, items: [...preset.items].reverse() }), matchingRecipeArtwork(preset));
        assert.equal(matchingRecipeArtwork({ ...preset, items: preset.items.slice(1) }), null);
        assert.equal(matchingRecipeArtwork({ ...preset, items: [...preset.items, 'future_ingredient'] }), null);
        assert.equal(matchingRecipeArtwork({ ...preset, items: [preset.items[1], ...preset.items.slice(1)] }), null);
        assert.equal(matchingRecipeArtwork({ ...preset, items: ['future_ingredient', ...preset.items.slice(1)] }), null);
    });
});

test('unknown/prototype names fail closed and decorative art cannot become pricing authority', () => {
    for (const id of ['unknown', 'constructor', '__proto__', 'toString']) {
        assert.equal(matchingRecipeArtwork({ id, items: PRESETS[0].items }), null);
    }
    const artSource = source('src/lib/recipeArtwork.ts');
    assert.doesNotMatch(artSource, /computeOrderTotal|resolveChefPreset|price:|total:|fetch\(/);
    assert.match(builder, /src=\{presetAvailable \? matchingRecipeArtwork\(p\) : null\}/);
    assert.match(builder, /presetQuote\.total/);
    assert.match(builder, /price=\{effectiveSizePrice\(sc.ml\)\}/);
});

test('exported bowls have real transparency, distinct contents and bounded mobile payloads', async () => {
    let bytes = 0;
    const buffers = new Set<string>();
    for (const preset of PRESETS) {
        const path = matchingRecipeArtwork(preset)!;
        const buffer = readFileSync(new URL(`../../public${path}`, import.meta.url));
        const metadata = await sharp(buffer).metadata();
        const stats = await sharp(buffer).stats();
        assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [208, 208, true]);
        assert.equal(stats.channels.at(-1)?.min, 0);
        assert.ok(buffer.length < 24 * 1024);
        bytes += buffer.length;
        buffers.add(buffer.toString('base64'));
    }
    assert.equal(buffers.size, 12);
    assert.ok(bytes < 250 * 1024);
    for (const [name, width, height, limit] of [
        ['start-hero-seal-v2.webp', 1080, 538, 110 * 1024],
        ['builder-bowl-empty-seal-v1.webp', 288, 288, 30 * 1024],
        ['button-leaf-seal-v2.webp', 512, 128, 24 * 1024],
        ['builder-leaf-frame-v1.webp', 960, 320, 24 * 1024],
    ] as const) {
        const buffer = readFileSync(new URL(`../../public/builder-assets/${name}`, import.meta.url));
        const metadata = await sharp(buffer).metadata();
        assert.deepEqual([metadata.width, metadata.height], [width, height]);
        assert.ok(buffer.length < limit);
        bytes += buffer.length;
    }
    assert.ok(bytes < 400 * 1024);
});

test('the large entry bowl retains native draft, facts, sibling sizing and failure fallback', () => {
    const card = source('src/components/builder/ui/BuilderStartCard.tsx');
    const css = source('src/components/builder/ui/BuilderStartCard.module.css');
    assert.match(card, /onClick=\{onStart\}/);
    assert.match(card, /aria-label=\{`\$\{action\} סלט \$\{sizeLabel\}`\}/);
    assert.match(card, /hasDraft \? 'המשיכו לבנות'/);
    assert.match(card, /₪\{price\}/);
    assert.match(card, /onError=\{\(\) => setArtFailed\(true\)\}/);
    assert.match(card, /<BuilderArtFrame \/>/);
    assert.match(css, /grid-template-areas: 'food copy'/);
    assert.doesNotMatch(css.slice(0, css.indexOf('.body')), /aspect-ratio:|height: [0-9]+px/);
    assert.match(css, /flex-shrink: 0/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /forced-colors: active/);
    assert.doesNotMatch(card, /<a|<input|<button[\s\S]*?<button/);
    assert.match(builder, /<HeaderBanner[\s\S]*?sizeButtonRef=\{changeSizeButtonRef\}/);
    assert.doesNotMatch(builder, /<BuilderStartCard[\s\S]*?\/>\s*<button\s*ref=\{changeSizeButtonRef\}/,
        'size selection has one header control, not a duplicate below the primary action');
    const recipeArt = source('src/components/builder/ui/ChefRecipeArt.tsx');
    assert.match(recipeArt, /failedSrc !== src \? src : fallbackSrc/);
    assert.match(recipeArt, /size = 52/);
    assert.match(recipeArt, /width=\{size\} height=\{size\}/);
    assert.doesNotMatch(recipeArt, /useEffect|fetch\(/);
    assert.match(builder, /gap: "6px", padding: "6px 8px", minHeight: "66px"/);
});

test('utility controls and footer preserve state, RTL direction, confirmation and native totals', () => {
    assert.match(builder, /onClick=\{back\}[^\n]*?<ArrowRight/);
    assert.match(builder, /onClick=\{next\}[^\n]*?<ArrowLeft/);
    assert.match(builder, /onClick=\{requestClearDraft\}[\s\S]*?disabled=\{all.length === 0\}/);
    assert.match(builder, /aria-pressed=\{soundOn\}/);
    assert.match(builder, /soundOn \? <Volume2[\s\S]*?<VolumeX/);
    assert.match(builder, /<ClearConfirmModal open=\{showClearConfirm\}/);
    assert.match(builder, /aria-label=\{`שלבי ההרכבה, שלב/);
    assert.match(builder, /i > step \+ 1/);
    assert.match(builder, /₪\{displayTotal\}/);
    assert.doesNotMatch(builder, /🔊|🔇|shimmer 3s|S\.resetBtn|S\.heroBtn/);
    const bowl = source('src/components/builder/ui/HeroBowlCard.jsx');
    assert.match(bowl, /ingredientCount > 0 && <svg/);
    assert.match(bowl, /role="progressbar"/);
    assert.match(bowl, /all\.map\(item =>/);
    assert.match(bowl, /onClick=\{\(\) => onRemove\(item.id\)\}/);
});

test('layered entry uses the rectangular plaque without a flattened card or geometry observer', async () => {
    const card = source('src/components/builder/ui/BuilderStartCard.tsx');
    const cardCss = source('src/components/builder/ui/BuilderStartCard.module.css');
    const visualCss = source('src/components/builder/ui/BuilderVisuals.module.css');
    const layerCss = source('src/components/builder/ui/BuilderArtFrame.module.css');
    assert.match(card, /src="\/builder-assets\/entry-bowl-layer-v1\.webp"/);
    assert.doesNotMatch(card, /start-hero-seal-v2\.webp/);
    assert.match(visualCss, /url\('\/builder-assets\/button-leaf-seal-v2\.webp'\)/);
    assert.match(layerCss, /border-radius: 8px/);
    assert.match(visualCss, /\.actionSeal \{[^}]*border-radius: 8px/);
    assert.doesNotMatch(cardCss + visualCss, /border-radius: 100px/);
    assert.match(cardCss, /width: 100%; flex-shrink: 0/);
    assert.match(cardCss, /@container \(max-width: 290px\)/);
    assert.doesNotMatch(card, /ResizeObserver|useEffect|cloneNode|getBoundingClientRect/);
    assert.match(cardCss, /object-fit: contain/);
    assert.doesNotMatch(cardCss, /object-fit: cover|overflow: hidden|aspect-ratio:/);
    assert.match(visualCss, /min-width: 112px; min-height: 44px/);
    for (const name of ['start-hero-seal-v1.webp', 'button-leaf-seal-v1.webp']) {
        assert.ok(readFileSync(new URL(`../../public/builder-assets/${name}`, import.meta.url)).length > 0);
    }
    const button = readFileSync(new URL('../../public/builder-assets/button-leaf-seal-v2.webp', import.meta.url));
    assert.equal((await sharp(button).metadata()).hasAlpha, true);
    assert.equal((await sharp(button).stats()).channels.at(-1)?.min, 0);
});

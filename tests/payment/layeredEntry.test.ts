import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const card = source('src/components/builder/ui/BuilderStartCard.tsx');
const frame = source('src/components/builder/ui/BuilderArtFrame.tsx');
const css = source('src/components/builder/ui/BuilderArtFrame.module.css');
const builder = source('src/components/builder/BariBaliBuilder.jsx');

test('the retained open header crest preserves genuine internal alpha for rollback', async () => {
    const path = new URL('../../public/builder-assets/builder-brand-cartouche-v4.webp', import.meta.url);
    const metadata = await sharp(readFileSync(path)).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [960, 360, true]);
    const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
    assert.ok(transparent / (info.width * info.height) > 0.55, 'open areas must be alpha, not a painted backplate');
    for (const [x, y] of [[0, 0], [959, 0], [0, 359], [959, 359]]) assert.equal(data[(y * info.width + x) * 4 + 3], 0);
    assert.ok(readFileSync(path).length < 120 * 1024);
    assert.ok(readFileSync(new URL('../../public/builder-assets/builder-brand-cartouche-v3.webp', import.meta.url)).length > 0);
});

test('the retained emerald masthead remains available for rollback', async () => {
    const path = new URL('../../public/builder-assets/builder-brand-masthead-v5.webp', import.meta.url);
    const bytes = readFileSync(path);
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [960, 320, false]);
    assert.ok(bytes.length < 70 * 1024);
    assert.ok(readFileSync(new URL('../../public/builder-assets/builder-brand-cartouche-v4.webp', import.meta.url)).length > 0);
});

test('the earlier round logo remains intact for rollback', async () => {
    const bytes = readFileSync(new URL('../../public/builder-assets/builder-brand-round-v6.webp', import.meta.url));
    const metadata = await sharp(bytes).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [512, 512, false]);
    assert.ok(bytes.length < 90 * 1024);
    assert.ok(readFileSync(new URL('../../public/builder-assets/builder-brand-masthead-v5.webp', import.meta.url)).length > 0);
});

test('the compact header uses independent genuine-alpha layers with a bounded total payload', async () => {
    let total = 0;
    for (const [name, width, height] of [
        ['builder-brand-emblem-v7', 488, 422],
        ['builder-brand-frieze-v7', 1600, 143],
    ] as const) {
        const bytes = readFileSync(new URL(`../../public/builder-assets/${name}.webp`, import.meta.url));
        const metadata = await sharp(bytes).metadata();
        assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [width, height, true]);
        assert.equal((await sharp(bytes).stats()).channels.at(-1)?.min, 0);
        assert.ok(bytes.length < 90 * 1024);
        total += bytes.length;
    }
    assert.ok(total < 160 * 1024);
    const { data, info } = await sharp(readFileSync(new URL('../../public/builder-assets/builder-brand-emblem-v7.webp', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
        assert.equal(data[(y * info.width + x) * 4 + 3], 0, 'emblem corners must be true alpha rather than a rectangular backplate');
    }
});

test('generated pilot frames have transparent centers, outer margins and a bounded payload', async () => {
    let bytes = 0;
    for (const [name, width, height] of [
        ['entry-frame-layer-v1', 960, 480],
        ['recipe-frame-layer-v1', 960, 331],
    ] as const) {
        const buffer = readFileSync(new URL(`../../public/builder-assets/${name}.webp`, import.meta.url));
        const metadata = await sharp(buffer).metadata();
        assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [width, height, true]);
        const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
        assert.equal(alpha(Math.floor(width / 2), Math.floor(height / 2)), 0);
        for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) assert.equal(alpha(x, y), 0);
        assert.ok(buffer.length < 70 * 1024);
        bytes += buffer.length;
    }
    const bowl = readFileSync(new URL('../../public/builder-assets/entry-bowl-layer-v1.webp', import.meta.url));
    const metadata = await sharp(bowl).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [448, 448, true]);
    assert.equal((await sharp(bowl).stats()).channels.at(-1)?.min, 0);
    assert.ok(bowl.length < 100 * 1024);
    assert.ok(bytes + bowl.length < 220 * 1024);
});

test('frames are inert layers, do not paint the center, and never claim a button role', () => {
    assert.match(frame, /aria-hidden="true"/);
    assert.match(frame, /data-art-frame=\{variant\}/);
    assert.doesNotMatch(frame, /onClick|role=|tabIndex/);
    assert.match(css, /pointer-events: none/);
    assert.match(css, /border-image-slice: 120;/);
    assert.match(css, /border-image-slice: 115;/);
    assert.match(css, /forced-colors: active/);
});

test('the pilot keeps native canonical facts, a single hit area and motion preferences', () => {
    assert.match(card, /<button ref=\{buttonRef\} type="button" onClick=\{onStart\}/);
    assert.match(card, /₪\{price\}/);
    assert.match(card, /hasDraft \? 'המשיכו לבנות'/);
    assert.equal((card.match(/<button\b/g) || []).length, 1);
    assert.match(source('src/components/builder/ui/BuilderStartCard.module.css'), /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(card + frame, /fetch\(|setTimeout|requestAnimationFrame|computeOrderTotal/);
});

test('the material backdrop is an independent bounded background, not baked UI', async () => {
    const buffer = readFileSync(new URL('../../public/builder-assets/entry-atmosphere-background-v1.webp', import.meta.url));
    const metadata = await sharp(buffer).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [720, 480, false]);
    assert.ok(buffer.length < 90 * 1024);
    const cardCss = source('src/components/builder/ui/BuilderStartCard.module.css');
    assert.match(cardCss, /background-image: url\('\/builder-assets\/entry-atmosphere-background-v1\.webp'\)/);
    assert.match(cardCss, /background-size: cover; background-position: left center/);
    assert.match(cardCss, /inset 0 0 0 100vmax rgba\(2,16,8,0\.42\)/);
    assert.match(cardCss, /\.card::before[\s\S]*?opacity: 0\.8;/,
        'only the separate material exposes 20% of the actual page background');
    assert.doesNotMatch(cardCss.slice(0, cardCss.indexOf('.card::before')), /opacity:/,
        'card content, frame and bowl must never be dimmed with the material');
    assert.match(cardCss, /forced-colors: active[\s\S]*background: ButtonFace/);
    assert.match(cardCss, /forced-colors: active[\s\S]*box-shadow: none/);
    assert.match(card, /entry-bowl-layer-v1\.webp/);
    assert.match(card, /<BuilderArtFrame \/>/);
    assert.match(card, /₪\{price\}/);
});

test('selected secondary frames and open botanical ornaments preserve alpha and a small payload', async () => {
    let bytes = 0;
    for (const [name, width, height] of [
        ['builder-control-frame-v8', 600, 136],
        ['builder-brand-wings-v8', 900, 265],
        ['builder-chef-divider-v8', 700, 104],
    ] as const) {
        const buffer = readFileSync(new URL(`../../public/builder-assets/${name}.webp`, import.meta.url));
        const metadata = await sharp(buffer).metadata();
        assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [width, height, true]);
        const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.equal(data[(Math.floor(height / 2) * info.width + Math.floor(width / 2)) * 4 + 3], 0,
            'center must reveal the real UI/page, not a painted backplate');
        assert.ok(buffer.length < 90 * 1024);
        bytes += buffer.length;
    }
    assert.ok(bytes < 150 * 1024);
});

test('every chef recipe shares the complete layered frame and preserves recipe resolution', () => {
    assert.match(builder, /className=\{\`\$\{visuals\.recipePilot\} \$\{visuals\.recipeButton\}\`\}/);
    assert.match(builder, /className=\{visuals\.recipePilotPanel\}/);
    assert.equal((builder.match(/<BuilderArtFrame variant="recipe" \/>/g) || []).length, 2);
    assert.doesNotMatch(builder, /signature" && <BuilderArtFrame|signature" \? visuals\.recipePilot/);
    assert.match(builder, /p\.id === "signature" && <span className=\{visuals\.recipeBadge\}>מומלץ/);
    assert.match(builder, /opacity: presetAvailable \? 1 : 0\.55/);
    assert.doesNotMatch(builder, /opacity: expandedPreset && !isOpen/);
    assert.match(builder, /flex: "1 1 3em", minWidth: "min\(100%, 3em\)"/);
    assert.match(builder, /flexWrap: "wrap"/);
    assert.match(builder, /<ChefRecipeArt src=\{matchingRecipeArtwork\(ep\)\} size=\{70\}/);
    assert.match(builder, /onClick=\{\(\) => \{ loadPreset\(ep\); setExpandedPreset\(null\); \}\}/);
    assert.match(builder, /aria-expanded=\{isOpen\}/);
    assert.match(builder, /aria-controls=\{`chef-preset-\$\{p\.id\}`\}/);
    assert.match(builder, /animation: reducedMotion \? "none" : "expandIn/);
});

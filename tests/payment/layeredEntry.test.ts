import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const card = source('src/components/builder/ui/BuilderStartCard.tsx');
const frame = source('src/components/builder/ui/BuilderArtFrame.tsx');
const css = source('src/components/builder/ui/BuilderArtFrame.module.css');
const builder = source('src/components/builder/BariBaliBuilder.jsx');

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
    assert.match(cardCss, /forced-colors: active[\s\S]*background: ButtonFace/);
    assert.match(cardCss, /forced-colors: active[\s\S]*box-shadow: none/);
    assert.match(card, /entry-bowl-layer-v1\.webp/);
    assert.match(card, /<BuilderArtFrame \/>/);
    assert.match(card, /₪\{price\}/);
});

test('signature-only recipe pilot shares matching artwork and preserves recipe resolution', () => {
    assert.match(builder, /p\.id === "signature" \? visuals\.recipePilot : visuals\.leafSurface/);
    assert.match(builder, /ep\.id === "signature" \? visuals\.recipePilotPanel : undefined/);
    assert.match(builder, /<ChefRecipeArt src=\{matchingRecipeArtwork\(ep\)\} size=\{70\}/);
    assert.match(builder, /onClick=\{\(\) => \{ loadPreset\(ep\); setExpandedPreset\(null\); \}\}/);
    assert.match(builder, /aria-expanded=\{isOpen\}/);
    assert.match(builder, /aria-controls=\{`chef-preset-\$\{p\.id\}`\}/);
    assert.match(builder, /animation: reducedMotion \? "none" : "expandIn/);
});

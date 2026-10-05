import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { SIZE_ARTWORK, COMING_SOON_ARTWORK, matchingSizeArtwork, matchingComingSoonArtwork } from '../../src/lib/catalogArtwork';
import { isOrderProduct, isOrderableProduct } from '../../src/lib/orderRules';

const picker = readFileSync(new URL('../../src/components/home/SizePicker.tsx', import.meta.url), 'utf8');
const roster = readFileSync(new URL('../../src/components/home/HeroSelector.tsx', import.meta.url), 'utf8');
const panelCss = readFileSync(new URL('../../src/components/ui/bari/BotanicalSurface.module.css', import.meta.url), 'utf8');

test('each illustrated size is eligible only for its exact current offer', () => {
    for (const [id, art] of Object.entries(SIZE_ARTWORK)) {
        const offer = { id, name: art.name, ml: art.ml, price: art.price, tag: art.tag };
        assert.equal(matchingSizeArtwork(offer), art);
        for (const price of [0, art.price - 1, art.price + 1, NaN, Infinity]) assert.equal(matchingSizeArtwork({ ...offer, price }), null);
        assert.equal(matchingSizeArtwork({ ...offer, name: 'שם חדש' }), null);
        assert.equal(matchingSizeArtwork({ ...offer, ml: art.ml + 1 }), null);
        assert.equal(matchingSizeArtwork({ ...offer, tag: 'תיאור חדש' }), null);
        for (const id of ['X', 'constructor', '__proto__']) assert.equal(matchingSizeArtwork({ ...offer, id }), null);
    }
});

test('luxury progresses across S M L without growing the card footprint', () => {
    assert.deepEqual(Object.values(SIZE_ARTWORK).map(art => art.tier), [1, 2, 3]);
    assert.deepEqual(Object.values(SIZE_ARTWORK).map(art => art.ml), [750, 1000, 1500]);
    assert.match(picker, /const S_W = 210/);
    assert.match(picker, /const S_H = 272/);
    assert.match(picker, /matchingSizeArtwork\(card\)/);
    assert.match(picker, /price: effectiveSizePrice\(750\)/);
    assert.match(picker, /price: effectiveSizePrice\(1000\)/);
    assert.match(picker, /price: effectiveSizePrice\(1500\)/);
});

test('pasta and sandwiches are truthful coming-soon art, never newly orderable products', () => {
    assert.equal(isOrderProduct('pasta'), false);
    assert.equal(isOrderableProduct('pasta'), false);
    assert.equal(isOrderableProduct('tortilla'), false);
    for (const [id, art] of Object.entries(COMING_SOON_ARTWORK)) {
        assert.equal(matchingComingSoonArtwork(id, art.title, art.subtitle, true), art);
        assert.equal(matchingComingSoonArtwork(id, art.title, art.subtitle, false), null);
        assert.equal(matchingComingSoonArtwork(id, 'שם אחר', art.subtitle, true), null);
        assert.equal(matchingComingSoonArtwork(id, art.title, 'הושק', true), null);
        assert.equal('price' in art, false);
    }
    assert.equal(matchingComingSoonArtwork('constructor', '', '', true), null);
    assert.match(roster, /id: 'pasta'[\s\S]*?locked: true/);
    assert.match(roster, /selected\.locked \|\| !isOrderProduct\(selected\.id\)/);
});

test('illustrated offers preserve real controls, per-image failure and accessible native facts', () => {
    assert.match(picker, /onError=\{\(\) => setFailedArt\(previous => \(\{ \.\.\.previous, \[card.id\]: true \}\)\)\}/);
    assert.match(picker, /aria-label=\{`גודל \$\{card.name\}/);
    assert.match(picker, /@media \(forced-colors: active\), \(max-height: 600px\)/);
    assert.match(picker, /sizePickerFallback \{ display: block; \}/);
    assert.match(picker, /className="sizePickerStage"/);
    assert.match(picker, /\.sizePickerStage \{ min-height: 272px; flex-shrink: 0; \}/);
    assert.match(picker, /<Check size=\{11\} \/>נבחר/);
    assert.match(roster, /setFailedComingArt\(previous =>/);
    assert.match(roster, /matchingComingSoonArtwork\(hero.id, hero.title, hero.copy, hero.locked\)/);
});

test('botanical panels reuse real nine-sliced artwork without resizing controls or blocking touches', () => {
    assert.match(panelCss, /border-image: url\('\/builder-assets\/botanical-panel-v1.webp'\) 96 fill \/ 18px/);
    assert.match(panelCss, /pointer-events: none/);
    assert.match(panelCss, /@media \(forced-colors: active\)/);
    const panel = readFileSync(new URL('../../src/components/ui/bari/BariPanel.tsx', import.meta.url), 'utf8');
    assert.match(panel, /ornate = false/);
    assert.doesNotMatch(panelCss, /animation:|backdrop-filter:|min-height:/);
    const journal = readFileSync(new URL('../../src/components/ui/bari/BariJournalArt.tsx', import.meta.url), 'utf8');
    assert.match(journal, /alt="" aria-hidden/);
    for (const page of ['orders', 'profile']) {
        const source = readFileSync(new URL(`../../src/app/${page}/page.tsx`, import.meta.url), 'utf8');
        assert.match(source, /<BariJournalArt \/>/);
        assert.match(source, /router.push\('\/home2'\)\}>להמשיך לתפריט כאורח/);
    }
});

test('new catalogue artwork is delivered as bounded WebP assets, not external image dependencies', () => {
    const paths: string[] = [...Object.values(SIZE_ARTWORK), ...Object.values(COMING_SOON_ARTWORK)].map(art => art.src);
    paths.push('/builder-assets/botanical-panel-v1.webp', '/homepage-assets/order-journal-botanical-v1.webp');
    for (const path of paths) {
        const bytes = readFileSync(new URL(`../../public${path}`, import.meta.url));
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
        assert.ok(bytes.length < 190 * 1024, path);
    }
});

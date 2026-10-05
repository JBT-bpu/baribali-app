import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { SALAD_HERO_ARTWORK, matchingSaladHeroArtwork } from '../../src/lib/saladHeroArtwork';

const { startingPrice, title, subtitle } = SALAD_HERO_ARTWORK;
const hero = readFileSync(new URL('../../src/components/home/HeroSelector.tsx', import.meta.url), 'utf8');

test('the approved salad poster matches only the offer and copy actually in the image', () => {
    assert.equal(matchingSaladHeroArtwork(startingPrice, title, subtitle), SALAD_HERO_ARTWORK);
    for (const price of [0, 53, 55, 59, 72, -1, NaN, Infinity]) {
        assert.equal(matchingSaladHeroArtwork(price, title, subtitle), null);
    }
    assert.equal(matchingSaladHeroArtwork(startingPrice, 'סלט חדש', subtitle), null);
    assert.equal(matchingSaladHeroArtwork(startingPrice, title, 'טקסט חדש'), null);
});

test('the poster preserves the v1 card footprint and a compact production asset', () => {
    assert.equal(SALAD_HERO_ARTWORK.width, 210);
    assert.equal(SALAD_HERO_ARTWORK.height, 286);
    assert.match(hero, /const C_W = 210/);
    assert.match(hero, /const C_H = 286/);
    const bytes = readFileSync(new URL(`../../public${SALAD_HERO_ARTWORK.src}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < 180 * 1024);
});

test('poster eligibility uses effective size prices and preserves native interaction and fallback', () => {
    assert.match(hero, /Math\.min\(\.\.\.\[750, 1000, 1500\]\.map\(effectiveSizePrice\)\)/);
    assert.match(hero, /hero\.id === 'salad' && !hero\.locked && !posterFailed/);
    assert.match(hero, /matchingSaladHeroArtwork\(startingPrice, hero\.title, hero\.copy\)/);
    assert.match(hero, /onError=\{\(\) => setPosterFailed\(true\)\}/);
    assert.match(hero, /החל מ־\$\{startingPrice\} ₪ לפני תוספות/);
    assert.match(hero, /@media \(forced-colors: active\), \(max-height: 560px\)/);
    assert.match(hero, /hero-selector__poster \{ display: none; \}/);
    assert.match(hero, /hero-selector__native-fallback \{ display: block; \}/);
    assert.match(hero, /onClick=\{event => handleCardTap\(i, event\)\}/);
    assert.match(hero, /if \(!HEROES\[i\]\.locked\) confirmChoice\(\)/);
    assert.match(hero, /const \[activeIdx, setActiveIdx\] = useState\(0\)/);
});

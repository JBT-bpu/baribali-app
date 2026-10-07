/* Mechanical alpha-margin trim and WebP encoding of the approved generated layers. */
const sharp = require('sharp');
const { copyFileSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const generated = 'C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f';
const evidence = '.playwright-cli/barimeter-atelier-2026-10-07';

async function main() {
    mkdirSync(evidence, { recursive: true });
    copyFileSync(join(generated, 'exec-ddc8646a-35df-45bf-9b7a-06909199494a.png'), join(evidence, 'selected-option-1.png'));
    for (const [input, output, width] of [
        ['exec-58271e5c-b5e2-4258-aea4-1d1604f7b15f.png', 'barimeter-atelier-frame-v1.webp', 960],
        ['exec-f4b16750-cf02-4908-838c-b5c1498b2331.png', 'barimeter-atelier-macros-v1.webp', 960],
        ['exec-7be2a845-8300-4767-99bb-885e30be6713.png', 'barimeter-atelier-bowl-v1.webp', 960],
    ]) {
        const path = join('public/builder-assets', output);
        await sharp(join(generated, input)).trim().resize({ width }).webp({ quality: 88, alphaQuality: 100 }).toFile(path);
        const meta = await sharp(path).metadata();
        const stats = await sharp(path).stats();
        if (!meta.hasAlpha || stats.channels.at(-1).min !== 0) throw Error('Missing transparency: ' + output);
        console.log(JSON.stringify({ path, width: meta.width, height: meta.height, bytes: statSync(path).size, alpha: true }));
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

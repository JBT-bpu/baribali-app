/* Mechanical alpha-margin trimming and delivery encoding, not image editing. */
const sharp = require('sharp');
const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const generated = 'C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f';
const evidence = '.playwright-cli/compact-brand-2026-10-06';
const assets = 'public/builder-assets';

async function main() {
    mkdirSync(evidence, { recursive: true });
    copyFileSync(join(generated, 'exec-f77621a4-549d-42c4-aaa8-1dd55f4dac83.png'), join(evidence, 'approved-header-v15.png'));
    for (const [input, output, width] of [
        ['exec-e52cdb10-ecb5-4e7f-b220-bd6a7828e677.png', 'builder-brand-emblem-v7.webp', 488],
        ['exec-55f02591-d3bb-4fa2-92c7-2c2329942052.png', 'builder-brand-frieze-v7.webp', 1600],
    ]) {
        const path = join(assets, output);
        await sharp(join(generated, input)).trim().resize({ width }).webp({ quality: 86, alphaQuality: 100 }).toFile(path);
        const metadata = await sharp(path).metadata();
        const stats = await sharp(path).stats();
        if (!metadata.hasAlpha || stats.channels.at(-1).min !== 0) throw Error('Generated alpha lost: ' + output);
        console.log(JSON.stringify({ path, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, bytes: metadata.size }));
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

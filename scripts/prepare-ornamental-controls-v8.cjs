/* Mechanical alpha-margin trim and WebP delivery encoding; no creative editing. */
const sharp = require('sharp');
const { copyFileSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const generated = 'C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f';
const evidence = '.playwright-cli/ornamental-controls-2026-10-06';

async function main() {
    mkdirSync(evidence, { recursive: true });
    copyFileSync(join(generated, 'exec-f06f2202-adb5-421a-b807-ce799f28ae2a.png'), join(evidence, 'approved-option2-translucent.png'));
    for (const [input, output, width] of [
        ['exec-dbed8795-ab05-482e-b0d4-f886b01095ee.png', 'builder-control-frame-v8.webp', 600],
        ['exec-e3dfb161-5f48-468d-bf4d-0c434021b0a4.png', 'builder-brand-wings-v8.webp', 900],
        ['exec-719e3ae6-dc02-40e0-999f-8ce3fd76d366.png', 'builder-chef-divider-v8.webp', 700],
    ]) {
        const path = join('public/builder-assets', output);
        await sharp(join(generated, input)).trim().resize({ width }).webp({ quality: 86, alphaQuality: 100 }).toFile(path);
        const metadata = await sharp(path).metadata();
        const stats = await sharp(path).stats();
        if (!metadata.hasAlpha || stats.channels.at(-1).min !== 0) throw Error('Generated transparency lost: ' + output);
        console.log(JSON.stringify({ path, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, bytes: statSync(path).size }));
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

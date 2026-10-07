/* Mechanical trim/encoding only; no screenshot slices or synthetic artwork. */
const sharp = require('sharp');
const { copyFileSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const generated = 'C:/Users/COMP13/.codex/generated_images/01a06340-dcbe-7fd0-b3cb-302686bed44f';
const evidence = '.playwright-cli/summary-tray-2026-10-07';

async function main() {
    mkdirSync(evidence, { recursive: true });
    copyFileSync(join(generated, 'exec-7e21b6d2-3f8b-410d-9779-71c433977f5b.png'), join(evidence, 'selected-option-2.png'));
    for (const [input, output] of [
        ['exec-045f6cab-7d8d-4381-b26c-93e5059bed36.png', 'summary-tray-frame-v1.webp'],
        ['exec-a5402b44-b6b9-4523-851a-de71c5dbc02f.png', 'summary-gold-action-v1.webp'],
    ]) {
        const path = join('public/builder-assets', output);
        await sharp(join(generated, input)).trim().resize({ width: 960 }).webp({ quality: 88, alphaQuality: 100 }).toFile(path);
        const meta = await sharp(path).metadata();
        const stats = await sharp(path).stats();
        if (!meta.hasAlpha || stats.channels.at(-1).min !== 0) throw Error('Missing genuine alpha: ' + output);
        console.log(JSON.stringify({ path, width: meta.width, height: meta.height, bytes: statSync(path).size, hasAlpha: meta.hasAlpha }));
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

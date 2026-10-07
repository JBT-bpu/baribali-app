/* Diagnostic source/render contact sheets; never application artwork. */
const sharp = require('sharp');
const { join } = require('node:path');
const root = '.playwright-cli/summary-tray-2026-10-07';

async function pair(left, right, path) {
    const a = await sharp(left).metadata();
    const b = await sharp(right).metadata();
    await sharp({ create: { width: a.width + b.width + 16, height: Math.max(a.height, b.height), channels: 3, background: '#121b14' } })
        .composite([{ input: left, left: 0, top: 0 }, { input: right, left: a.width + 16, top: 0 }])
        .png().toFile(path);
}

async function main() {
    const revision = process.argv[2] || '1';
    const target = await sharp(join(root, 'selected-option-2.png')).resize({ width: 393 }).toBuffer();
    const actual = await sharp(join(root, `iteration-${revision}-393.png`)).toBuffer();
    await pair(target, actual, join(root, `comparison-${revision}-full.png`));
    // The same viewport-width regions at natural scale, with padding, never stretch.
    const trayA = await sharp(target).extract({ left: 12, top: 124, width: 369, height: 231 }).toBuffer();
    const trayB = await sharp(actual).extract({ left: 12, top: 122, width: 369, height: 275 }).toBuffer();
    await pair(trayA, trayB, join(root, `comparison-${revision}-tray.png`));
    const footerA = await sharp(target).extract({ left: 12, top: 739, width: 369, height: 109 }).toBuffer();
    const footerB = await sharp(actual).extract({ left: 12, top: 693, width: 369, height: 153 }).toBuffer();
    await pair(footerA, footerB, join(root, `comparison-${revision}-footer.png`));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

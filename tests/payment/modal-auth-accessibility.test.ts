import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const detailSheet = readFileSync(new URL(
    '../../src/components/builder/ui/DetailSheet.jsx',
    import.meta.url,
), 'utf8');
const googleSignInButton = readFileSync(new URL(
    '../../src/components/ui/GoogleSignInButton.tsx',
    import.meta.url,
), 'utf8');
const homePage = readFileSync(new URL(
    '../../src/app/home2/page.tsx',
    import.meta.url,
), 'utf8');

test('ingredient detail sheets expose an ingredient-specific modal title', () => {
    assert.match(
        detailSheet,
        /<BariModal\s+open\s+onClose=\{onClose\}\s+variant="sheet"\s+title=\{`פרטי \$\{item\.he\}`\}>/,
    );
    assert.match(homePage, /<BariModal open=\{loginSheet\}[\s\S]*?variant="sheet" title="כניסה לחשבון">/,
        'the account sheet must not fall back to the generic modal name');
});

test('Google sign-in communicates busy state and keeps its logo decorative', () => {
    assert.match(googleSignInButton, /disabled=\{!available \|\| busy\}/);
    assert.match(googleSignInButton, /aria-busy=\{busy\}/);
    assert.match(googleSignInButton, /<span aria-hidden="true"[^>]*>G<\/span>/);
});

test('Google sign-in errors use one assertive announcement mechanism', () => {
    assert.match(googleSignInButton, /<span role="alert"[^>]*>\{error\}<\/span>/);
    const errorSpan = googleSignInButton.match(/\{error && \([\s\S]*?\)\}/)?.[0] ?? '';
    assert.doesNotMatch(errorSpan, /aria-live=/);
});

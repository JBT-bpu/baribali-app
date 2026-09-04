import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PUBLIC_DOCUMENTS = [
    'terms',
    'privacy',
    'cancellations',
    'accessibility',
    'contact',
    'allergens',
] as const;

const EDITORIAL_MARKERS = /TODO|TBD|FIXME|להשלים|לאימות|מומלץ מייל עסקי|לאמת את מיקום|פרט תקופת שמירה|מספר עוסק/i;

for (const page of PUBLIC_DOCUMENTS) {
    test(`${page} contains no customer-visible editorial placeholders`, () => {
        const source = readFileSync(new URL(
            `../../src/app/${page}/page.tsx`,
            import.meta.url,
        ), 'utf8');

        assert.doesNotMatch(source, EDITORIAL_MARKERS);
    });
}

test('payment documents stay truthful when the configured provider changes', () => {
    const terms = readFileSync(new URL(
        '../../src/app/terms/page.tsx',
        import.meta.url,
    ), 'utf8');
    const privacy = readFileSync(new URL(
        '../../src/app/privacy/page.tsx',
        import.meta.url,
    ), 'utf8');

    assert.match(terms, /ספק סליקה חיצוני מאובטח/);
    assert.match(privacy, /ספק הסליקה — לצורך ביצוע התשלום בלבד/);
    assert.doesNotMatch(`${terms}\n${privacy}`, /Hyp|YaadPay|Tranzila/,
        'public policy text must not drift from the server-selected provider');
});

test('legal copy describes only customer data the current checkout collects', () => {
    const terms = readFileSync(new URL(
        '../../src/app/terms/page.tsx',
        import.meta.url,
    ), 'utf8');
    const privacy = readFileSync(new URL(
        '../../src/app/privacy/page.tsx',
        import.meta.url,
    ), 'utf8');

    assert.doesNotMatch(terms, /לרבות מספר טלפון/);
    assert.doesNotMatch(privacy, /פרטי הזמנה וקשר: שם, מספר טלפון/);
    assert.match(privacy, /פרטי הזמנה: מרכיבים, גודל, זמן איסוף והערות/);
});

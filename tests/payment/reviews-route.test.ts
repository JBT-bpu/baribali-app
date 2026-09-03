import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { NextRequest } from 'next/server';

import { GET } from '../../src/app/api/reviews/route';

const savedEnvironment = {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    placeId: process.env.GOOGLE_PLACE_ID,
};
const savedFetch = globalThis.fetch;
let requestSequence = 0;

function setGoogleCredentials(enabled: boolean) {
    if (enabled) {
        process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
        process.env.GOOGLE_PLACE_ID = 'place/id with spaces';
        return;
    }

    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACE_ID;
}

async function expectUnavailable() {
    requestSequence += 1;
    const response = await GET(new NextRequest('http://localhost/api/reviews', {
        headers: { 'x-forwarded-for': `reviews-test-${requestSequence}` },
    }));
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.deepEqual(await response.json(), { reviews: [], source: 'unavailable' });
}

after(() => {
    globalThis.fetch = savedFetch;
    if (savedEnvironment.apiKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = savedEnvironment.apiKey;
    if (savedEnvironment.placeId === undefined) delete process.env.GOOGLE_PLACE_ID;
    else process.env.GOOGLE_PLACE_ID = savedEnvironment.placeId;
});

test('reviews route fails closed without Google credentials', async () => {
    setGoogleCredentials(false);
    let fetchCalls = 0;
    globalThis.fetch = async () => {
        fetchCalls += 1;
        throw new Error('Google must not be contacted without both credentials');
    };

    await expectUnavailable();
    assert.equal(fetchCalls, 0);
});

test('reviews route fails closed for upstream and payload failures', async () => {
    setGoogleCredentials(true);

    const failureCases: Array<() => Promise<Response>> = [
        async () => { throw new Error('network unavailable'); },
        async () => new Response(null, { status: 503 }),
        async () => new Response('{not-json', {
            status: 200,
            headers: { 'content-type': 'application/json' },
        }),
        async () => Response.json({ reviews: [] }),
        async () => Response.json({ reviews: 'malformed' }),
    ];

    for (const failure of failureCases) {
        globalThis.fetch = failure;
        await expectUnavailable();
    }
});

test('reviews route preserves genuine criticism and complete Google attribution', async () => {
    setGoogleCredentials(true);
    let requestUrl = '';
    let requestInit: RequestInit | undefined;

    globalThis.fetch = async (input, init) => {
        requestUrl = String(input);
        requestInit = init;
        return Response.json({
            reviews: [
                {
                    rating: 2,
                    text: { text: '  לא היה לטעמי  ' },
                    relativePublishTimeDescription: '  לפני שבוע  ',
                    authorAttribution: {
                        displayName: '  לקוחה אמיתית  ',
                        uri: 'https://www.google.com/maps/contrib/123/reviews',
                        photoUri: 'https://lh3.googleusercontent.com/a/example',
                    },
                    googleMapsUri: 'https://www.google.com/maps/reviews/example',
                    flagContentUri: 'https://www.google.com/local/review/rap/report?postId=example',
                },
                {
                    rating: 5,
                    text: { text: 'Missing required photo attribution' },
                    authorAttribution: {
                        displayName: 'Incomplete',
                        uri: 'https://www.google.com/maps/contrib/456/reviews',
                    },
                    googleMapsUri: 'https://www.google.com/maps/reviews/incomplete',
                    flagContentUri: 'https://www.google.com/local/review/rap/report?postId=incomplete',
                },
                {
                    rating: 6,
                    text: { text: 'Invalid rating' },
                    authorAttribution: {
                        displayName: 'Invalid',
                        uri: 'https://www.google.com/maps/contrib/789/reviews',
                        photoUri: 'https://lh3.googleusercontent.com/a/invalid',
                    },
                    googleMapsUri: 'https://www.google.com/maps/reviews/invalid',
                    flagContentUri: 'https://www.google.com/local/review/rap/report?postId=invalid',
                },
            ],
        });
    };

    requestSequence += 1;
    const response = await GET(new NextRequest('http://localhost/api/reviews', {
        headers: { 'x-forwarded-for': `reviews-test-${requestSequence}` },
    }));
    const payload = await response.json();

    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.deepEqual(payload, {
        source: 'google',
        reviews: [{
            author: 'לקוחה אמיתית',
            authorUri: 'https://www.google.com/maps/contrib/123/reviews',
            authorPhotoUri: 'https://lh3.googleusercontent.com/a/example',
            rating: 2,
            text: 'לא היה לטעמי',
            time: 'לפני שבוע',
            reviewUri: 'https://www.google.com/maps/reviews/example',
            reportUri: 'https://www.google.com/local/review/rap/report?postId=example',
        }],
    });
    assert.equal(
        requestUrl,
        'https://places.googleapis.com/v1/places/place%2Fid%20with%20spaces?languageCode=he',
    );
    assert.equal(requestInit?.cache, 'no-store');
    assert.ok(requestInit?.signal instanceof AbortSignal);
    assert.equal((requestInit?.headers as Record<string, string>)['X-Goog-Api-Key'], 'test-api-key');
    assert.equal((requestInit?.headers as Record<string, string>)['X-Goog-FieldMask'], 'reviews');
});

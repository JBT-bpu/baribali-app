import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GOOGLE_TIMEOUT_MS = 5_000;
const NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
} as const;

export interface Review {
    author: string;
    authorUri: string;
    authorPhotoUri: string;
    rating: number;
    text: string;
    time: string;
    reviewUri: string;
    reportUri: string;
}

function isHttpsUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;

    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

// ── Google Places API (New) fetch ────────────────────────────────────────────
async function fetchGoogleReviews(): Promise<Review[] | null> {
    const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    if (!apiKey || !placeId) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);

    try {
        const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=he`;
        const res = await fetch(url, {
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'reviews',
            },
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!res.ok) return null;

        const data = await res.json();
        const raw: {
            rating: number;
            text?: { text: string };
            relativePublishTimeDescription?: string;
            authorAttribution?: {
                displayName?: string;
                uri?: string;
                photoUri?: string;
            };
            googleMapsUri?: string;
            flagContentUri?: string;
        }[] = data.reviews ?? [];

        return raw
            // Show genuine reviews without quietly filtering out criticism.
            // Reviews missing Google's required attribution/source links are
            // omitted instead of being rendered without their provenance.
            .filter(r => Number.isFinite(r.rating)
                && r.rating >= 1
                && r.rating <= 5
                && Boolean(r.text?.text?.trim())
                && Boolean(r.authorAttribution?.displayName?.trim())
                && isHttpsUrl(r.authorAttribution?.uri)
                && isHttpsUrl(r.authorAttribution?.photoUri)
                && isHttpsUrl(r.googleMapsUri)
                && isHttpsUrl(r.flagContentUri))
            .map(r => ({
                author: r.authorAttribution!.displayName!.trim(),
                authorUri: r.authorAttribution!.uri!,
                authorPhotoUri: r.authorAttribution!.photoUri!,
                rating: Math.round(r.rating),
                text:   r.text!.text.trim(),
                time:   r.relativePublishTimeDescription?.trim() ?? '',
                reviewUri: r.googleMapsUri!,
                reportUri: r.flagContentUri!,
            }));
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function GET(req: NextRequest) {
    // This public endpoint can trigger a billed Places request. The provider
    // response itself may not be cached, so blunt direct endpoint hammering.
    const limited = enforceRateLimit(req, 'reviews', 20, 60_000);
    if (limited) {
        limited.headers.set('Cache-Control', NO_STORE_HEADERS['Cache-Control']);
        return limited;
    }

    const google = await fetchGoogleReviews();
    if (google?.length) {
        return NextResponse.json(
            { reviews: google, source: 'google' },
            { headers: NO_STORE_HEADERS },
        );
    }

    // Missing credentials, an upstream failure and a genuine empty result all
    // fail closed to no testimonial. The client fills the same visual footprint
    // with a clearly brand-owned product fact rather than inventing customers.
    return NextResponse.json(
        { reviews: [], source: 'unavailable' },
        { headers: NO_STORE_HEADERS },
    );
}

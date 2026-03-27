import { NextResponse } from 'next/server';

export const revalidate = 86400; // cache 24h

export interface Review {
    author: string;
    rating: number;
    text: string;
    time: string;
}

// ── Static fallback — replace with your real Google reviews ──────────────────
const STATIC_REVIEWS: Review[] = [
    { author: 'מיכל כ.', rating: 5, text: 'הסלט הכי טרי וטעים שאכלתי! המרכיבים תמיד טריים והשירות מדהים. חוזרת כל שבוע!', time: 'לפני שבוע' },
    { author: 'דני ל.', rating: 5, text: 'מקום מדהים, הסלטים טעימים ומגוון עצום של מרכיבים. ממליץ בחום לכולם!', time: 'לפני 2 שבועות' },
    { author: 'שרה מ.', rating: 5, text: 'הכי אהבתי שאפשר לבנות בדיוק מה שרוצים. הטונה עם האבוקדו וטחינה — פשוט שילוב מושלם.', time: 'לפני חודש' },
    { author: 'אורי ב.', rating: 5, text: 'מהיר, טעים, ובמחיר סביר. הסלט מגיע ארוז יפה ותמיד טרי. מומלץ מאוד!', time: 'לפני 3 ימים' },
    { author: 'נועה ר.', rating: 5, text: 'כל פעם שאני רוצה ארוחת צהריים בריאה זה הכתובת. הצוות מקסים והסלט תמיד מדויק!', time: 'לפני שבועיים' },
    { author: 'יוסי ג.', rating: 4, text: 'סלט טעים ומגוון. המקום נקי והשירות מהיר. אין ספק שחוזר!', time: 'לפני חודש' },
];

// ── Google Places API (New) fetch ────────────────────────────────────────────
async function fetchGoogleReviews(): Promise<Review[] | null> {
    const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    if (!apiKey || !placeId) return null;

    try {
        const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&languageCode=he`;
        const res = await fetch(url, {
            headers: { 'X-Goog-Api-Key': apiKey },
            next: { revalidate: 86400 },
        });

        if (!res.ok) return null;

        const data = await res.json();
        const raw: {
            rating: number;
            text?: { text: string };
            relativePublishTimeDescription?: string;
            authorAttribution?: { displayName: string };
        }[] = data.reviews ?? [];

        return raw
            .filter(r => r.rating >= 4 && r.text?.text)
            .map(r => ({
                author: r.authorAttribution?.displayName ?? 'לקוח',
                rating: r.rating,
                text:   r.text!.text,
                time:   r.relativePublishTimeDescription ?? '',
            }));
    } catch {
        return null;
    }
}

export async function GET() {
    const google = await fetchGoogleReviews();
    const reviews = google && google.length > 0 ? google : STATIC_REVIEWS;

    // Shuffle so order varies each cache cycle
    const shuffled = [...reviews].sort(() => Math.random() - 0.5);

    return NextResponse.json({ reviews: shuffled, source: google ? 'google' : 'static' });
}

/** Illustration variants are presentation, never pricing or availability authority. */
export const SIZE_ARTWORK = {
    S: { src: '/homepage-assets/size-s-botanical-54-v1.webp', name: 'קטן', ml: 750, price: 54, tag: 'קומפקטי', tier: 1 },
    M: { src: '/homepage-assets/size-m-botanical-59-v1.webp', name: 'בינוני', ml: 1000, price: 59, tag: 'הקלאסי', tier: 2 },
    L: { src: '/homepage-assets/size-l-botanical-72-v2.webp', name: 'גדול', ml: 1500, price: 72, tag: 'הכי גדול שלנו', tier: 3 },
} as const;

interface SizeOffer { id: string; name: string; ml: number; price: number; tag: string }

export function matchingSizeArtwork(offer: SizeOffer) {
    if (!Object.hasOwn(SIZE_ARTWORK, offer.id)) return null;
    const art = SIZE_ARTWORK[offer.id as keyof typeof SIZE_ARTWORK];
    return offer.name === art.name && offer.ml === art.ml && offer.price === art.price && offer.tag === art.tag ? art : null;
}

export const COMING_SOON_ARTWORK = {
    pasta: { src: '/homepage-assets/card-pasta-botanical-v1.webp', title: 'פסטה', subtitle: 'משהו חדש מתבשל' },
    tortilla: { src: '/homepage-assets/card-wraps-botanical-v1.webp', title: 'כריכים וטורטיות', subtitle: 'בקרוב בתפריט' },
} as const;

export function matchingComingSoonArtwork(id: string, title: string, subtitle: string, locked: boolean) {
    if (!locked || !Object.hasOwn(COMING_SOON_ARTWORK, id)) return null;
    const art = COMING_SOON_ARTWORK[id as keyof typeof COMING_SOON_ARTWORK];
    return title === art.title && subtitle === art.subtitle ? art : null;
}

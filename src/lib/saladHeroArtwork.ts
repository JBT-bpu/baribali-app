/** Embedded copy is versioned with the artwork, not a source of menu prices. */
export const SALAD_HERO_ARTWORK = {
    src: '/homepage-assets/card-salad-botanical-54-v1.webp',
    startingPrice: 54,
    title: 'הסלט שלכם',
    subtitle: 'בחירת גודל · הרכבה חופשית',
    width: 210,
    height: 286,
} as const;

/** A changed menu/caption must never leave an obsolete offer in the picture. */
export function matchingSaladHeroArtwork(startingPrice: number, title: string, subtitle: string) {
    return startingPrice === SALAD_HERO_ARTWORK.startingPrice
        && title === SALAD_HERO_ARTWORK.title
        && subtitle === SALAD_HERO_ARTWORK.subtitle
        ? SALAD_HERO_ARTWORK
        : null;
}

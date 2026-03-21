// Utility functions

/**
 * Get a random menu loop video path
 */
export const getRandomLoop = (loops: string[]): string => {
    const randomIndex = Math.floor(Math.random() * loops.length);
    return loops[randomIndex];
};

/**
 * Merge class names (simple version of clsx/cn)
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
};

/**
 * Get glow gradient color for a card (CSS fallback)
 */
export const getGlowGradient = (cardId: string): string => {
    const gradients: Record<string, string> = {
        build: 'radial-gradient(ellipse, rgba(76, 175, 80, 0.4) 0%, transparent 70%)',
        recommended: 'radial-gradient(ellipse, rgba(139, 195, 74, 0.4) 0%, transparent 70%)',
        login: 'radial-gradient(ellipse, rgba(255, 152, 0, 0.4) 0%, transparent 70%)',
    };
    return gradients[cardId] || gradients.build;
};

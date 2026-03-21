// Hotspot Configuration - Mobile Only
// Designer: Use the hotspot calibrator at /calibrator to adjust these positions
// Export config from calibrator and paste here

import type { HotspotConfig, NodeConfig } from '@/types/video-menu';

/**
 * Get the outro video path for a card
 * Currently using generic outro for all cards until card-specific videos are created
 */
export const getOutroPathForCard = (cardId: string): string => {
    // Use generic outro for all cards until card-specific videos are created
    return VIDEO_PATHS.outro;

    // UNCOMMENT when card-specific outros exist:
    // const cardSpecificPaths: Record<string, string> = {
    //     build: VIDEO_PATHS.build,
    //     recommended: VIDEO_PATHS.recommended,
    //     login: VIDEO_PATHS.login,
    // };
    // return cardSpecificPaths[cardId] || VIDEO_PATHS.outro;
};

export const HOTSPOT_CONFIG: HotspotConfig = {
    // Card hotspots - positions from baribali-v3.jsx prototype
    // These are estimates - fine-tune using the calibrator tool
    cards: [
        {
            id: "build",
            label: "בנה סלט כפר",
            dest: "/build",
            top: 40,
            left: 1.6,
            width: 25,
            height: 27.2,
        },
        {
            id: "recommended",
            label: "המומלצים שלו",
            dest: "/recommended",
            top: 38.3,
            left: 35,
            width: 30,
            height: 30,
        },
        {
            id: "login",
            label: "התחברות משתמש",
            dest: "/login",
            top: 40,
            left: 72,
            width: 26.4,
            height: 26.7,
        }
    ],
    // Nav bar hotspots
    nav: [
        { id: "home", label: "בית", dest: "/", left: 8, width: 14 },
        { id: "fresh", label: "טרי", dest: "/fresh", left: 24, width: 14 },
        { id: "star", label: "מועדפים", dest: "/favorites", left: 40, width: 14 },
        { id: "top", label: "מובילים", dest: "/top", left: 56, width: 14 },
        { id: "profile", label: "פרופיל", dest: "/profile", left: 72, width: 14 },
    ],
    navBottom: 2.5,
    navHeight: 7,
};

// Video paths
export const VIDEO_PATHS = {
    intro: '/video/intro.mp4',
    outro: '/video/outro.mp4',
    // Transition videos
    introBuild: '/video/intro_build.mp4', // Main menu → Size selection
    // Note: outro-build.mp4 doesn't exist yet, using outro.mp4 as fallback
    // Card-specific outros (fallback until individual files are created)
    build: '/video/outro-build.mp4',
    recommended: '/video/outro-recommended.mp4',
    login: '/video/outro-login.mp4',
    // Page-specific intro videos
    sizePick: '/video/intro_build.mp4',
    buildIntro: '/video/build_loop1.mp4',
};

// Build page menu loop videos
export const BUILD_LOOPS = [
    '/video/loop1.mp4',
    '/video/loop2.mp4',
];

// Multi-node video funnel configuration
// Each node has: intro video (plays once), loop video (UI background), hotspots (clickable)
export const NODE_CONFIGS: Record<string, NodeConfig> = {
    main: {
        id: 'main',
        introSrc: '/video/intro.mp4',
        loopSrc: '/video/loop1.mp4',
        hotspots: HOTSPOT_CONFIG,
        transitions: {
            build: {
                nextNode: 'size',
                nextIntroSrc: '/video/intro_build.mp4', // Dedicated transition from main menu to size selection
            },
            recommended: {
                navigateTo: '/recommended', // Terminal node - direct navigation
            },
            login: {
                navigateTo: '/login', // Terminal node - direct navigation
            },
        },
    },
    size: {
        id: 'size',
        introSrc: '/video/intro_build.mp4', // Transition from main menu to size selection
        loopSrc: '/video/build_loop1.mp4',
        hotspots: {
            cards: [
                { id: 'sizeS', label: 'Size S', dest: '/build', top: 40, left: 1.6, width: 25, height: 27.2 },
                { id: 'sizeM', label: 'Size M', dest: '/build', top: 38.3, left: 35, width: 30, height: 30 },
                { id: 'sizeL', label: 'Size L', dest: '/build', top: 40, left: 72, width: 26.4, height: 26.7 },
            ],
            nav: [],
            navBottom: 2.5,
            navHeight: 7,
        },
        transitions: {
            sizeS: {
                navigateTo: '/build', // Direct navigation after outro
            },
            sizeM: {
                navigateTo: '/build', // Direct navigation after outro
            },
            sizeL: {
                navigateTo: '/build', // Direct navigation after outro
            },
        },
    },
    recommended: {
        id: 'recommended',
        introSrc: '/video/intro.mp4', // Using main intro for now (TODO: create intro_recommended.mp4)
        loopSrc: '/video/loop1.mp4',
        hotspots: HOTSPOT_CONFIG, // Reuse main menu config
        transitions: {
            // Back to main or navigate elsewhere
            back: {
                nextNode: 'main',
                nextIntroSrc: '/video/intro.mp4',
            },
        },
    },
    login: {
        id: 'login',
        introSrc: '/video/intro.mp4', // Using main intro for now (TODO: create intro_login.mp4)
        loopSrc: '/video/loop1.mp4',
        hotspots: HOTSPOT_CONFIG, // Reuse main menu config
        transitions: {
            // Back to main or navigate elsewhere
            back: {
                nextNode: 'main',
                nextIntroSrc: '/video/intro.mp4',
            },
        },
    },
};

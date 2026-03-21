// Video Menu Type Definitions

export type Phase = 'intro' | 'menu' | 'outro';

export type EnginePhase = 'loading' | 'intro' | 'loop' | 'preview' | 'navigating' | 'swapping';

export type NodeId = 'main' | 'size' | 'recommended' | 'login'; // expandable

export type HotspotId = string;

export interface NodeConfig {
    id: NodeId;
    introSrc: string;       // played once when entering node
    loopSrc: string;        // loops forever (UI background)
    hotspots: HotspotConfig; // what is clickable in this node
    transitions: Record<HotspotId, {
        nextNode?: NodeId;        // if moving to another menu node
        nextIntroSrc?: string;    // intro video for transition
        navigateTo?: string;      // final route (e.g. /build) if this is terminal
    }>;
}

export interface VideoEngineState {
    phase: EnginePhase;
    node: NodeId;                 // which menu node we're in
    activeVideo: 'A' | 'B';        // which video element is showing
    previewHotspot: HotspotId | null; // highlighted option (first tap)
    preloadedNextSrc: string | null; // what hidden video is preloading
    isSwapping: boolean;          // canvas bridge active
}

export interface SwapVideoOptions {
    nextSrc: string;
    shouldLoop: boolean;
    onComplete?: () => void;
}

export type Layout = 'mobile';

export type CardState = 'idle' | 'previewing' | 'playing-outro';

export interface Hotspot {
    id: string;
    label: string;
    dest: string;
    top: number;      // percentage
    left: number;     // percentage
    width: number;    // percentage
    height: number;   // percentage
}

export interface NavHotspot {
    id: string;
    label: string;
    dest: string;
    left: number;     // percentage
    width: number;    // percentage
}

export interface HotspotConfig {
    cards: Hotspot[];
    nav: NavHotspot[];
    navBottom: number;  // percentage
    navHeight: number;  // percentage
}

export interface VideoMenuProps {
    onNavigate?: (destination: string) => void;
}

export interface GlowOverlayProps {
    cardId: string;
    layout: Layout;
    cardState: CardState;
    fallbackColor?: string;
}

export interface PhaseManagerProps {
    onPhaseChange: (phase: EnginePhase) => void;
    onNodeChange: (node: NodeId) => void;
    onNavigate: (destination: string) => void;
    onCardStatesChange: (states: Record<string, CardState>) => void;
}

export interface PhaseManagerHandle {
    handleCardClick: (cardId: string) => void;
    handleNavClick: (destination: string) => void;
    resetCardStates: () => void;
    getCurrentState: () => VideoEngineState;
}

export interface HotspotLayerProps {
    config: HotspotConfig;
    onHotspotClick: (hotspot: Hotspot | NavHotspot) => void;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    hotspotsActive: boolean;
    debugMode?: boolean;
}

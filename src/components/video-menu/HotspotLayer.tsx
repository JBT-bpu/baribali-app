// Hotspot Layer Component - Invisible clickable zones
import type { HotspotLayerProps } from '@/types/video-menu';
import type { Hotspot, NavHotspot } from '@/types/video-menu';

export default function HotspotLayer({
    config,
    onHotspotClick,
    hoveredId,
    onHover,
    hotspotsActive,
    debugMode = false,
    onBackgroundClick,
}: HotspotLayerProps & { onBackgroundClick?: () => void }) {
    const handleCardHover = (id: string | null) => {
        if (!hotspotsActive) return;
        onHover(id);
    };

    const handleNavHover = (id: string | null) => {
        if (!hotspotsActive) return;
        onHover(id);
    };

    const handleCardClick = (hotspot: Hotspot) => {
        if (!hotspotsActive) return;
        onHotspotClick(hotspot);
    };

    const handleNavClick = (nav: NavHotspot) => {
        if (!hotspotsActive) return;
        onHotspotClick(nav);
    };

    return (
        <div
            onClick={onBackgroundClick}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            {/* Card Hotspots */}
            {config.cards.map((card) => (
                <button
                    key={`card-${card.id}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(card);
                    }}
                    onPointerEnter={() => handleCardHover(card.id)}
                    onPointerLeave={() => handleCardHover(null)}
                    style={{
                        position: 'absolute',
                        top: `${card.top}%`,
                        left: `${card.left}%`,
                        width: `${card.width}%`,
                        height: `${card.height}%`,
                        background: debugMode ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
                        border: debugMode ? '2px solid red' : 'none',
                        cursor: hotspotsActive ? 'pointer' : 'default',
                        opacity: hotspotsActive ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 10,
                    }}
                    aria-label={card.label}
                >
                    {debugMode && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textShadow: '0 0 2px black',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {card.label}
                        </span>
                    )}
                </button>
            ))}

            {/* Nav Hotspots */}
            {config.nav.map((nav) => (
                <button
                    key={`nav-${nav.id}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNavClick(nav);
                    }}
                    onPointerEnter={() => handleNavHover(nav.id)}
                    onPointerLeave={() => handleNavHover(null)}
                    style={{
                        position: 'absolute',
                        bottom: `${config.navBottom}%`,
                        left: `${nav.left}%`,
                        width: `${nav.width}%`,
                        height: `${config.navHeight}%`,
                        background: debugMode ? 'rgba(0, 0, 255, 0.3)' : 'transparent',
                        border: debugMode ? '2px solid blue' : 'none',
                        cursor: hotspotsActive ? 'pointer' : 'default',
                        opacity: hotspotsActive ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 10,
                    }}
                    aria-label={nav.label}
                >
                    {debugMode && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                textShadow: '0 0 2px black',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {nav.label}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

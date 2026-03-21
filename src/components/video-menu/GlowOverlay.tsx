// Glow Overlay Component - Uses CSS gradients for glow effects
// PNG loading disabled to prevent 404 errors until actual glow images are created
import type { GlowOverlayProps, CardState } from '@/types/video-menu';
import { getGlowGradient } from '@/lib/utils';

export default function GlowOverlay({
    cardId,
    layout,
    cardState,
    fallbackColor = '#4CAF50',
}: GlowOverlayProps & { cardState: CardState }) {
    // Show glow only when card is in previewing or playing-outro state
    const shouldShowGlow = cardState === 'previewing' || cardState === 'playing-outro';

    // Use CSS gradient for glow effect (PNG loading disabled to prevent 404 errors)
    const backgroundImage = getGlowGradient(cardId);

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: shouldShowGlow ? 1 : 0,
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                pointerEvents: 'none',
                borderRadius: '20px',
            }}
            className="glow-overlay"
        />
    );
}

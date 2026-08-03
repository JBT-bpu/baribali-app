import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { PLAQUE, PLAQUE_KEYFRAMES, pct } from './plaqueGeometry';

/**
 * The ornate plaque frame, with three interior slots anchored to the artwork.
 *
 * The frame is three bands — a fixed top (arch, pedestal, engraved divider), a
 * 2px middle that stretches, and a fixed bottom — so it holds content of any
 * height without cropping or gapping. It is absolutely positioned, so the
 * CONTENT decides how tall the plaque is, not the art. See plaqueGeometry.ts
 * for the measurements and why every position is a fraction of the width.
 *
 * Styling is all inline rather than Tailwind (unlike BariPanel, like
 * BariBottomNav): `aspectRatio: '1 / 0.277'`, percentage padding and
 * `env(safe-area-inset-*)` have no faithful utility equivalents, and
 * arbitrary-value classes would bury the arithmetic the whole design rests on.
 *
 * This component owns GEOMETRY only. Typography and the page backdrop stay with
 * the caller — the two screens using it want different type, and one is a fixed
 * overlay while the other is a normal scrolling page.
 */
export interface BariPlaqueProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
    /** Rests on the pedestal the art draws (the cat, or the status ring). */
    pedestal?: ReactNode;
    /** Sits between the pedestal's front rim and the engraved divider. */
    title?: ReactNode;
    /** Everything below the divider — the variable part, which stretches the frame. */
    children?: ReactNode;
    /** Footprint of the pedestal object as a fraction of the plaque's width. */
    pedestalWidth?: number;
    /** Merged onto the pedestal object's wrapper (entrance animation, shadow). */
    pedestalStyle?: CSSProperties;
    /** Merged onto the interior content column. */
    contentStyle?: CSSProperties;
}

export default function BariPlaque({
    pedestal,
    title,
    children,
    pedestalWidth = PLAQUE.pedestalArt,
    pedestalStyle,
    contentStyle,
    className = '',
    style,
    ...rest
}: BariPlaqueProps) {
    return (
        <div className={className} style={{ ...S.plaque, ...style }} {...rest}>
            <BariPlaqueKeyframes />

            <div style={S.frame} aria-hidden="true">
                <div style={S.frameTop} />
                <div style={S.frameMid} />
                <div style={S.frameBot} />
            </div>

            <div style={{ ...S.content, ...contentStyle }}>
                <div style={S.pedestalZone} data-plaque-zone="pedestal">
                    <div style={{ width: pct(pedestalWidth), aspectRatio: '1', ...pedestalStyle }}>
                        {pedestal}
                    </div>
                </div>

                <div style={S.titleZone} data-plaque-zone="title">
                    {title}
                </div>

                <div style={S.body} data-plaque-zone="body">
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * The plaque's keyframes on their own, for screens that use the names but not
 * the frame. React dedupes on href+precedence, so mounting several plaques (or
 * a plaque alongside this) still injects one copy — into <head>, out of reach
 * of any page-local <style> that might otherwise shadow the names.
 */
export function BariPlaqueKeyframes() {
    return <style href="bari-plaque-keyframes" precedence="default">{PLAQUE_KEYFRAMES}</style>;
}

// The plaque's padding and the frame's inset are the same expression and must
// stay that way — the frame has to land exactly on the content box.
const INSET = `max(${PLAQUE.gutter}px, env(safe-area-inset-top)) ${PLAQUE.gutter}px max(${PLAQUE.gutter}px, env(safe-area-inset-bottom))`;

const band = (aspect: string, url: string): CSSProperties => ({
    width: '100%',
    aspectRatio: aspect,
    flexShrink: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
});

const S: Record<string, CSSProperties> = {
    plaque: {
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: `${PLAQUE.maxWidth}px`,
        margin: 'auto',
        padding: INSET,
        // border-box, or `width:100%` plus the padding would put the plaque 24px
        // wider than the viewport and clip the gold rail on one side.
        boxSizing: 'border-box',
    },
    frame: {
        position: 'absolute', inset: INSET,
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.55))',
    },
    frameTop: band(PLAQUE.topBandAspect, PLAQUE.art.top),
    // The 2px slice, stretched. Its top row is the top band's last row and its
    // bottom row is the bottom band's first, so both joins are continuous.
    frameMid: {
        width: '100%', flex: 1, minHeight: 0,
        backgroundImage: `url(${PLAQUE.art.mid})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
    },
    frameBot: band(PLAQUE.botBandAspect, PLAQUE.art.bot),

    content: { position: 'relative', zIndex: 1, textAlign: 'center', paddingBottom: pct(PLAQUE.contentPadBottom) },

    // Ends just past the pedestal's front rim so the object rests on it.
    pedestalZone: { width: '100%', aspectRatio: `1 / ${PLAQUE.pedestalZone}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
    // Pedestal rim to divider. Callers must pin line-heights on whatever goes in
    // here: this box scales with the width, so default line-heights on fixed-px
    // type overflow it on a narrow phone and run over the engraved divider.
    titleZone: { width: '100%', aspectRatio: `1 / ${PLAQUE.titleZone}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${pct(PLAQUE.titleSidePad)}` },
    // A plain block, not a flex column — callers that want gap-based spacing
    // wrap their own children, so margin-driven layouts stay untouched.
    body: { paddingTop: pct(PLAQUE.bodyPadTop), paddingLeft: pct(PLAQUE.bodySidePad), paddingRight: pct(PLAQUE.bodySidePad) },
};

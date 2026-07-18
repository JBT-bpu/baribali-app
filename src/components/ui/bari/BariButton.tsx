'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export interface BariButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
}

// Glossy top sheen layered over the brand gradient — flat gradient fills
// read cheap at button size; a soft highlight fading out by the upper third
// gives it a pressed-gold/glass dimensionality instead.
const GOLD_GRADIENT = [
    'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 42%)',
    'linear-gradient(135deg, var(--color-gold-deep) 0%, var(--color-gold-light) 45%, var(--color-gold-bright) 55%, var(--color-gold-deep) 100%)',
].join(', ');

// Elevation shadow (grounds it against the dark background) + the existing
// gold glow + an inset top highlight/bottom bevel for a tactile, embossed
// edge rather than a flat cutout.
const PRIMARY_SHADOW = '0 10px 26px rgba(0,0,0,0.45), var(--shadow-gold-glow-lg), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 3px rgba(120,90,10,0.3)';
const SOFT_SHADOW = '0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)';

const VARIANT_CLASSES: Record<Variant, string> = {
    primary: 'text-green-ink border border-gold-bright/50',
    secondary: 'bg-white/10 text-green-light border border-white/16',
    ghost: 'bg-white/[0.03] text-white/80 border border-white/18',
    danger: 'bg-danger/15 text-danger-light border border-danger/45',
};

const VARIANT_SHADOW: Record<Variant, string> = {
    primary: PRIMARY_SHADOW,
    secondary: SOFT_SHADOW,
    ghost: SOFT_SHADOW,
    danger: SOFT_SHADOW,
};

const SIZE_CLASSES: Record<Size, string> = {
    // Full pill — matches the shape every hand-rolled primary CTA in the
    // app already uses (home2, size picker, order-status, etc.).
    // lg: bigger touch target for staff-facing/tablet use (kitchen board).
    lg: 'px-8 py-4 text-lg rounded-full gap-3',
    md: 'px-7 py-3.5 text-base rounded-full gap-3',
    sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
};

const BariButton = forwardRef<HTMLButtonElement, BariButtonProps>(function BariButton(
    { variant = 'primary', size = 'md', fullWidth, className = '', style, children, ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            className={[
                'inline-flex items-center justify-center font-extrabold cursor-pointer transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
                VARIANT_CLASSES[variant],
                SIZE_CLASSES[size],
                fullWidth ? 'w-full' : '',
                className,
            ].filter(Boolean).join(' ')}
            style={{
                boxShadow: VARIANT_SHADOW[variant],
                ...(variant === 'primary' ? { backgroundImage: GOLD_GRADIENT } : {}),
                ...style,
            }}
            {...rest}
        >
            {children}
        </button>
    );
});

export default BariButton;

'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

export interface BariButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
}

const GOLD_GRADIENT = 'linear-gradient(135deg, var(--color-gold-deep) 0%, var(--color-gold-light) 45%, var(--color-gold-bright) 55%, var(--color-gold-deep) 100%)';

const VARIANT_CLASSES: Record<Variant, string> = {
    primary: 'text-green-ink border border-gold-bright/50 shadow-gold-glow-lg',
    secondary: 'bg-white/7 text-green-light border border-white/10',
    ghost: 'bg-transparent text-white/70 border border-white/15',
    danger: 'bg-danger/15 text-danger-light border border-danger/45',
};

const SIZE_CLASSES: Record<Size, string> = {
    md: 'px-7 py-3.5 text-base rounded-2xl gap-3',
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
            style={variant === 'primary' ? { backgroundImage: GOLD_GRADIENT, ...style } : style}
            {...rest}
        >
            {children}
        </button>
    );
});

export default BariButton;

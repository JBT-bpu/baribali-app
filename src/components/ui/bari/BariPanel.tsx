import type { HTMLAttributes } from 'react';

export interface BariPanelProps extends HTMLAttributes<HTMLDivElement> {
    highlighted?: boolean;
}

export default function BariPanel({ highlighted, className = '', style, children, ...rest }: BariPanelProps) {
    return (
        <div
            className={[
                'rounded-lg border backdrop-blur-md transition-[border-color,box-shadow] duration-200',
                highlighted ? 'border-gold/70' : 'border-gold/25',
                className,
            ].filter(Boolean).join(' ')}
            style={{
                background: 'rgba(15,45,15,0.55)',
                boxShadow: highlighted ? '0 0 18px rgba(200,168,78,0.25), inset 0 0 12px rgba(200,168,78,0.06)' : undefined,
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

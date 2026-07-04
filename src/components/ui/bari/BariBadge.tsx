import type { ReactNode } from 'react';

export interface BariBadgeProps {
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export default function BariBadge({ icon, children, className = '' }: BariBadgeProps) {
    return (
        <div
            className={[
                'inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/12 px-2.5 py-1 text-xs font-extrabold text-gold-light',
                className,
            ].filter(Boolean).join(' ')}
        >
            {icon}
            <span>{children}</span>
        </div>
    );
}

import type { HTMLAttributes } from 'react';
import botanical from './BotanicalSurface.module.css';

export interface BariPanelProps extends HTMLAttributes<HTMLDivElement> {
    highlighted?: boolean;
    ornate?: boolean;
}

export default function BariPanel({ highlighted, ornate = false, className = '', style, children, ...rest }: BariPanelProps) {
    return (
        <div
            className={[
                'rounded-lg border backdrop-blur-md transition-[border-color,box-shadow] duration-200',
                highlighted ? 'border-gold/70' : 'border-gold/25',
                ornate ? botanical.surface : '',
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

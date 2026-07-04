'use client';

import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

export interface BariModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    /** 'sheet' = bottom drawer (vaul, draggable). 'dialog' = centered card. */
    variant?: 'sheet' | 'dialog';
}

const PANEL_BG = 'linear-gradient(175deg, rgba(14,42,14,0.99) 0%, rgba(8,26,8,0.99) 100%)';

export default function BariModal({ open, onClose, title, children, variant = 'sheet' }: BariModalProps) {
    if (variant === 'dialog') {
        if (!open) return null;
        return (
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center bg-black/65 px-6 backdrop-blur-[5px]"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-[340px] rounded-lg border border-gold/20 p-6 text-center"
                    style={{ background: PANEL_BG, boxShadow: '0 -12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {title && <div className="mb-2 text-base font-black text-white">{title}</div>}
                    {children}
                </div>
            </div>
        );
    }

    return (
        <Drawer.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[300] bg-black/65 backdrop-blur-[5px]" />
                <Drawer.Content
                    className="fixed inset-x-0 bottom-0 z-[300] mx-auto flex max-h-[90vh] w-full max-w-[430px] flex-col rounded-t-2xl border border-gold/18 outline-none"
                    style={{ background: PANEL_BG, direction: 'rtl' }}
                >
                    <Drawer.Handle className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />
                    {title
                        ? <Drawer.Title className="px-5 pt-3 text-base font-black text-white">{title}</Drawer.Title>
                        : <Drawer.Title className="sr-only">תפריט</Drawer.Title>}
                    <div className="overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

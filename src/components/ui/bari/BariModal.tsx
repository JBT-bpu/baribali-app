'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
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
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    const titleId = useId();

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open || variant !== 'dialog') return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const dialog = dialogRef.current;
        const focusableSelector = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(',');
        const focusFirst = requestAnimationFrame(() => {
            const first = dialog?.querySelector<HTMLElement>(focusableSelector);
            (first ?? dialog)?.focus();
        });

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRef.current();
                return;
            }
            if (event.key !== 'Tab' || !dialog) return;

            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            cancelAnimationFrame(focusFirst);
            document.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus();
        };
    }, [open, variant]);

    if (variant === 'dialog') {
        if (!open) return null;
        return (
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center bg-black/65 px-6 backdrop-blur-[5px]"
                onClick={onClose}
            >
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title ? titleId : undefined}
                    aria-label={title ? undefined : 'חלון'}
                    tabIndex={-1}
                    className="w-full max-w-[340px] rounded-lg border border-gold/20 p-6 text-center"
                    style={{ background: PANEL_BG, boxShadow: '0 -12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {title && <div id={titleId} className="mb-2 text-base font-black text-white">{title}</div>}
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
                    className="fixed inset-x-0 bottom-0 z-[300] mx-auto flex max-h-[90dvh] w-full max-w-[430px] flex-col rounded-t-2xl border border-gold/18 outline-none"
                    style={{ background: PANEL_BG, direction: 'rtl' }}
                >
                    <Drawer.Handle className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />
                    {title
                        ? <Drawer.Title className="px-5 pt-3 text-base font-black text-white">{title}</Drawer.Title>
                        : <Drawer.Title className="sr-only">תפריט</Drawer.Title>}
                    {/* No horizontal padding here — content controls its own, since
                        different sheets have different layout needs. */}
                    <div className="overflow-y-auto pb-[max(24px,env(safe-area-inset-bottom))]">
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

'use client';

import { useEffect, useRef } from 'react';
import { type Order, urgencyOf, URGENCY_COLOR } from './types';

export function kitchenOrderTabId(orderId: string) {
    return `kitchen-order-tab-${orderId}`;
}

export function kitchenOrderPanelId(orderId: string) {
    return `kitchen-order-panel-${orderId}`;
}

/**
 * Return the next tab for a horizontal RTL strip. ArrowLeft moves to the tab
 * drawn on the left (the next DOM item), while ArrowRight moves to the right.
 */
export function orderTabTargetIndex(current: number, key: string, count: number): number | null {
    if (count <= 0 || current < 0 || current >= count) return null;
    if (key === 'ArrowLeft') return (current + 1) % count;
    if (key === 'ArrowRight') return (current - 1 + count) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return null;
}

/**
 * The queue, always visible. One tab per open order, ordered by pickup time.
 *
 * Pickup time is the largest thing on a tab because it is what the worker plans
 * around. Urgency is a compact text marker and lateness a short line of text —
 * never a flashing card, which is unusable on a surface someone works at. The
 * words matter: colour alone is too easy to miss at arm's length.
 *
 * Tabs never re-select on their own: a new order changes this strip, never the
 * order being worked on (see KitchenBoard).
 */

const STATUS_GLYPH: Record<string, { glyph: string; label: string; color: string }> = {
    waiting: { glyph: '○', label: 'ממתינה', color: 'rgba(255,255,255,0.55)' },
    preparing: { glyph: '●', label: 'בהכנה', color: '#ff9800' },
    ready: { glyph: '✓', label: 'מוכנה', color: '#66bb6a' },
    collected: { glyph: '✓', label: 'נמסרה', color: 'rgba(255,255,255,0.3)' },
};

export default function OrderTabs({
    orders, activeId, onSelect, newIds,
}: {
    orders: Order[];
    activeId: string | null;
    onSelect: (id: string) => void;
    newIds: string[];
}) {
    const stripRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef(new Map<string, HTMLButtonElement>());

    /**
     * Keep the order in the worker's hands ON SCREEN.
     *
     * Tabs shrink to a 130px floor and then the strip scrolls, so past a dozen
     * orders it overflows. Arrivals RE-SORT the strip (by pickup time), which
     * means the active tab could slide out of view on its own — during a rush,
     * which is exactly when it must not. KitchenBoard's focus rule protects
     * which order is active; nothing protected whether you could see it.
     *
     * Depends on the id ORDER, not just activeId, so a re-sort re-checks.
     */
    const order = orders.map(o => o.id).join(',');
    useEffect(() => {
        const strip = stripRef.current;
        const tab = activeId ? tabRefs.current.get(activeId) : null;
        if (!strip || !tab) return;
        const s = strip.getBoundingClientRect();
        const t = tab.getBoundingClientRect();
        // Only scroll when it is actually out of view: an unconditional
        // scrollIntoView on every 4s poll would fight a worker mid-scroll.
        if (t.left < s.left || t.right > s.right) {
            tab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
    }, [activeId, order]);

    const selectFromKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        const targetIndex = orderTabTargetIndex(currentIndex, event.key, orders.length);
        if (targetIndex === null) return;

        event.preventDefault();
        const target = orders[targetIndex];
        onSelect(target.id);
        requestAnimationFrame(() => tabRefs.current.get(target.id)?.focus({ preventScroll: true }));
    };

    return (
        <div ref={stripRef} style={S.strip} role="tablist" aria-label="הזמנות פתוחות" aria-orientation="horizontal">
            {orders.map((o, index) => {
                const active = o.id === activeId;
                const { level, lateBy } = urgencyOf(o.pickup_time);
                const dot = URGENCY_COLOR[level];
                const urgencyText = level === 'soon' ? 'קרוב' : level === 'urgent' ? 'דחוף' : level === 'late' ? 'מאוחר' : null;
                const st = STATUS_GLYPH[o.status] ?? STATUS_GLYPH.waiting;
                const isNew = newIds.includes(o.id);

                return (
                    <button
                        key={o.id}
                        ref={element => {
                            if (element) tabRefs.current.set(o.id, element);
                            else tabRefs.current.delete(o.id);
                        }}
                        id={kitchenOrderTabId(o.id)}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={active ? kitchenOrderPanelId(o.id) : undefined}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onSelect(o.id)}
                        onKeyDown={event => selectFromKeyboard(event, index)}
                        style={{
                            ...S.tab,
                            ...(active ? S.tabActive : {}),
                            ...(o.status === 'ready' && !active ? S.tabReady : {}),
                            ...(level === 'late' ? { borderColor: '#e53935' } : {}),
                        }}
                    >
                        {/* A real row, not an overlay: on a 12-ticket strip the
                            badges otherwise collide with the pickup time. */}
                        <span style={S.markers}>
                            {isNew && <span style={S.newDot}>חדש</span>}
                            {dot && urgencyText && (
                                <span style={{ ...S.urgency, color: dot, borderColor: dot }}>{urgencyText}</span>
                            )}
                        </span>

                        <span style={{ ...S.time, color: active ? '#fff' : 'rgba(255,255,255,0.9)' }}>
                            {o.pickup_time ?? '—'}
                        </span>
                        <span style={S.num}>{o.order_num}</span>
                        <span style={{ ...S.status, color: st.color }}>
                            {st.glyph} {st.label}
                        </span>
                        {lateBy > 0 && <span style={S.late}>באיחור {lateBy} דק׳</span>}
                    </button>
                );
            })}
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    strip: {
        display: 'flex', gap: '10px', padding: '10px 16px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        // The board column has a definite height; the strip keeps its size and
        // the active order scrolls instead.
        flexShrink: 0,
    },
    tab: {
        position: 'relative', flex: '1 1 0', minWidth: '130px', maxWidth: '220px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
        padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.05)',
        borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.12)',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textAlign: 'right',
        transition: 'background 0.15s ease, border-color 0.15s ease',
    },
    tabActive: {
        background: 'rgba(240,200,80,0.16)', borderColor: 'rgba(240,200,80,0.75)',
    },
    tabReady: {
        background: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.45)',
    },
    markers: {
        alignSelf: 'stretch', minHeight: '18px', display: 'flex', alignItems: 'center',
        justifyContent: 'flex-end', gap: '6px',
    },
    urgency: {
        padding: '1px 6px', borderRadius: '6px', border: '1px solid',
        background: 'rgba(0,0,0,0.28)', fontSize: '10px', fontWeight: 900,
    },
    newDot: {
        fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '6px',
        background: 'rgba(76,175,80,0.9)', color: '#04140a',
    },
    time: { fontSize: '26px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1.1 },
    num: { fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.6)' },
    status: { fontSize: '13px', fontWeight: 800 },
    late: { fontSize: '12px', fontWeight: 900, color: '#ff8a80' },
};

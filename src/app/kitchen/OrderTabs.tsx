'use client';

import { type Order, urgencyOf, URGENCY_COLOR } from './types';

/**
 * The queue, always visible. One tab per open order, ordered by pickup time.
 *
 * Pickup time is the largest thing on a tab because it is what the worker plans
 * around. Urgency is a single small dot and lateness a short line of text —
 * never a flashing card, which is unusable on a surface someone works at.
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
    return (
        <div style={S.strip} role="tablist" aria-label="הזמנות פתוחות">
            {orders.map(o => {
                const active = o.id === activeId;
                const { level, lateBy } = urgencyOf(o.pickup_time);
                const dot = URGENCY_COLOR[level];
                const st = STATUS_GLYPH[o.status] ?? STATUS_GLYPH.waiting;
                const isNew = newIds.includes(o.id);

                return (
                    <button
                        key={o.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSelect(o.id)}
                        style={{
                            ...S.tab,
                            ...(active ? S.tabActive : {}),
                            ...(o.status === 'ready' && !active ? S.tabReady : {}),
                            ...(level === 'late' ? { borderColor: '#e53935' } : {}),
                        }}
                    >
                        {/* Urgency + "new" markers, top corner, static */}
                        <span style={S.markers}>
                            {isNew && <span style={S.newDot}>חדש</span>}
                            {dot && <span style={{ ...S.dot, background: dot }} aria-hidden />}
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
    },
    tab: {
        position: 'relative', flex: '1 1 0', minWidth: '130px', maxWidth: '220px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
        padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.12)',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textAlign: 'right',
        transition: 'background 0.15s ease, border-color 0.15s ease',
    },
    tabActive: {
        background: 'rgba(240,200,80,0.16)', borderColor: 'rgba(240,200,80,0.75)',
    },
    tabReady: {
        background: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.45)',
    },
    markers: { position: 'absolute', top: '8px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px' },
    dot: { width: '10px', height: '10px', borderRadius: '50%', display: 'block' },
    newDot: {
        fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '6px',
        background: 'rgba(76,175,80,0.9)', color: '#04140a',
    },
    time: { fontSize: '26px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1.1 },
    num: { fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.6)' },
    status: { fontSize: '13px', fontWeight: 800 },
    late: { fontSize: '12px', fontWeight: 900, color: '#ff8a80' },
};

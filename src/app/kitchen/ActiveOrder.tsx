'use client';

import { groupByZone, type ZoneId } from '@/lib/orderZones';
import { type Order, type OrderStatus, urgencyOf, minutesUntilPickup, paymentLabel } from './types';

/**
 * The order the worker is on.
 *
 * A `waiting` order is a decision, not a task: it renders as an accept screen —
 * what was ordered, when it's due, anything special — with one large button.
 * Only once accepted does it become the work surface, where everything is
 * visible at once, grouped in the order the salad is actually assembled, and
 * the worker taps each ingredient as they add it at their own pace. That
 * tapping IS the progress; there are no stages to advance.
 */

/** Wide-side zones (the bulk of the assembly) vs the fixed side column. */
const MAIN_ZONES: ZoneId[] = ['base', 'protein', 'other'];

export default function ActiveOrder({
    order, sizeLabel, onStatus, checked, onToggleItem,
}: {
    order: Order;
    /** Which bowl to reach for — the board maps the stored base price to this. */
    sizeLabel: string | null;
    onStatus: (status: OrderStatus) => void;
    checked: string[];
    onToggleItem: (itemId: string) => void;
}) {
    const grouped = groupByZone(order.items);
    const main = grouped.filter(g => MAIN_ZONES.includes(g.zone.id));
    const side = grouped.filter(g => !MAIN_ZONES.includes(g.zone.id));

    const { level, lateBy } = urgencyOf(order.pickup_time);
    const mins = minutesUntilPickup(order.pickup_time);
    const pay = paymentLabel(order.payment_status);
    const doneCount = order.items.filter(i => checked.includes(i.id)).length;

    const renderZone = (g: { zone: { id: ZoneId; title: string }; items: Order['items'] }, big: boolean) => (
        <section key={g.zone.id} style={S.zone}>
            <div style={S.zoneTitle}>
                <span>{g.zone.title}</span>
                <span style={S.zoneCount}>{g.items.length}</span>
            </div>
            <div style={S.chips}>
                {g.items.map(it => {
                    const done = checked.includes(it.id);
                    return (
                        <button
                            key={it.id}
                            type="button"
                            onClick={() => onToggleItem(it.id)}
                            style={{ ...S.chip, ...(big ? S.chipBig : {}), ...(done ? S.chipDone : {}) }}
                        >
                            {it.icon?.startsWith('/')
                                ? <img src={it.icon} alt="" style={{ width: big ? '34px' : '26px', height: big ? '34px' : '26px', objectFit: 'contain' }} />
                                : <span style={{ fontSize: big ? '26px' : '20px' }}>{it.icon}</span>}
                            <span style={S.chipName}>{it.he}</span>
                            {done && <span style={S.chipTick}>✓</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );

    // ── Not accepted yet: one decision, made large ──
    if (order.status === 'waiting') {
        return (
            <div style={S.acceptRoot}>
                <div style={S.acceptCard}>
                    <div style={S.acceptTag}>🔔 הזמנה חדשה</div>

                    <div style={S.acceptHead}>
                        <span style={S.acceptNum}>{order.order_num}</span>
                        {order.customer_name && <span style={S.acceptName}>· {order.customer_name}</span>}
                    </div>

                    <div style={{ ...S.acceptTime, color: level === 'late' ? '#ff8a80' : '#fff' }}>
                        {order.pickup_time ? `איסוף ${order.pickup_time}` : 'ללא שעת איסוף'}
                        {lateBy > 0
                            ? <span style={S.headLate}> · באיחור {lateBy} דק׳</span>
                            : mins !== null && <span style={S.headMins}> · נשארו {mins} דק׳</span>}
                    </div>

                    <div style={S.acceptFacts}>
                        {sizeLabel && <span style={S.fact}>🥣 {sizeLabel}</span>}
                        <span style={S.fact}>{order.items.length} מרכיבים</span>
                        {pay && (
                            <span style={{ ...S.fact, ...(pay.owed ? S.payOwed : S.payDone) }}>
                                {pay.owed ? '💳' : '✓'} {pay.text}
                            </span>
                        )}
                    </div>

                    {/* Anything special is seen BEFORE committing to the order */}
                    {order.notes && (
                        <div style={S.notes} role="alert">
                            <span style={{ fontSize: '22px' }}>⚠️</span>
                            <span>{order.notes}</span>
                        </div>
                    )}

                    {/* Read-only here — so the worker can check stock before accepting */}
                    <div style={S.acceptItems}>
                        {grouped.map(g => (
                            <div key={g.zone.id} style={S.acceptZoneRow}>
                                <span style={S.acceptZoneName}>{g.zone.title}</span>
                                <span style={S.acceptZoneItems}>{g.items.map(i => i.he).join(' · ')}</span>
                            </div>
                        ))}
                    </div>

                    <button type="button" style={S.acceptBtn} onClick={() => onStatus('preparing')}>
                        קבל הזמנה והתחל הכנה ←
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={S.root}>
            {/* Identity — order, customer, when */}
            <div style={S.header}>
                <div style={S.headLeft}>
                    <span style={S.headNum}>{order.order_num}</span>
                    {order.customer_name && <span style={S.headName}>· {order.customer_name}</span>}
                    <span style={S.progress}>{doneCount}/{order.items.length}</span>
                </div>
                <div style={S.headRight}>
                    {order.pickup_time && (
                        <span style={{ ...S.headTime, color: level === 'late' ? '#ff8a80' : '#fff' }}>
                            איסוף {order.pickup_time}
                            {lateBy > 0
                                ? <span style={S.headLate}> · באיחור {lateBy} דק׳</span>
                                : mins !== null && <span style={S.headMins}> · נשארו {mins} דק׳</span>}
                        </span>
                    )}
                    {pay && (
                        <span style={{ ...S.payPill, ...(pay.owed ? S.payOwed : S.payDone) }}>
                            {pay.owed ? '💳' : '✓'} {pay.text}
                        </span>
                    )}
                </div>
            </div>

            {/* Notes: allergies live here, so they never sit inside the ingredient list */}
            {order.notes && (
                <div style={S.notes} role="alert">
                    <span style={{ fontSize: '22px' }}>⚠️</span>
                    <span>{order.notes}</span>
                </div>
            )}

            <div className="kitchen-active-body" style={S.body}>
                <div style={S.mainCol}>
                    {main.length > 0 ? main.map(g => renderZone(g, true)) : <div style={S.empty}>אין מרכיבים</div>}
                </div>
                <div style={S.sideCol}>
                    {side.map(g => renderZone(g, false))}
                    <div style={S.bowl}>
                        <span style={S.bowlLabel}>קערה</span>
                        <span style={S.bowlValue}>{sizeLabel ?? '—'}</span>
                    </div>
                </div>
            </div>

            {/* Only the actions that change the customer's order. Accepting
                happened on the previous screen, so nothing competes here. */}
            <div style={S.actions}>
                {order.status !== 'ready' && (
                    <button type="button" style={S.primaryBtn} onClick={() => onStatus('ready')}>
                        מוכן לאיסוף ✓
                    </button>
                )}
                {order.status === 'ready' && (
                    <button type="button" style={S.deliverBtn} onClick={() => onStatus('collected')}>
                        נמסר ללקוח ✓
                    </button>
                )}
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    // ── Accept screen ──
    acceptRoot: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: 0, overflowY: 'auto' },
    acceptCard: {
        width: '100%', maxWidth: '720px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        padding: '24px 28px', borderRadius: '18px',
        background: 'rgba(76,175,80,0.08)', border: '2px solid rgba(76,175,80,0.45)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
    },
    acceptTag: {
        alignSelf: 'flex-start', padding: '6px 16px', borderRadius: '999px',
        background: 'rgba(76,175,80,0.9)', color: '#04140a',
        fontSize: '15px', fontWeight: 900, letterSpacing: '0.02em',
    },
    acceptHead: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' },
    acceptNum: { fontSize: '44px', fontWeight: 900, color: 'var(--color-gold-light)', lineHeight: 1 },
    acceptName: { fontSize: '26px', fontWeight: 800, color: 'rgba(255,255,255,0.9)' },
    acceptTime: { fontSize: '24px', fontWeight: 800 },
    acceptFacts: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    fact: {
        padding: '8px 14px', borderRadius: '999px',
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
        fontSize: '16px', fontWeight: 800, color: 'rgba(255,255,255,0.9)',
    },
    acceptItems: {
        display: 'flex', flexDirection: 'column', gap: '8px',
        padding: '14px 16px', borderRadius: '12px',
        background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.1)',
    },
    acceptZoneRow: { display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' },
    acceptZoneName: { flexShrink: 0, minWidth: '120px', fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.5)' },
    acceptZoneItems: { fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.5 },
    acceptBtn: {
        width: '100%', minHeight: '84px', borderRadius: '14px', cursor: 'pointer',
        background: 'linear-gradient(135deg, #43a047, #66bb6a)', border: 'none',
        color: '#04140a', fontSize: '26px', fontWeight: 900,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },

    root: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px 16px', minHeight: 0, flex: 1 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' },
    headLeft: { display: 'flex', alignItems: 'baseline', gap: '10px' },
    headNum: { fontSize: '30px', fontWeight: 900, color: 'var(--color-gold-light)' },
    headName: { fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.85)' },
    progress: { fontSize: '16px', fontWeight: 800, color: 'rgba(255,255,255,0.45)' },
    headRight: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
    headTime: { fontSize: '19px', fontWeight: 800 },
    headMins: { fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.55)' },
    headLate: { fontSize: '15px', fontWeight: 900, color: '#ff8a80' },
    payPill: { padding: '6px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: 800 },
    payOwed: { background: 'rgba(255,183,77,0.16)', border: '1px solid rgba(255,183,77,0.5)', color: '#ffcc80' },
    payDone: { background: 'rgba(102,187,106,0.14)', border: '1px solid rgba(102,187,106,0.45)', color: '#a5d6a7' },
    notes: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(229,57,53,0.16)', border: '2px solid rgba(229,57,53,0.6)',
        color: '#ffd7d5', fontSize: '19px', fontWeight: 800, lineHeight: 1.4,
    },
    body: { display: 'flex', gap: '12px', flex: 1, minHeight: 0, alignItems: 'stretch' },
    mainCol: { flex: '0 0 64%', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, overflowY: 'auto' },
    sideCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, overflowY: 'auto' },
    zone: {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '10px 12px',
    },
    zoneTitle: {
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
        fontSize: '15px', fontWeight: 900, color: 'rgba(255,255,255,0.75)',
    },
    zoneCount: {
        minWidth: '24px', padding: '1px 8px', borderRadius: '999px', textAlign: 'center',
        background: 'rgba(255,255,255,0.12)', fontSize: '13px', fontWeight: 900,
    },
    chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    chip: {
        position: 'relative', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', minHeight: '48px', borderRadius: '10px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
        color: '#fff', fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    chipBig: { minHeight: '56px', padding: '10px 14px' },
    chipDone: { background: 'rgba(76,175,80,0.18)', borderColor: 'rgba(76,175,80,0.5)', opacity: 0.7 },
    chipName: { fontSize: '17px', fontWeight: 800 },
    chipTick: { fontSize: '15px', fontWeight: 900, color: '#a5d6a7' },
    bowl: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '12px',
        background: 'rgba(240,200,80,0.1)', border: '1px solid rgba(240,200,80,0.35)',
    },
    bowlLabel: { fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.6)' },
    bowlValue: { fontSize: '20px', fontWeight: 900, color: 'var(--color-gold-light)' },
    empty: { padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' },
    actions: { display: 'flex', gap: '10px' },
    primaryBtn: {
        flex: 1.4, minHeight: '62px', borderRadius: '12px', cursor: 'pointer',
        background: 'linear-gradient(135deg, #c8a832, #f0d060)', border: 'none',
        color: '#1a0e00', fontSize: '20px', fontWeight: 900,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    deliverBtn: {
        flex: 1.4, minHeight: '62px', borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(76,175,80,0.3)', border: '2px solid rgba(76,175,80,0.7)',
        color: '#fff', fontSize: '20px', fontWeight: 900,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
};

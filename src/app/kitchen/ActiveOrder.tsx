'use client';

import { groupByZone, type ZoneId } from '@/lib/orderZones';
import { type Order, type OrderStatus, type PayTone, urgencyOf, minutesUntilPickup, paymentLabel, handoffActionLabel } from './types';

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

/**
 * Chip size scales DOWN with the number of ingredients, not up.
 *
 * The board is wall-mounted and read at arm's length or further, and most
 * orders are short — a 4-ingredient ticket was using about a sixth of a
 * 1920×1200 screen and leaving ~650px of empty black below it. The wasted space
 * was on the one element where a misread costs a remade salad.
 *
 * So the space gets spent on whichever order is actually open: few ingredients,
 * very large chips; a full bowl, still comfortably larger than before (the old
 * fixed size was 56px tall with 17px names, which is the `sm` tier here and now
 * only applies to the side column). Tiers rather than a fluid scale because the
 * result has to be predictable — staff learn the size of a thing.
 */
type ChipTier = 'sm' | 'md' | 'lg' | 'xl';

export function chipTier(itemCount: number): ChipTier {
    if (itemCount <= 5) return 'xl';
    if (itemCount <= 9) return 'lg';
    return 'md';
}

const CHIP: Record<ChipTier, { minHeight: number; icon: number; name: number; padX: number; gap: number }> = {
    sm: { minHeight: 52, icon: 26, name: 17, padX: 12, gap: 8 },
    md: { minHeight: 74, icon: 38, name: 21, padX: 16, gap: 10 },
    lg: { minHeight: 92, icon: 48, name: 25, padX: 20, gap: 12 },
    xl: { minHeight: 116, icon: 60, name: 30, padX: 24, gap: 14 },
};

export default function ActiveOrder({
    order, sizeLabel, onStatus, checked, onToggleItem, statusBusy,
}: {
    order: Order;
    /** Which bowl to reach for — the board maps the stored base price to this. */
    sizeLabel: string | null;
    onStatus: (status: OrderStatus) => void;
    checked: string[];
    onToggleItem: (itemId: string) => void;
    statusBusy: boolean;
}) {
    const grouped = groupByZone(order.items);
    const main = grouped.filter(g => MAIN_ZONES.includes(g.zone.id));
    const side = grouped.filter(g => !MAIN_ZONES.includes(g.zone.id));

    const { level, lateBy } = urgencyOf(order.pickup_time);
    const mins = minutesUntilPickup(order.pickup_time);
    const pay = paymentLabel(order.payment_status);
    const doneCount = order.items.filter(i => checked.includes(i.id)).length;

    // The main column's size comes from the WHOLE order, not from the zone —
    // otherwise a 2-item sauce zone would render huge next to a 10-item veg one.
    const mainTier = chipTier(order.items.length);

    const renderZone = (g: { zone: { id: ZoneId; title: string }; items: Order['items'] }, tier: ChipTier) => {
        const c = CHIP[tier];
        return (
            <section key={g.zone.id} style={S.zone}>
                <div style={S.zoneTitle}>
                    <span>{g.zone.title}</span>
                    <span style={S.zoneCount}>{g.items.length}</span>
                </div>
                <div style={{ ...S.chips, gap: `${c.gap}px` }}>
                    {g.items.map(it => {
                        const done = checked.includes(it.id);
                        return (
                            <button
                                key={it.id}
                                type="button"
                                aria-pressed={done}
                                onClick={() => onToggleItem(it.id)}
                                style={{
                                    ...S.chip,
                                    minHeight: `${c.minHeight}px`,
                                    padding: `${Math.round(c.minHeight * 0.14)}px ${c.padX}px`,
                                    gap: `${Math.round(c.gap * 0.9)}px`,
                                    ...(done ? S.chipDone : {}),
                                }}
                            >
                                {it.icon?.startsWith('/')
                                    ? <img src={it.icon} alt="" style={{ width: `${c.icon}px`, height: `${c.icon}px`, objectFit: 'contain' }} />
                                    : <span style={{ fontSize: `${c.icon}px`, lineHeight: 1 }}>{it.icon}</span>}
                                <span style={{ ...S.chipName, fontSize: `${c.name}px` }}>{it.he}</span>
                                {done && <span style={{ ...S.chipTick, fontSize: `${Math.round(c.name * 0.9)}px` }}>✓</span>}
                            </button>
                        );
                    })}
                </div>
            </section>
        );
    };

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
                            <span style={{ ...S.fact, ...PAY_TONE[pay.tone] }}>
                                {PAY_GLYPH[pay.tone]} {pay.text}
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
                        <span style={{ ...S.payPill, ...PAY_TONE[pay.tone] }}>
                            {PAY_GLYPH[pay.tone]} {pay.text}
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
                    {main.length > 0 ? main.map(g => renderZone(g, mainTier)) : <div style={S.empty}>אין מרכיבים</div>}
                </div>
                <div style={S.sideCol}>
                    {/* One tier down: sauces and finishes are fewer and the
                        column is narrower, and they are not what gets confused. */}
                    {side.map(g => renderZone(g, mainTier === 'xl' ? 'lg' : mainTier === 'lg' ? 'md' : 'sm'))}
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
                    <button
                        type="button"
                        disabled={statusBusy}
                        style={{ ...S.primaryBtn, ...(statusBusy ? S.actionBusy : {}) }}
                        onClick={() => onStatus('ready')}
                    >
                        מוכן לאיסוף ✓
                    </button>
                )}
                {order.status === 'ready' && (
                    <button
                        type="button"
                        disabled={statusBusy}
                        style={{
                            ...S.deliverBtn,
                            ...(pay && pay.tone !== 'settled' ? S.deliverPaymentBtn : {}),
                            ...(statusBusy ? S.actionBusy : {}),
                        }}
                        onClick={() => onStatus('collected')}
                    >
                        {handoffActionLabel(order.payment_status)}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Three tones, and `verify` is amber on purpose.
 *
 * It is not "money owed", so it must not read as owed — but it is also not
 * finished, so it must not read green either. Amber is the difference between
 * "hand it over" and "hand it over after you have checked the register", which
 * is the entire compensating control for an unverifiable payment webhook.
 */
const PAY_TONE: Record<PayTone, React.CSSProperties> = {
    settled: { background: 'rgba(102,187,106,0.14)', border: '1px solid rgba(102,187,106,0.45)', color: '#a5d6a7' },
    verify: { background: 'rgba(255,183,77,0.18)', border: '1px solid rgba(255,183,77,0.7)', color: '#ffd699' },
    owed: { background: 'rgba(255,183,77,0.16)', border: '1px solid rgba(255,183,77,0.5)', color: '#ffcc80' },
};
const PAY_GLYPH: Record<PayTone, string> = { settled: '✓', verify: '🔍', owed: '💳' };

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
    notes: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(229,57,53,0.16)', border: '2px solid rgba(229,57,53,0.6)',
        color: '#ffd7d5', fontSize: '19px', fontWeight: 800, lineHeight: 1.4,
    },
    body: { display: 'flex', gap: '12px', flex: 1, minHeight: 0, alignItems: 'stretch' },
    // 'safe center': the columns CENTRE their cards when the order is short and
    // fall back to top-aligned the moment it overflows. Plain 'center' with
    // overflow makes the top of a tall order unreachable, which on a 14-item
    // ticket would hide the first ingredients.
    //
    // Letting the zone CARDS stretch instead was the first attempt and it was
    // worse: a one-item zone got the same height as a ten-item one, so the
    // board went from empty space below the cards to empty space inside them.
    mainCol: { flex: '0 0 64%', display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: '10px', minWidth: 0, overflowY: 'auto' },
    sideCol: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: '10px', minWidth: 0, overflowY: 'auto' },
    zone: {
        display: 'flex', flexDirection: 'column',
        flex: '0 0 auto',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px', padding: '12px 14px',
    },
    zoneTitle: {
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
        fontSize: '15px', fontWeight: 900, color: 'rgba(255,255,255,0.75)',
    },
    zoneCount: {
        minWidth: '24px', padding: '1px 8px', borderRadius: '999px', textAlign: 'center',
        background: 'rgba(255,255,255,0.12)', fontSize: '13px', fontWeight: 900,
    },
    // Centred in whatever height the zone ended up with.
    chips: { display: 'flex', flexWrap: 'wrap' },
    chip: {
        position: 'relative', display: 'flex', alignItems: 'center',
        borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)',
        color: '#fff', fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    chipDone: { background: 'rgba(76,175,80,0.18)', borderColor: 'rgba(76,175,80,0.5)', opacity: 0.7 },
    chipName: { fontWeight: 800, whiteSpace: 'nowrap' },
    chipTick: { fontWeight: 900, color: '#a5d6a7' },
    // The vessel to reach for, given the room to be unmissable — it is the one
    // thing on this screen that cannot be corrected after the fact.
    bowl: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
        flex: '0 0 auto', minHeight: '150px', padding: '18px',
        borderRadius: '14px',
        background: 'rgba(240,200,80,0.10)', border: '1px solid rgba(240,200,80,0.38)',
    },
    bowlLabel: { fontSize: '15px', fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' },
    bowlValue: { fontSize: 'clamp(28px, 3.4vw, 52px)', fontWeight: 900, color: 'var(--color-gold-light)', lineHeight: 1 },
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
    deliverPaymentBtn: {
        background: 'rgba(255,183,77,0.22)', border: '2px solid rgba(255,183,77,0.78)',
        color: '#fff4df',
    },
    actionBusy: { opacity: 0.55, cursor: 'wait' },
};

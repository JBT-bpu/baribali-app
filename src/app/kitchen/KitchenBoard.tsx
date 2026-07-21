'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Circle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import BariButton from '@/components/ui/bari/BariButton';

// ─── Types ──────────────────────────────────────────────────────
type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'collected';

interface OrderItem {
    id: string;
    he: string;
    icon: string;
    price: number;
}

interface Order {
    id: string;
    order_num: string;
    items: OrderItem[];
    total: number;
    pickup_time: string | null;
    notes: string | null;
    size: string | null;
    status: OrderStatus;
    created_at: string;
}

// ─── Status config ───────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; next: OrderStatus | null; nextLabel: string | null }> = {
    waiting:    { label: 'ממתין',   color: '#aaa',    bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', next: 'preparing', nextLabel: 'התחל הכנה' },
    preparing:  { label: 'בהכנה',   color: '#ff9800', bg: 'rgba(255,152,0,0.1)',    border: 'rgba(255,152,0,0.35)',   next: 'ready',     nextLabel: 'מוכן ✓' },
    ready:      { label: 'מוכן',    color: 'var(--color-green-accent)', bg: 'rgba(76,175,80,0.12)',   border: 'rgba(76,175,80,0.4)',    next: 'collected', nextLabel: 'נאסף ✓' },
    collected:  { label: 'נאסף',    color: '#555',    bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', next: null,        nextLabel: null },
};

// ─── Helpers ────────────────────────────────────────────────────
function minutesUntilPickup(pickupTime: string | null): number | null {
    if (!pickupTime) return null;
    const [h, m] = pickupTime.split(':').map(Number);
    const now = new Date();
    const pickup = new Date();
    pickup.setHours(h, m, 0, 0);
    return Math.round((pickup.getTime() - now.getTime()) / 60000);
}

function getColumn(order: Order): 'now' | 'soon' | 'later' | 'done' {
    if (order.status === 'collected') return 'done';
    const mins = minutesUntilPickup(order.pickup_time);
    if (mins === null || mins <= 5) return 'now';
    if (mins <= 15) return 'soon';
    return 'later';
}

// ─── Main component ──────────────────────────────────────────────
// `authEnabled` comes from the server guard (page.tsx) — the board itself
// can't read the server-only KITCHEN_PASSWORD, so it's told whether a session
// is in play, which is what gates the logout button and the 401 bounce-back.
export default function KitchenBoard({ authEnabled }: { authEnabled: boolean }) {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const [scrolled, setScrolled] = useState(false);
    const isDemo = !isSupabaseConfigured();

    // If the session expired mid-shift, API calls start returning 401.
    // Re-run the server guard, which will render the login screen.
    const onUnauthorized = useCallback(() => {
        if (authEnabled) router.refresh();
    }, [authEnabled, router]);

    const logout = useCallback(async () => {
        await fetch('/api/kitchen/logout', { method: 'POST' }).catch(() => {});
        router.refresh();
    }, [router]);

    // Refresh clock every minute to re-bucket orders
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    // Header elevation once the page scrolls
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Initial load — the API route itself falls back to the shared demo
    // store when Supabase isn't configured, so the client doesn't need its
    // own separate demo-fixture logic; this always hits the real endpoint.
    const loadOrders = useCallback(async () => {
        // Session cookie is sent automatically (same-origin) — no header needed.
        const res = await fetch('/api/kitchen/orders');
        if (res.status === 401) { onUnauthorized(); return; }
        if (res.ok) {
            const data = await res.json();
            // Keyed by order.id in the render below, so React reconciles in place
            // rather than remounting cards — no visual "jump" on each poll.
            setOrders(data as Order[]);
        }
        setLoading(false);
    }, [onUnauthorized]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Poll for updates — replaces the old Realtime subscription, since
    // anon-client Realtime access relied on the RLS policies that are now
    // locked down. Also picks up new demo orders created elsewhere in the app.
    useEffect(() => {
        const id = setInterval(loadOrders, 4000);
        return () => clearInterval(id);
    }, [loadOrders]);

    // Update order status — same endpoint in demo and live mode, the route
    // itself decides whether to write to Supabase or the demo store.
    const updateStatus = useCallback(async (id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); // optimistic
        const res = await fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (res.status === 401) onUnauthorized();
    }, [onUnauthorized]);

    // Bucket orders into columns
    const columns = {
        now:   orders.filter(o => getColumn(o) === 'now'),
        soon:  orders.filter(o => getColumn(o) === 'soon'),
        later: orders.filter(o => getColumn(o) === 'later'),
    };

    const totalActive = orders.filter(o => o.status !== 'collected').length;

    return (
        <div style={K.root}>
            <style>{`
                @keyframes checkPop { 0%{transform:scale(0.4)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
                @media (max-width: 900px) {
                    .kitchen-columns { grid-template-columns: 1fr 1fr !important; }
                    .kitchen-columns > :last-child { grid-column: 1 / -1; }
                }
                @media (max-width: 620px) {
                    .kitchen-columns { grid-template-columns: 1fr !important; }
                    .kitchen-columns > :last-child { grid-column: auto; }
                }
            `}</style>

            {/* Header */}
            <div style={{ ...K.header, boxShadow: scrolled ? '0 4px 16px rgba(0,0,0,0.45)' : 'none' }}>
                <div style={K.headerTitle}>🥗 מטבח BariBali</div>
                <div style={K.headerMeta}>
                    {isDemo && (
                        <>
                            <span style={K.demoBadge}>DEMO — חבר Supabase להזמנות אמיתיות</span>
                            <button
                                type="button"
                                style={K.resetBtn}
                                onClick={async () => {
                                    await fetch('/api/demo/reset', { method: 'POST' });
                                    loadOrders();
                                }}
                            >
                                🔄 אפס נתוני דמו
                            </button>
                        </>
                    )}
                    <span style={K.clock}>{now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={K.activeCount}>{totalActive} הזמנות פעילות</span>
                    {authEnabled && (
                        <button type="button" style={K.resetBtn} onClick={logout}>
                            🔒 יציאה
                        </button>
                    )}
                </div>
            </div>

            {loading && <div style={K.loadingMsg}>טוען הזמנות...</div>}
            {!loading && totalActive === 0 && (
                <div style={K.emptyMsg}>אין הזמנות פעילות כרגע ✓</div>
            )}

            {/* Columns */}
            {!loading && (
                <div className="kitchen-columns" style={K.columns}>
                    <Column title="עכשיו" accent="#e53935" orders={columns.now} onUpdate={updateStatus} />
                    <Column title="עוד 10–15 דק׳" accent="#ff9800" orders={columns.soon} onUpdate={updateStatus} />
                    <Column title="מאוחר יותר" accent="#555" orders={columns.later} onUpdate={updateStatus} />
                </div>
            )}
        </div>
    );
}

// ─── Column ─────────────────────────────────────────────────────
function Column({ title, accent, orders, onUpdate }: {
    title: string;
    accent: string;
    orders: Order[];
    onUpdate: (id: string, status: OrderStatus) => void;
}) {
    return (
        <div style={K.column}>
            <div style={{ ...K.colHeader, borderBottom: `3px solid ${accent}` }}>
                <span style={{ ...K.colTitle, color: accent }}>{title}</span>
                {orders.length > 0 && (
                    <span style={{ ...K.colBadge, background: accent }}>{orders.length}</span>
                )}
            </div>
            <div style={K.colBody}>
                {orders.length === 0 && <div style={K.colEmpty}>ריק</div>}
                {orders.map(order => (
                    <OrderCard key={order.id} order={order} onUpdate={onUpdate} />
                ))}
            </div>
        </div>
    );
}

// ─── Order card ─────────────────────────────────────────────────
function OrderCard({ order, onUpdate }: { order: Order; onUpdate: (id: string, status: OrderStatus) => void }) {
    const cfg = STATUS_CONFIG[order.status];
    const nextStatus = cfg.next;
    const mins = minutesUntilPickup(order.pickup_time);
    const isUrgent = mins !== null && mins <= 5;

    // Checklist state — resets when this card's order changes
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const allChecked = order.items.length > 0 && checked.size === order.items.length;

    const toggle = (id: string) => {
        setChecked(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        // Light haptic on touch devices
        if (navigator.vibrate) navigator.vibrate(12);
    };

    return (
        <div style={{ ...K.card, background: cfg.bg, border: `1.5px solid ${isUrgent ? '#e53935' : cfg.border}` }}>

            {/* Card header */}
            <div style={K.cardTop}>
                <span style={K.cardNum}>{order.order_num}</span>
                <span style={{ ...K.cardStatus, color: cfg.color }}>{cfg.label}</span>
                {order.pickup_time && (
                    <span style={{ ...K.cardTime, color: isUrgent ? '#e53935' : '#ccc' }}>
                        ⏰ {order.pickup_time}
                        {mins !== null && (
                            <span style={{ fontSize: '13px', marginRight: '4px' }}>
                                ({mins > 0 ? `${mins} דק׳` : 'עכשיו!'})
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Size + total row */}
            <div style={K.cardMeta}>
                {order.size && <span style={K.sizePill}>{order.size}</span>}
                <span style={K.metaTotal}>₪{order.total}</span>
            </div>

            {/* ── Ingredient checklist ── */}
            <div style={K.checkProgress}>
                <span style={K.checkProgressText}>
                    {checked.size} / {order.items.length} נוספו
                </span>
                <div style={K.checkBar}>
                    <div style={{ ...K.checkBarFill, width: `${order.items.length ? Math.round((checked.size / order.items.length) * 100) : 0}%` }} />
                </div>
            </div>

            <div style={K.checklist}>
                {order.items.map(it => {
                    const done = checked.has(it.id);
                    return (
                        <button
                            key={it.id}
                            type="button"
                            style={{ ...K.checkRow, ...(done ? K.checkRowDone : {}) }}
                            onClick={() => toggle(it.id)}
                        >
                            <span style={K.checkEmoji}>
                                {it.icon && it.icon.startsWith('/')
                                    ? <img src={it.icon} alt={it.he} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                                    : it.icon}
                            </span>
                            <span style={{ ...K.checkName, ...(done ? K.checkNameDone : {}) }}>{it.he}</span>
                            <span style={{ ...K.checkMark, ...(done ? K.checkMarkDone : {}) }}>
                                {done
                                    ? <CircleCheck size={22} strokeWidth={2.3} style={{ animation: 'checkPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }} />
                                    : <Circle size={22} strokeWidth={2} />}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Notes */}
            {order.notes && (
                <div style={K.cardNotes}>📝 {order.notes}</div>
            )}

            {/* Action button */}
            {nextStatus && (
                <BariButton
                    variant="secondary"
                    size="lg"
                    fullWidth
                    style={{
                        background: allChecked ? cfg.color : 'rgba(255,255,255,0.08)',
                        color: allChecked ? (order.status === 'waiting' ? '#fff' : '#000') : 'rgba(255,255,255,0.3)',
                        border: allChecked ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
                        marginTop: '4px',
                    }}
                    onClick={() => {
                        if (navigator.vibrate) navigator.vibrate([20, 50, 30]);
                        onUpdate(order.id, nextStatus);
                    }}
                >
                    {allChecked ? cfg.nextLabel : `${cfg.nextLabel} (${order.items.length - checked.size} נותרו)`}
                </BariButton>
            )}
        </div>
    );
}

// ─── Styles ─────────────────────────────────────────────────────
const K: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100vh', background: '#0a0a0a',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
        color: '#fff', padding: '0 0 40px',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0, zIndex: 10,
    },
    headerTitle: { fontSize: '20px', fontWeight: 900, color: 'var(--color-gold-light)' },
    headerMeta: { display: 'flex', alignItems: 'center', gap: '16px' },
    clock: { fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' },
    activeCount: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
    demoBadge: { fontSize: '11px', fontWeight: 700, color: '#ff9800', background: 'rgba(255,152,0,0.12)', border: '1px solid rgba(255,152,0,0.3)', padding: '4px 10px', borderRadius: '8px' },
    resetBtn: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: "var(--font-heebo), 'Heebo', sans-serif" },

    loadingMsg: { padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '16px' },
    emptyMsg: { padding: '80px', textAlign: 'center', color: 'var(--color-green-accent)', fontSize: '18px', fontWeight: 700 },

    columns: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px', padding: '20px 16px',
    },
    column: { display: 'flex', flexDirection: 'column', gap: '12px' },
    colHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 4px', marginBottom: '4px',
    },
    colTitle: { fontSize: '16px', fontWeight: 900, letterSpacing: '0.02em' },
    colBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', borderRadius: '50%',
        fontSize: '13px', fontWeight: 900, color: '#000',
    },
    colBody: { display: 'flex', flexDirection: 'column', gap: '10px' },
    colEmpty: { fontSize: '13px', color: 'rgba(255,255,255,0.2)', padding: '12px 4px', textAlign: 'center' },

    card: {
        borderRadius: '14px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        transition: 'border-color 0.2s',
    },
    cardTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    cardNum: { fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '0.04em' },
    cardStatus: { fontSize: '12px', fontWeight: 700, marginRight: 'auto' },
    cardTime: { fontSize: '12px', fontWeight: 700 },

    cardMeta: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-2px' },
    sizePill: { fontSize: '11px', fontWeight: 800, color: 'var(--color-gold-light)', background: 'rgba(240,208,96,0.12)', border: '1px solid rgba(240,208,96,0.25)', padding: '2px 8px', borderRadius: '8px' },
    metaTotal: { fontSize: '15px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', marginRight: 'auto' },

    checkProgress: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' },
    checkProgressText: { fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' as const, minWidth: '70px' },
    checkBar: { flex: 1, height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    checkBarFill: { height: '100%', borderRadius: '4px', background: 'var(--color-green-accent)', transition: 'width 0.2s ease' },

    checklist: { display: 'flex', flexDirection: 'column' as const, gap: '4px', marginTop: '2px' },
    checkRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
        border: '1.5px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        minHeight: '60px', width: '100%', textAlign: 'right' as const,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", transition: 'background 0.15s, border-color 0.15s',
    },
    checkRowDone: { background: 'rgba(76,175,80,0.12)', border: '1.5px solid rgba(76,175,80,0.35)' },
    checkEmoji: { fontSize: '30px', lineHeight: 1, flexShrink: 0 },
    checkName: { fontSize: '18px', fontWeight: 700, color: '#fff', flex: 1 },
    checkNameDone: { textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)' },
    checkMark: { fontSize: '20px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', flexShrink: 0, minWidth: '28px', textAlign: 'center' as const },
    checkMarkDone: { color: 'var(--color-green-accent)' },

    cardNotes: {
        fontSize: '12px', color: 'rgba(255,200,100,0.8)', fontWeight: 600,
        padding: '6px 8px', borderRadius: '8px',
        background: 'rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.15)',
    },

};

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SIZE_CONFIG } from '@/data/salad-data.js';
import { sizeMlFromBase, detectOrderType } from '@/lib/reorder';
import OrderTabs from './OrderTabs';
import ActiveOrder from './ActiveOrder';
import { type Order, type OrderStatus, byPickupThenReceived } from './types';

/**
 * The staff board: the whole queue visible as tabs, one order worked on at a
 * time underneath.
 *
 * The rule that shapes this component: **a new order must never move the worker
 * off the order in their hands.** Arrivals re-sort the tab strip and chime, but
 * `activeId` only changes from a tap, or when the active order leaves the board.
 * Which ingredients are already in the bowl is kept per order and survives
 * switching tabs and a refresh, so glancing at the next ticket costs nothing.
 *
 * `authEnabled` comes from the server guard (page.tsx) — the board can't read
 * the server-only KITCHEN_PASSWORD, so it's told whether a session is in play,
 * which gates the logout button and the 401 bounce-back.
 */

/* ── Kitchen alert chime ──
   More assertive than the customer-facing chimes: a rising three-note figure,
   repeated by the caller until acknowledged. It has to carry over extractor
   fans and conversation. */
function playKitchenChime(ctx: AudioContext) {
    const notes = [784, 988, 1319]; // G5, B5, E6
    notes.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.16;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 0.36);
    });
}

/**
 * Which bowl to reach for. `size` on an order is the BASE PRICE the customer
 * paid (54 / 59 / 72 / 42), not a size — printing it raw showed the cook "59",
 * which means nothing. Mapped back through the helpers the reorder flow uses.
 */
function sizeLabel(size: string | null): string | null {
    if (size === null || size === '') return null;
    if (detectOrderType(size) === 'tortilla') return 'טורטייה';
    const ml = sizeMlFromBase(size);
    const cfg = ml ? (SIZE_CONFIG as Record<string, { label: string }>)[String(ml)] : null;
    return cfg?.label ?? null;
}

const CHECK_KEY = 'bb-kitchen-checks';

function loadMap<T>(key: string): Record<string, T> {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

export default function KitchenBoard({ authEnabled }: { authEnabled: boolean }) {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const isDemo = !isSupabaseConfigured();

    // A board that can't reach the server must never look like a quiet board:
    // during a rush the kitchen would sit idle while orders piled up.
    const [loadError, setLoadError] = useState(false);
    const [lastOk, setLastOk] = useState<Date | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [undo, setUndo] = useState<{ id: string; orderNum: string } | null>(null);

    // The order in the worker's hands. Never reassigned by incoming data.
    const [activeId, setActiveId] = useState<string | null>(null);
    // Which ingredients are already in the bowl, restored on first render so a
    // refresh mid-shift loses nothing.
    const [checks, setChecks] = useState<Record<string, string[]>>(() => loadMap<string[]>(CHECK_KEY));

    const ordersRef = useRef<Order[]>([]);
    useEffect(() => { ordersRef.current = orders; }, [orders]);
    // Read inside loadOrders without making it a dependency (which would restart
    // the poll on every tab tap).
    const activeIdRef = useRef<string | null>(null);
    useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

    // ── Rehearsal ──
    // Drips fake orders in one at a time so the chime, a tab appearing, the
    // accept screen and the focus rule can all be exercised for real. Hidden
    // unless the page is opened with ?sim=1: a button that injects six orders
    // must not be one stray tap away during service.
    const simOn = useSearchParams().get('sim') === '1';
    const [simLeft, setSimLeft] = useState(0);
    const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (simTimer.current) clearTimeout(simTimer.current); }, []);

    // ── New-order alert ──
    const [newIds, setNewIds] = useState<string[]>([]);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const seededRef = useRef(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const onUnauthorized = useCallback(() => { if (authEnabled) router.refresh(); }, [authEnabled, router]);
    const logout = useCallback(async () => {
        await fetch('/api/kitchen/logout', { method: 'POST' }).catch(() => {});
        router.refresh();
    }, [router]);

    const persist = useCallback((key: string, value: unknown) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
    }, []);

    // Browsers only allow audio after a gesture; latch onto the first one.
    const ensureAudio = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (Ctor) audioCtxRef.current = new Ctor();
            }
            const ctx = audioCtxRef.current;
            if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
            if (ctx?.state === 'running') setAudioBlocked(false);
            return ctx;
        } catch { return null; }
    }, []);

    useEffect(() => {
        const onFirstTouch = () => { ensureAudio(); };
        window.addEventListener('pointerdown', onFirstTouch);
        return () => window.removeEventListener('pointerdown', onFirstTouch);
    }, [ensureAudio]);

    const acknowledge = useCallback(() => { setNewIds([]); ensureAudio(); }, [ensureAudio]);

    // Repeat until acknowledged — one chime is easy to miss in a rush. The alert
    // is audio only: a work surface should not strobe at someone holding a knife.
    useEffect(() => {
        if (newIds.length === 0) return;
        const ring = () => {
            const ctx = ensureAudio();
            if (!ctx || ctx.state !== 'running') { setAudioBlocked(true); return; }
            playKitchenChime(ctx);
            navigator.vibrate?.([120, 60, 120]);
        };
        ring();
        const id = setInterval(ring, 10000);
        return () => clearInterval(id);
    }, [newIds, ensureAudio]);

    // ── Keep the screen awake ──
    // A wall tablet that dims and locks is unusable: staff would be unlocking
    // Android before they could even read the board.
    useEffect(() => {
        type Sentinel = { release: () => Promise<void> };
        let sentinel: Sentinel | null = null;
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
        const acquire = async () => {
            try { if (nav.wakeLock && document.visibilityState === 'visible') sentinel = await nav.wakeLock.request('screen'); }
            catch { /* denied or unsupported — the device timeout applies */ }
        };
        acquire();
        const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            sentinel?.release().catch(() => {});
        };
    }, []);

    // Re-evaluate urgency every minute.
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/kitchen/orders');
            if (res.status === 401) { onUnauthorized(); return; }
            if (!res.ok) { setLoadError(true); return; }
            const list = (await res.json() as Order[]).sort(byPickupThenReceived);
            setOrders(list);
            setLoadError(false);
            setLastOk(new Date());

            // Pick an order only when nothing is selected, or when the selected
            // one has left the board. A new arrival must never pull the worker
            // off what is in their hands.
            const current = activeIdRef.current;
            if (!current || !list.some(o => o.id === current)) {
                setActiveId(list.length ? list[0].id : null);
            }

            // Anything not seen before is an arrival. The first load seeds the
            // set silently — opening the board mid-service must not alarm.
            const ids = list.map(o => o.id);
            if (!seededRef.current) {
                knownIdsRef.current = new Set(ids);
                seededRef.current = true;
            } else {
                const arrivals = ids.filter(i => !knownIdsRef.current.has(i));
                if (arrivals.length > 0) setNewIds(prev => [...new Set([...prev, ...arrivals])]);
                knownIdsRef.current = new Set(ids);
            }
        } catch {
            // A dropped connection used to throw out of here, silently freezing
            // the board (and sticking the first load on "loading" forever).
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [onUnauthorized]);

    useEffect(() => { loadOrders(); }, [loadOrders]);
    useEffect(() => {
        const id = setInterval(loadOrders, 4000);
        return () => clearInterval(id);
    }, [loadOrders]);

    const toggleItem = useCallback((orderId: string, itemId: string) => {
        setChecks(prev => {
            const cur = prev[orderId] ?? [];
            const next = { ...prev, [orderId]: cur.includes(itemId) ? cur.filter(i => i !== itemId) : [...cur, itemId] };
            persist(CHECK_KEY, next);
            return next;
        });
        navigator.vibrate?.(10);
    }, [persist]);

    const updateStatus = useCallback(async (id: string, status: OrderStatus) => {
        // Touching an order acknowledges the alert — no extra tap to silence it.
        setNewIds(prev => prev.filter(n => n !== id));
        const previous = ordersRef.current.find(o => o.id === id)?.status;

        // Collected orders leave the board entirely, so a fat-finger during a
        // rush was unrecoverable without database access.
        if (status === 'collected') {
            const num = ordersRef.current.find(o => o.id === id)?.order_num ?? '';
            setUndo({ id, orderNum: num });
            setTimeout(() => setUndo(u => (u?.id === id ? null : u)), 20000);
            const rest = ordersRef.current.filter(o => o.id !== id);
            setActiveId(rest.length ? rest[0].id : null);
        }

        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); // optimistic
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.status === 401) { onUnauthorized(); return; }
            if (!res.ok) throw new Error('status write failed');
            setActionError(null);
        } catch {
            // Leaving the optimistic value up meant the board could show "מוכן"
            // while the customer's order was never actually marked ready.
            if (previous) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: previous } : o));
            setActionError('עדכון הסטטוס נכשל — נסו שוב');
            setTimeout(() => setActionError(null), 5000);
        }
    }, [onUnauthorized]);

    // One order every 10s, so each arrival lands like a real one.
    const runSimulation = useCallback((count: number) => {
        if (simLeft > 0) return;
        setSimLeft(count);
        let left = count;
        const step = async () => {
            await fetch('/api/kitchen/simulate', { method: 'POST' }).catch(() => {});
            loadOrders();
            left -= 1;
            setSimLeft(left);
            if (left > 0) simTimer.current = setTimeout(step, 10000);
        };
        step();
    }, [simLeft, loadOrders]);

    const clearSimulation = useCallback(async () => {
        if (simTimer.current) clearTimeout(simTimer.current);
        setSimLeft(0);
        await fetch('/api/kitchen/simulate', { method: 'DELETE' }).catch(() => {});
        setNewIds([]);
        loadOrders();
    }, [loadOrders]);

    const active = orders.find(o => o.id === activeId) ?? null;

    return (
        <div style={K.root}>
            <style>{`
                /* Built for a wall tablet in landscape; stacks if it ever isn't. */
                @media (max-width: 760px) {
                    .kitchen-active-body { flex-direction: column !important; }
                    .kitchen-active-body > * { flex: none !important; }
                }
            `}</style>

            {/* Header */}
            <div style={K.header}>
                <div style={K.headerTitle}>🥗 מטבח BariBali</div>
                <div style={K.headerMeta}>
                    {isDemo && <span style={K.demoBadge}>DEMO</span>}
                    <span style={K.clock}>{now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={K.activeCount}>{orders.length} הזמנות</span>
                    <button
                        type="button"
                        style={K.headerBtn}
                        onClick={() => {
                            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                            else document.documentElement.requestFullscreen?.().catch(() => {});
                        }}
                    >⛶ מסך מלא</button>
                    {simOn && (
                        <>
                            <button
                                type="button"
                                style={{ ...K.headerBtn, ...K.simBtn, opacity: simLeft > 0 ? 0.6 : 1 }}
                                onClick={() => runSimulation(6)}
                                disabled={simLeft > 0}
                            >
                                {simLeft > 0 ? `🧪 שולח… נותרו ${simLeft}` : '🧪 סימולציה · 6 הזמנות'}
                            </button>
                            <button type="button" style={{ ...K.headerBtn, ...K.simBtn }} onClick={clearSimulation}>
                                🧹 נקה סימולציה
                            </button>
                        </>
                    )}
                    {authEnabled && <button type="button" style={K.headerBtn} onClick={logout}>🔒 יציאה</button>}
                </div>
            </div>

            {/* Alerts */}
            {undo && (
                <div style={K.undoBar} role="status">
                    <span>הזמנה {undo.orderNum} סומנה כנמסרה</span>
                    <button type="button" style={K.undoBtn}
                        onClick={() => { const u = undo; setUndo(null); updateStatus(u.id, 'ready'); }}>
                        ↩ החזר ללוח
                    </button>
                </div>
            )}
            {newIds.length > 0 && (
                <button type="button" onClick={acknowledge} style={K.newBanner} aria-live="assertive">
                    <span style={{ fontSize: '24px' }}>🔔</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>
                        {newIds.length === 1 ? 'הזמנה חדשה' : `${newIds.length} הזמנות חדשות`}
                    </span>
                    <span style={K.newBannerCta}>הבנתי</span>
                </button>
            )}
            {audioBlocked && newIds.length > 0 && (
                <button type="button" onClick={acknowledge} style={K.audioHint}>
                    🔇 הצליל חסום — לחצו כאן פעם אחת כדי לאפשר התראות קוליות
                </button>
            )}
            {loadError && (
                <div style={K.errorBanner} role="alert">
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 900 }}>אין חיבור לשרת — ייתכן שיש הזמנות שאינן מוצגות</div>
                        <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
                            {lastOk
                                ? `עודכן לאחרונה ${lastOk.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} · מנסה שוב כל 4 שניות`
                                : 'מנסה שוב כל 4 שניות'}
                        </div>
                    </div>
                </div>
            )}
            {actionError && (
                <div style={K.errorBanner} role="alert">
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div style={{ fontWeight: 900 }}>{actionError}</div>
                </div>
            )}

            {loading && <div style={K.loadingMsg}>טוען הזמנות...</div>}
            {!loading && !loadError && orders.length === 0 && (
                <div style={K.emptyMsg}>אין הזמנות פעילות כרגע ✓</div>
            )}

            {orders.length > 0 && (
                <>
                    <OrderTabs orders={orders} activeId={activeId} onSelect={setActiveId} newIds={newIds} />
                    {active && (
                        <ActiveOrder
                            key={active.id}
                            order={active}
                            sizeLabel={sizeLabel(active.size)}
                            onStatus={s => updateStatus(active.id, s)}
                            checked={checks[active.id] ?? []}
                            onToggleItem={itemId => toggleItem(active.id, itemId)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

const K: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100vh', background: '#0a0a0a',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
        color: '#fff', display: 'flex', flexDirection: 'column',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '12px 20px', paddingTop: 'max(12px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap',
    },
    headerTitle: { fontSize: '20px', fontWeight: 900, color: 'var(--color-gold-light)' },
    headerMeta: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
    clock: { fontSize: '22px', fontWeight: 800, letterSpacing: '0.04em' },
    activeCount: { fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.55)' },
    demoBadge: {
        fontSize: '11px', fontWeight: 900, padding: '4px 10px', borderRadius: '8px',
        background: 'rgba(255,152,0,0.2)', border: '1px solid rgba(255,152,0,0.5)', color: '#ffcc80',
    },
    headerBtn: {
        padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', fontSize: '14px', fontWeight: 800,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    simBtn: {
        background: 'rgba(156,39,176,0.18)', border: '1px solid rgba(186,104,200,0.55)', color: '#e1bee7',
    },
    loadingMsg: { padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '16px' },
    emptyMsg: { padding: '80px', textAlign: 'center', color: 'var(--color-green-accent)', fontSize: '18px', fontWeight: 700 },
    errorBanner: {
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '10px 16px', padding: '14px 16px', borderRadius: '12px',
        background: 'rgba(229,57,53,0.14)', border: '1px solid rgba(229,57,53,0.5)',
        color: '#ff9a97', fontSize: '15px', lineHeight: 1.4,
    },
    newBanner: {
        display: 'flex', alignItems: 'center', gap: '14px', width: 'calc(100% - 32px)',
        margin: '10px 16px', padding: '14px 18px', borderRadius: '12px',
        background: 'rgba(76,175,80,0.18)', border: '2px solid rgba(76,175,80,0.65)',
        cursor: 'pointer', color: '#c8f7c9', fontSize: '20px', fontWeight: 900,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
    newBannerCta: {
        flexShrink: 0, padding: '8px 18px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)',
        fontSize: '15px', fontWeight: 800, color: '#fff',
    },
    audioHint: {
        display: 'block', width: 'calc(100% - 32px)', margin: '0 16px 10px',
        padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
        background: 'rgba(255,152,0,0.14)', border: '1px solid rgba(255,152,0,0.5)',
        color: '#ffcc80', fontSize: '15px', fontWeight: 700,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textAlign: 'center',
    },
    undoBar: {
        display: 'flex', alignItems: 'center', gap: '14px',
        margin: '10px 16px', padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: 700,
    },
    undoBtn: {
        marginInlineStart: 'auto', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff', fontSize: '15px', fontWeight: 800,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
};

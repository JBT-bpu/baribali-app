'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { orderSizeLabel } from '@/lib/reorder';
import OrderTabs from './OrderTabs';
import ActiveOrder from './ActiveOrder';
import { type Order, type OrderStatus, byPickupThenReceived } from './types';
import { type ShopStatus } from '@/lib/shopHours';

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

const CHECK_KEY = 'bb-kitchen-checks';

/**
 * The board's ground: the owner's 16:9 brand plate, darkened. Sharp, not
 * blurred — and it turns out that costs nothing.
 *
 * The blur was there to stop the artwork competing with text. Measuring it,
 * darkening does that job on its own: the unblurred plate at 30% brightness
 * varies LESS behind the working area than the blurred one did at 40%
 * (spread 9.2 against 9.9). The blur was buying softness that the exposure had
 * already paid for.
 *
 * Three treatments in public/kitchen-assets, because how much brand belongs on
 * a work surface is a judgement rather than a fact. Behind the working area,
 * after the scrim, on a 0-255 scale:
 *
 *     bg-a  22% bright   mean 13.0   spread  6.9   quietest
 *     bg    30% bright   mean 13.7   spread  9.2   default
 *     bg-b  42% bright   mean 14.8   spread 12.7   boldest
 *
 * All three sit near mean 14, so white text is comfortable on any of them —
 * what differs is how much the ground pulls at the eye, which is an attention
 * question, not a legibility one. ?bg=a / ?bg=b switch live.
 */
const KITCHEN_BG = '/kitchen-assets/bg.webp';

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
    /**
     * The last reversible action. `to` is the status the undo restores.
     *
     * It used to cover only `collected`, which is the action with the SMALLEST
     * consequence — the order leaves the board and nobody outside the kitchen
     * notices. "מוכן לאיסוף" had no undo at all, and that is the one the
     * customer sees: it flips their order-status page to "ready" and tells them
     * to come. A mis-tap during a rush sent someone to the counter for food that
     * was still being made, and there was no way back to `preparing` from the
     * board at all.
     */
    const [undo, setUndo] = useState<{ id: string; orderNum: string; to: OrderStatus; label: string } | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

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
    const params = useSearchParams();
    const simOn = params.get('sim') === '1';
    // ?bg=a (quietest) / ?bg=b (boldest) for judging against real tickets.
    const bgVariant = params.get('bg');
    const bgUrl = bgVariant === 'a' || bgVariant === 'b' ? `/kitchen-assets/bg-${bgVariant}.webp` : KITCHEN_BG;
    const [simLeft, setSimLeft] = useState(0);
    const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (simTimer.current) clearTimeout(simTimer.current); }, []);

    // ── New-order alert ──
    const [newIds, setNewIds] = useState<string[]>([]);
    const [audioBlocked, setAudioBlocked] = useState(false);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const seededRef = useRef(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // ── Shop open/closed ──
    // Staff-operated because staff are the ones who know. The schedule
    // (9:00–16:00) runs by itself; this is for the day it does not apply.
    const [shop, setShop] = useState<ShopStatus | null>(null);
    const [shopBusy, setShopBusy] = useState(false);

    const loadShop = useCallback(async () => {
        try {
            const res = await fetch('/api/shop');
            if (res.ok) setShop(await res.json());
        } catch { /* the board's own error banner covers connectivity */ }
    }, []);

    const setOverride = useCallback(async (override: 'open' | 'closed' | null) => {
        setShopBusy(true);
        try {
            const res = await fetch('/api/shop', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ override }),
            });
            if (res.ok) { setShop(await res.json()); setActionError(null); }
            else {
                // Never let a failed close look like a successful one — someone
                // who taps "closed" and sees nothing will walk away believing it.
                const data = await res.json().catch(() => null);
                setActionError(data?.error ?? 'לא הצלחנו לעדכן את מצב החנות');
                setTimeout(() => setActionError(null), 8000);
            }
        } catch {
            setActionError('לא הצלחנו לעדכן את מצב החנות');
            setTimeout(() => setActionError(null), 8000);
        } finally {
            setShopBusy(false);
        }
    }, []);

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
            // Ridden along with the order poll rather than given its own effect
            // and interval. Two reasons: the board then notices a shop closed
            // from ANOTHER device (the owner's phone) within one poll, and it
            // avoids a second synchronous setState-in-effect, which the repo's
            // lint baseline does not have room for.
            loadShop();
        } catch {
            // A dropped connection used to throw out of here, silently freezing
            // the board (and sticking the first load on "loading" forever).
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [onUnauthorized, loadShop]);

    useEffect(() => { loadOrders(); }, [loadOrders]);
    // 4s while the board is on screen, 20s when it is not, and an immediate
    // fetch the moment it comes back. The wall tablet is always visible so this
    // changes nothing there; it matters when the board is open on someone's
    // phone in a pocket, which was ~10,800 requests a shift. Browsers already
    // throttle background timers, so the old fixed 4s was not really 4s anyway —
    // this just makes the behaviour something we chose.
    useEffect(() => {
        let id: ReturnType<typeof setInterval>;
        const start = () => {
            clearInterval(id);
            id = setInterval(loadOrders, document.visibilityState === 'visible' ? 4000 : 20000);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') loadOrders();
            start();
        };
        start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
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

        // Both of the one-way actions get an undo, restoring the status they
        // came from. 30s rather than 20: noticing "that was the wrong ticket"
        // takes longer than noticing a mis-tap, and the bar costs one row.
        const num = ordersRef.current.find(o => o.id === id)?.order_num ?? '';
        if (status === 'collected' || status === 'ready') {
            if (undoTimer.current) clearTimeout(undoTimer.current);
            setUndo({
                id,
                orderNum: num,
                to: status === 'collected' ? 'ready' : (previous ?? 'preparing'),
                label: status === 'collected' ? 'סומנה כנמסרה' : 'סומנה כמוכנה — הלקוח קיבל הודעה',
            });
            undoTimer.current = setTimeout(() => setUndo(u => (u?.id === id ? null : u)), 30000);
        }

        // Collected orders leave the board entirely, so the worker needs
        // somewhere to land.
        if (status === 'collected') {
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
        <div style={{ ...K.root, backgroundImage: (K.root.backgroundImage as string).replace(KITCHEN_BG, bgUrl) }}>
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
                    {/* One control, two states, and it always says what IS —
                        never what tapping it would do. A button labelled
                        "close" that means "you are closed" is how someone
                        closes a shop they meant to open. */}
                    {shop && (
                        <button
                            type="button"
                            onClick={() => setOverride(shop.open ? 'closed' : null)}
                            disabled={shopBusy}
                            style={{ ...K.headerBtn, ...(shop.open ? K.shopOpen : K.shopShut), opacity: shopBusy ? 0.5 : 1 }}
                            title={shop.opensAt ? `שעות היום ${shop.opensAt}–${shop.closesAt}` : 'סגור היום'}
                        >
                            {shop.open
                                ? (shop.reason === 'override_open' ? '🟢 פתוח (ידני) · סגור' : '🟢 פתוח · סגור עכשיו')
                                : (shop.reason === 'override_closed' ? '🔴 סגור ידנית · פתח' : '🔴 סגור · פתח ידנית')}
                        </button>
                    )}
                    {authEnabled && <button type="button" style={K.headerBtn} onClick={logout}>🔒 יציאה</button>}
                </div>
            </div>

            {/* Closed is a state the whole board should show, not a small pill:
                a worker glancing over must not have to read a button to know
                that nothing new is coming in. */}
            {shop && !shop.open && (
                <div style={K.closedBar} role="status">
                    <span style={{ fontSize: '20px' }}>🔴</span>
                    <div>
                        <div style={{ fontWeight: 900 }}>
                            {shop.reason === 'override_closed' ? 'החנות סגורה להזמנות (ידנית)' : 'החנות סגורה להזמנות'}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
                            {shop.reason === 'closed_day' ? 'היום לא פעיל'
                                : shop.opensAt ? `שעות הפעילות ${shop.opensAt}–${shop.closesAt}` : ''}
                            {' · הזמנות קיימות ממשיכות כרגיל'}
                        </div>
                    </div>
                    {shop.reason === 'override_closed' && (
                        <button type="button" style={{ ...K.undoBtn, marginInlineStart: 'auto' }}
                            disabled={shopBusy} onClick={() => setOverride(null)}>
                            פתח מחדש
                        </button>
                    )}
                </div>
            )}

            {/* Alerts */}
            {undo && (
                <div style={K.undoBar} role="status">
                    <span>הזמנה {undo.orderNum} {undo.label}</span>
                    <button type="button" style={K.undoBtn}
                        onClick={() => {
                            const u = undo;
                            setUndo(null);
                            if (undoTimer.current) clearTimeout(undoTimer.current);
                            setActiveId(u.id);      // put it back in the worker's hands
                            updateStatus(u.id, u.to);
                        }}>
                        ↩ בטל
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
                            sizeLabel={orderSizeLabel(active.size)}
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
        // `height`, not `min-height`, and dvh rather than vh. As a min-height
        // the board had no definite height, so ActiveOrder's `flex: 1` columns
        // grew with the order instead of scrolling inside it — a long order
        // pushed the מוכן button off the bottom of the tablet, unreachable.
        // A definite height makes the inner `overflow-y: auto` actually work.
        height: '100dvh',
        // ── The BariBali ground ──
        // The owner's 16:9 brand plate, which happens to match the wall
        // tablet's aspect exactly. It is a photographic image with a bright
        // gold logo dead centre — i.e. directly behind the order header and the
        // ingredient chips — so it is blurred and darkened hard before it gets
        // anywhere near this screen. What survives is the shape of the brand,
        // not detail that competes with text someone is reading under time
        // pressure. The panels above it stay opaque for the same reason.
        backgroundColor: '#050f06',
        // Layer order is top-first: gold pool, near-uniform scrim, then the
        // plate. The scrim is uniform on purpose — a gradient that reached full
        // opacity at the bottom made the image fade out down the screen, which
        // reads as a smudge rather than as a ground.
        backgroundImage: [
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(200,168,78,0.08) 0%, transparent 70%)',
            'linear-gradient(180deg, rgba(6,18,7,0.80) 0%, rgba(4,12,5,0.86) 100%)',
            `url(${KITCHEN_BG})`,
        ].join(', '),
        backgroundSize: 'cover, cover, cover',
        backgroundPosition: 'center, center, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl',
        color: '#fff', display: 'flex', flexDirection: 'column',
    },
    // flexShrink: 0 on every fixed row below — the board column now has a
    // definite height, so without it the header and banners would be squeezed
    // to make room for the active order instead of the order scrolling.
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', flexShrink: 0,
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
    shopOpen: { background: 'rgba(76,175,80,0.16)', border: '1px solid rgba(76,175,80,0.55)', color: '#c8f7c9' },
    shopShut: { background: 'rgba(229,57,53,0.18)', border: '1px solid rgba(229,57,53,0.6)', color: '#ff9a97' },
    closedBar: {
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '10px 16px', padding: '14px 16px', borderRadius: '12px',
        background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.45)',
        color: '#ffb3b0', fontSize: '15px', lineHeight: 1.4, flexShrink: 0,
    },
    loadingMsg: { padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '16px' },
    emptyMsg: { padding: '80px', textAlign: 'center', color: 'var(--color-green-accent)', fontSize: '18px', fontWeight: 700 },
    errorBanner: {
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '10px 16px', padding: '14px 16px', borderRadius: '12px',
        background: 'rgba(229,57,53,0.14)', border: '1px solid rgba(229,57,53,0.5)',
        color: '#ff9a97', fontSize: '15px', lineHeight: 1.4, flexShrink: 0,
    },
    newBanner: {
        display: 'flex', alignItems: 'center', gap: '14px', width: 'calc(100% - 32px)',
        margin: '10px 16px', padding: '14px 18px', borderRadius: '12px',
        background: 'rgba(76,175,80,0.18)', border: '2px solid rgba(76,175,80,0.65)',
        cursor: 'pointer', color: '#c8f7c9', fontSize: '20px', fontWeight: 900,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", flexShrink: 0,
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
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif", textAlign: 'center', flexShrink: 0,
    },
    undoBar: {
        display: 'flex', alignItems: 'center', gap: '14px',
        margin: '10px 16px', padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: 700, flexShrink: 0,
    },
    undoBtn: {
        marginInlineStart: 'auto', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff', fontSize: '15px', fontWeight: 800,
        fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
    },
};

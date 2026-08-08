'use client';

import { useCallback, useEffect, useState } from 'react';
import { shopStatus, type ShopStatus } from './shopHours';

/**
 * Is the shop open — as the customer's browser understands it.
 *
 * The schedule (WEEK) is in the bundle, so the client can answer most of the
 * question on its own. What it cannot know is the live override: staff closing
 * early because the chicken ran out. That lives in a database row and arrives
 * from GET /api/shop.
 *
 * DEGRADES TO THE SCHEDULE, exactly as the server side does (lib/shopState.ts).
 * If the fetch fails we keep the locally-computed answer rather than guessing
 * closed — a customer must never be turned away from an open shop by a dropped
 * request. The reverse risk is covered: the server checks again at POST
 * /api/orders, so the worst a stale "open" can do is produce an honest refusal
 * at checkout instead of a warning on the landing.
 *
 * Refetches when the tab comes back to the foreground. A phone left open on the
 * landing page across 16:00 would otherwise still be advertising an open shop.
 */

export interface LiveShopStatus extends ShopStatus {
    /** True until the first answer arrives. Don't announce "closed" before it. */
    loading: boolean;
    /** False when /api/shop could not be reached and the schedule is standing in. */
    live: boolean;
}

export function useShopStatus(): LiveShopStatus {
    // Lazy so the schedule is read once, not on every render. The initial value
    // is the honest local answer; the fetch only ever refines it.
    const [state, setState] = useState<LiveShopStatus>(() => ({
        ...shopStatus(new Date()),
        loading: true,
        live: false,
    }));

    const load = useCallback(() => {
        let cancelled = false;
        fetch('/api/shop', { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : null))
            .then((data: (ShopStatus & { storeAvailable?: boolean }) | null) => {
                if (cancelled) return;
                if (data && typeof data.open === 'boolean') {
                    setState({ ...data, loading: false, live: true });
                } else {
                    setState(s => ({ ...s, loading: false }));
                }
            })
            .catch(() => {
                if (!cancelled) setState(s => ({ ...s, loading: false }));
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancel = load();
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            cancel();
            cancel = load();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancel();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [load]);

    return state;
}

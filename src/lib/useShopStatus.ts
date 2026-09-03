'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    SHOP_STATE_UNAVAILABLE_ERROR_CODE,
    shopStatus,
    type ShopOverride,
    type ShopStatus,
} from './shopHours';
import { SUPABASE_CONFIGURATION_ERROR_CODE } from './supabaseConfig';

/**
 * Is the shop open — as the customer's browser understands it.
 *
 * The schedule (WEEK) is in the bundle, so the client can answer most of the
 * question on its own. What it cannot know is the live override: staff closing
 * early because the chicken ran out. That lives in a database row and arrives
 * from GET /api/shop.
 *
 * Before the first server answer it degrades to the bundled schedule, exactly
 * as the server side does (lib/shopState.ts). Once a staff override has been
 * confirmed, transient refresh failures retain it; otherwise a dropped request
 * could erase "closed now" or "open late" until connectivity returns. The
 * server still checks again at POST /api/orders and remains authoritative.
 *
 * Refetches once a minute while visible and whenever the tab returns to the
 * foreground or is restored from bfcache. A phone left open across 16:00 would
 * otherwise keep advertising an open shop and already-expired pickup times.
 */

export interface LiveShopStatus extends ShopStatus {
    /** True until the first answer arrives. Don't announce "closed" before it. */
    loading: boolean;
    /** False when /api/shop could not be reached and the schedule is standing in. */
    live: boolean;
    /** Refresh clock shared with time-sensitive customer UI such as pickup slots. */
    refreshedAt: number;
    /** Last server-confirmed staff override, retained across transient failures. */
    override: ShopOverride;
}

export function useShopStatus(): LiveShopStatus {
    // Lazy so the schedule is read once, not on every render. The initial value
    // is the honest local answer; the fetch only ever refines it.
    const [state, setState] = useState<LiveShopStatus>(() => ({
        ...shopStatus(new Date()),
        loading: true,
        live: false,
        refreshedAt: 0,
        override: null,
    }));
    const lastKnownOverrideRef = useRef<{ override: ShopOverride; note: string | null } | null>(null);

    const load = useCallback(() => {
        const controller = new AbortController();
        const requestTimeout = setTimeout(() => controller.abort(), 10_000);
        let cancelled = false;
        const publishFallback = () => {
            if (cancelled) return;
            const known = lastKnownOverrideRef.current;
            setState({
                ...shopStatus(new Date(), known?.override ?? null, known?.note ?? null),
                loading: false,
                live: false,
                refreshedAt: Date.now(),
                override: known?.override ?? null,
            });
        };

        fetch('/api/shop', { cache: 'no-store', signal: controller.signal })
            .then(async response => {
                const data = await response.json().catch(() => null);
                if (response.ok) return { kind: 'status' as const, data };
                if (
                    response.status === 503
                    && (
                        data?.code === SUPABASE_CONFIGURATION_ERROR_CODE
                        || data?.code === SHOP_STATE_UNAVAILABLE_ERROR_CODE
                    )
                ) return { kind: 'configuration-error' as const, data: null };
                return { kind: 'fallback' as const, data: null };
            })
            .then(result => {
                if (cancelled) return;
                if (result.kind === 'configuration-error') {
                    const note = 'ההזמנות אינן זמינות כרגע';
                    lastKnownOverrideRef.current = { override: 'closed', note };
                    const unavailable = shopStatus(
                        new Date(),
                        'closed',
                        note,
                    );
                    setState({
                        ...unavailable,
                        override: 'closed',
                        loading: false,
                        live: true,
                        refreshedAt: Date.now(),
                    });
                    return;
                }
                const data = result.kind === 'status'
                    ? result.data as (ShopStatus & {
                        override?: ShopOverride;
                        storeAvailable?: boolean;
                    }) | null
                    : null;
                if (data && typeof data.open === 'boolean') {
                    const override = data.override === 'open' || data.override === 'closed'
                        ? data.override
                        : null;
                    lastKnownOverrideRef.current = { override, note: data.note ?? null };
                    setState({ ...data, override, loading: false, live: true, refreshedAt: Date.now() });
                } else {
                    publishFallback();
                }
            })
            .catch(() => {
                publishFallback();
            })
            .finally(() => clearTimeout(requestTimeout));

        return () => {
            cancelled = true;
            clearTimeout(requestTimeout);
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let cancelCurrent: () => void = () => {};
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const stopInterval = () => {
            if (intervalId === null) return;
            clearInterval(intervalId);
            intervalId = null;
        };
        const cancelRequest = () => {
            cancelCurrent();
            cancelCurrent = () => {};
        };
        const refresh = () => {
            cancelRequest();
            cancelCurrent = load();
        };
        const refreshForCurrentTime = () => {
            // Move time-sensitive UI immediately on foreground/minute ticks;
            // do not wait up to ten seconds for the network timeout first.
            setState(current => ({ ...current, refreshedAt: Date.now() }));
            refresh();
        };
        const startInterval = () => {
            stopInterval();
            if (document.visibilityState === 'visible') {
                intervalId = setInterval(refreshForCurrentTime, 60_000);
            }
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshForCurrentTime();
                startInterval();
            } else {
                stopInterval();
                cancelRequest();
            }
        };
        const onPageShow = (event: PageTransitionEvent) => {
            if (!event.persisted) return;
            refreshForCurrentTime();
            startInterval();
        };

        refresh();
        startInterval();
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            stopInterval();
            cancelRequest();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, [load]);

    return state;
}

const OVERLAY_HISTORY_PREFIX = 'bbHistoryOverlay:';

type HistoryRecord = Record<string, unknown>;

function historyRecord(state: unknown): HistoryRecord {
    return typeof state === 'object' && state !== null
        ? state as HistoryRecord
        : {};
}

function markerKey(id: string): string {
    return `${OVERLAY_HISTORY_PREFIX}${id}`;
}

export function withOverlayHistoryMarker(state: unknown, id: string): HistoryRecord {
    return { ...historyRecord(state), [markerKey(id)]: true };
}

export function ownsOverlayHistoryMarker(state: unknown, id: string): boolean {
    return historyRecord(state)[markerKey(id)] === true;
}

export function withoutOverlayHistoryMarker(state: unknown, id: string): HistoryRecord {
    const current = historyRecord(state);
    const key = markerKey(id);
    if (current[key] !== true) return current;

    const next = { ...current };
    delete next[key];
    return next;
}

export interface OverlayHistoryPort {
    currentState: () => unknown;
    currentUrl: () => string;
    pushState: (state: HistoryRecord, url: string) => void;
    replaceState: (state: HistoryRecord, url: string) => void;
    back: () => void;
    listenPopState: (listener: (state: unknown) => void) => () => void;
    listenPageHide: (listener: () => void) => () => void;
    listenPageShow: (listener: () => void) => () => void;
}

export interface OverlayHistoryController {
    open: () => void;
    close: () => void;
    sync: (open: boolean) => void;
    detach: () => void;
}

/**
 * Owns the temporary same-URL entry for one page-level overlay.
 *
 * The controller belongs to a parent that stays mounted while its sheet opens
 * and closes. That is the important boundary: detaching never navigates, so a
 * route change cannot race an effect cleanup and unexpectedly send the user
 * back. The UI is closed synchronously before an explicit history traversal;
 * the still-mounted listener can then clean an accidentally copied marker.
 */
export function createOverlayHistoryController(
    port: OverlayHistoryPort,
    id: string,
    onOpenChange: (open: boolean) => void,
): OverlayHistoryController {
    let isOpen = false;
    let openingUrl: string | null = null;
    let traversalPending = false;
    let reopenAfterTraversal = false;
    let detached = false;

    const clearOwnedCurrentMarker = (): boolean => {
        const state = port.currentState();
        if (!ownsOverlayHistoryMarker(state, id)) return false;
        port.replaceState(withoutOverlayHistoryMarker(state, id), port.currentUrl());
        return true;
    };

    const setOpen = (next: boolean) => {
        if (isOpen === next) return;
        isOpen = next;
        onOpenChange(next);
    };

    const beginOpen = () => {
        // A stale Forward/reload entry from an earlier instance is inert;
        // remove it before creating the one entry owned by this opening.
        clearOwnedCurrentMarker();
        openingUrl = port.currentUrl();
        port.pushState(
            withOverlayHistoryMarker(port.currentState(), id),
            openingUrl,
        );
        setOpen(true);
    };

    const handlePopState = (state: unknown) => {
        if (detached) return;
        const ownsEntry = ownsOverlayHistoryMarker(state, id);

        if (traversalPending) {
            traversalPending = false;
            if (ownsEntry) clearOwnedCurrentMarker();

            const shouldReopen = reopenAfterTraversal;
            reopenAfterTraversal = false;
            if (shouldReopen) {
                // The controlled UI deliberately stayed open while Back was
                // in flight. Give that same opening a fresh entry without a
                // false→true callback pair (which can erase payload state such
                // as the selected ingredient when React batches the updates).
                beginOpen();
            } else {
                setOpen(false);
            }
            return;
        }

        if (isOpen) {
            // Back through an entry belonging to an overlay above this one
            // keeps this sheet open. Reaching the pre-sheet entry closes it.
            if (!ownsEntry) setOpen(false);
            return;
        }

        // Forward, reload recovery or a copied marker must never resurrect an
        // already-closed sheet. Clean the inert marker without another hop.
        if (ownsEntry) clearOwnedCurrentMarker();
    };

    const handlePageHide = () => {
        if (!detached) clearOwnedCurrentMarker();
    };

    const handlePageShow = () => {
        if (!detached) handlePopState(port.currentState());
    };

    const stopPopState = port.listenPopState(handlePopState);
    const stopPageHide = port.listenPageHide(handlePageHide);
    const stopPageShow = port.listenPageShow(handlePageShow);

    const controller: OverlayHistoryController = {
        open() {
            if (detached) return;
            if (traversalPending) {
                reopenAfterTraversal = true;
                return;
            }
            if (!isOpen) beginOpen();
        },

        close() {
            if (detached || !isOpen || traversalPending) return;

            const canTraverse = port.currentUrl() === openingUrl;
            const ownedCurrentEntry = clearOwnedCurrentMarker();

            if (ownedCurrentEntry && canTraverse) {
                // Keep the controlled sheet mounted until the asynchronous
                // traversal lands. A rapid reopen is queued, so an old Back
                // can never close a newly opened sheet.
                traversalPending = true;
                port.back();
                return;
            }
            setOpen(false);
        },

        sync(nextOpen: boolean) {
            if (traversalPending) {
                if (nextOpen) reopenAfterTraversal = true;
                else reopenAfterTraversal = false;
                return;
            }
            if (detached || nextOpen === isOpen) return;
            if (nextOpen) {
                controller.open();
                return;
            }

            // Defensive path for an external state reset. It is safer to leave
            // a harmless duplicate entry than to navigate from a React effect.
            clearOwnedCurrentMarker();
            isOpen = false;
        },

        detach() {
            if (detached) return;
            stopPopState();
            stopPageHide();
            stopPageShow();
            // Route/unmount cleanup may edit only the current state; it must
            // never traverse history.
            clearOwnedCurrentMarker();
            traversalPending = false;
            reopenAfterTraversal = false;
            detached = true;
        },
    };

    // A marker can survive a reload or a prior controller instance. Closed UI
    // never restores implicitly, so clean it as soon as the stable parent mounts.
    clearOwnedCurrentMarker();
    return controller;
}

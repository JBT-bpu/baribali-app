const BUILDER_ORIGIN_SESSION_KEY = 'bb-builder-origin';
const BUILDER_ORIGIN_HISTORY_KEY = 'bbBuilderOrigin';
const HOME_ORIGIN = 'home2';
const ORIGIN_TTL_MS = 30_000;

/** Mark the next builder navigation as having started on the customer menu. */
export function markBuilderNavigationFromHome(now = Date.now()) {
    try {
        window.sessionStorage.setItem(BUILDER_ORIGIN_SESSION_KEY, String(now));
    } catch {
        // Private browsing/storage denial only loses the history enhancement.
    }
}

/**
 * Read without consuming: React Strict Mode may invoke state initializers twice.
 * The destination effect removes the one-shot marker after persisting it on the
 * builder history entry, which also makes reload and Forward navigation safe.
 */
export function readBuilderNavigationFromHome(now = Date.now()) {
    try {
        if (window.history.state?.[BUILDER_ORIGIN_HISTORY_KEY] === HOME_ORIGIN) {
            return true;
        }
        const markedAt = Number(window.sessionStorage.getItem(BUILDER_ORIGIN_SESSION_KEY));
        return Number.isFinite(markedAt)
            && markedAt > 0
            && Math.abs(now - markedAt) <= ORIGIN_TTL_MS;
    } catch {
        return false;
    }
}

/** Preserve the origin on this exact history entry and clear the one-shot hop. */
export function persistBuilderNavigationFromHome() {
    try {
        window.sessionStorage.removeItem(BUILDER_ORIGIN_SESSION_KEY);
        const currentState = typeof window.history.state === 'object' && window.history.state !== null
            ? window.history.state
            : {};
        window.history.replaceState(
            { ...currentState, [BUILDER_ORIGIN_HISTORY_KEY]: HOME_ORIGIN },
            '',
            window.location.href,
        );
    } catch {
        // The visible menu fallback still works through router.replace.
    }
}

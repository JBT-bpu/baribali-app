/** Shared between the board, the tab strip and the active-order workspace. */

export type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'collected';

export interface OrderItem {
    id: string;
    he: string;
    icon: string;
    price: number;
}

export interface Order {
    id: string;
    order_num: string;
    items: OrderItem[];
    total: number;
    pickup_time: string | null;
    notes: string | null;
    size: string | null;
    status: OrderStatus;
    payment_status?: string;
    /** Present only for signed-in customers; guests order without an account. */
    customer_name?: string | null;
    created_at: string;
}

/** Minutes until pickup — negative once the slot has passed. */
export function minutesUntilPickup(pickupTime: string | null): number | null {
    if (!pickupTime) return null;
    const [h, m] = pickupTime.split(':').map(Number);
    // `pickup_time` reaches the database straight from the request body with no
    // server-side validation, so it can be anything. A malformed value used to
    // produce an Invalid Date and NaN minutes, which rendered as "באיחור NaN דק׳".
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

    const pickup = new Date();
    pickup.setHours(h, m, 0, 0);
    let diff = Math.round((pickup.getTime() - Date.now()) / 60000);

    // Read the time as the NEAREST one, not as today's. Building it on today's
    // date meant that at 23:50 a 00:15 pickup came out as 1415 minutes LATE —
    // red border, "באיחור 1415 דק׳" — instead of 25 minutes away. Unreachable
    // while pickup slots stop at 21:00, but that cap is a constant in an
    // unrelated file and nothing connects the two.
    if (diff < -720) diff += 1440;
    else if (diff > 720) diff -= 1440;
    return diff;
}

export type Urgency = 'none' | 'soon' | 'urgent' | 'late';

/**
 * Deliberately a small marker, never a coloured card and never a flash: a work
 * surface shouldn't strobe at someone holding a knife.
 */
export function urgencyOf(pickupTime: string | null): { level: Urgency; lateBy: number } {
    const mins = minutesUntilPickup(pickupTime);
    if (mins === null) return { level: 'none', lateBy: 0 };
    if (mins < 0) return { level: 'late', lateBy: Math.abs(mins) };
    if (mins < 5) return { level: 'urgent', lateBy: 0 };
    if (mins < 10) return { level: 'soon', lateBy: 0 };
    return { level: 'none', lateBy: 0 };
}

export const URGENCY_COLOR: Record<Urgency, string | null> = {
    none: null,
    soon: '#ffd54f',
    urgent: '#ff9800',
    late: '#e53935',
};

/**
 * How settled the money is. Three tones, not two.
 *
 * `settled` and `verify` are BOTH "nothing to collect", but they are not the
 * same thing to the person handing over food, and they used to render
 * identically — same text, same green tick.
 *
 * `paid_unverified` is what a confirmed payment becomes when the Hyp webhook
 * cannot be signature-verified, which is every online payment today. The whole
 * design compensates by having staff confirm at the register — and that control
 * had no surface anywhere in the app, so nobody was being asked to perform it.
 * It matters more once payment is digital-only: at that point every order on the
 * board is unverified, and this pill is the only thing standing between the shop
 * and a disputed charge.
 */
export type PayTone = 'settled' | 'verify' | 'owed';

/** What the worker needs to know about money — never the price. */
export function paymentLabel(payment: string | undefined): { text: string; tone: PayTone; owed: boolean } | null {
    switch (payment) {
        case 'paid': return { text: 'שולם באפליקציה', tone: 'settled', owed: false };
        case 'paid_unverified': return { text: 'שולם — לאמת בקופה', tone: 'verify', owed: false };
        case 'pay_at_pickup': return { text: 'תשלום באיסוף', tone: 'owed', owed: true };
        case 'pending': return { text: 'ממתין לתשלום', tone: 'owed', owed: true };
        // Unreachable from the board today — /api/kitchen/orders filters
        // payment_status to the three above. Kept anyway: the webhook really
        // does write this value, and a branch that tells staff to collect money
        // is not worth deleting to satisfy a dead-code note.
        case 'failed': return { text: 'תשלום נכשל — לגבות באיסוף', tone: 'owed', owed: true };
        default: return null;
    }
}

/** Tabs run by pickup time; same slot falls back to who ordered first. */
export function byPickupThenReceived(a: Order, b: Order): number {
    const at = a.pickup_time ?? '99:99';
    const bt = b.pickup_time ?? '99:99';
    if (at !== bt) return at.localeCompare(bt);
    return a.created_at.localeCompare(b.created_at);
}

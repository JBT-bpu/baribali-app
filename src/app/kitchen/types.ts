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
    const pickup = new Date();
    pickup.setHours(h, m, 0, 0);
    return Math.round((pickup.getTime() - Date.now()) / 60000);
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

/** What the worker needs to know about money — never the price. */
export function paymentLabel(payment: string | undefined): { text: string; owed: boolean } | null {
    switch (payment) {
        case 'paid':
        case 'paid_unverified': return { text: 'שולם באפליקציה', owed: false };
        case 'pay_at_pickup': return { text: 'תשלום באיסוף', owed: true };
        case 'pending': return { text: 'ממתין לתשלום', owed: true };
        case 'failed': return { text: 'תשלום נכשל — לגבות באיסוף', owed: true };
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

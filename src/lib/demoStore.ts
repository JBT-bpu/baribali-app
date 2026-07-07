/**
 * In-memory stand-in for the `orders` table, used only when Supabase isn't
 * configured (see isSupabaseConfigured() in supabase.ts). Lets the full
 * order → payment-choice → status → kitchen loop be exercised locally
 * without any real backend.
 *
 * Deliberately local/single-process only: this is a module-level Map, which
 * works fine against `npm run dev` (one long-lived Node process) but will
 * NOT reliably persist across requests on Vercel's serverless functions
 * (separate invocations don't share memory). That's an accepted limitation,
 * not a bug — this store is a development convenience, not a persistence
 * architecture, and is designed to be deleted wholesale once real Supabase
 * is connected (every route's demo branch is a self-contained early return).
 */

export type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'collected';
export type PaymentStatus = 'pending' | 'paid' | 'paid_unverified' | 'failed' | 'pay_at_pickup';

export interface DemoOrderItem {
    id: string;
    he: string;
    icon: string;
    price: number;
}

export interface DemoOrder {
    id: string;
    order_num: string;
    items: DemoOrderItem[];
    total: number;
    pickup_time: string | null;
    notes: string | null;
    size: string | null;
    status: OrderStatus;
    payment_status: PaymentStatus;
    created_at: string;
}

const store = new Map<string, DemoOrder>();

export function createDemoOrder(input: {
    items: DemoOrderItem[];
    total: number;
    pickupTime?: string | null;
    notes?: string | null;
    size?: string | null;
    paymentStatus?: PaymentStatus;
}): DemoOrder {
    const id = crypto.randomUUID();
    const order: DemoOrder = {
        id,
        order_num: `BB-${((Date.now() % 9000) + 1000)}`,
        items: input.items,
        total: input.total,
        pickup_time: input.pickupTime ?? null,
        notes: input.notes ?? null,
        size: input.size ?? null,
        status: 'waiting',
        payment_status: input.paymentStatus ?? 'pending',
        created_at: new Date().toISOString(),
    };
    store.set(id, order);
    return order;
}

export function getDemoOrder(id: string): DemoOrder | undefined {
    return store.get(id);
}

export function listDemoOrders(): DemoOrder[] {
    return Array.from(store.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function updateDemoOrderStatus(id: string, status: OrderStatus): DemoOrder | undefined {
    const order = store.get(id);
    if (!order) return undefined;
    order.status = status;
    return order;
}

export function resetDemoStore(): void {
    store.clear();
}

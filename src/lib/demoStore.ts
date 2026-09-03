/**
 * In-memory stand-in for the `orders` table, used only when Supabase isn't
 * configured (see isSupabaseConfigured() in supabase.ts). Lets the full
 * order → payment-choice → status → kitchen loop be exercised locally
 * without any real backend.
 *
 * Deliberately local/single-process only: this is a process-global Map, which
 * lets Next's separate route module graphs share one demo session but will
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

// Next compiles route handlers into separate module graphs. A module-local Map
// therefore lets an order created by /api/orders disappear when
// /api/kitchen/orders reads from its own copy of this module. Keep the dev-only
// store on the process global so every route bundle sees the same demo loop.
const demoGlobal = globalThis as typeof globalThis & {
    __baribaliDemoOrders?: Map<string, DemoOrder>;
    __baribaliDemoOrderSubmissions?: Map<string, {
        fingerprint: string;
        orderId: string;
    }>;
};
const store = demoGlobal.__baribaliDemoOrders ??= new Map<string, DemoOrder>();
const submissionStore = demoGlobal.__baribaliDemoOrderSubmissions ??= new Map();

export interface DemoOrderSubmission {
    fingerprint: string;
    order: DemoOrder;
}

export type CreateDemoOrderOnceResult = DemoOrderSubmission & {
    conflict: boolean;
    created: boolean;
};

export function createDemoOrder(input: {
    items: DemoOrderItem[];
    total: number;
    pickupTime?: string | null;
    notes?: string | null;
    size?: string | null;
    paymentStatus?: PaymentStatus;
    orderNum?: string;
}): DemoOrder {
    const id = crypto.randomUUID();
    const order: DemoOrder = {
        id,
        order_num: input.orderNum ?? `BB-${((Date.now() % 9000) + 1000)}`,
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

/**
 * Returns the order already associated with a browser submission key. The
 * fingerprint lives in a separate map so kitchen/status API responses never
 * disclose the key or hash as part of the order record.
 */
export function getDemoOrderSubmission(submissionKey: string): DemoOrderSubmission | undefined {
    const submission = submissionStore.get(submissionKey);
    if (!submission) return undefined;
    const order = store.get(submission.orderId);
    if (!order) {
        submissionStore.delete(submissionKey);
        return undefined;
    }
    return { fingerprint: submission.fingerprint, order };
}

/**
 * Single-process equivalent of the database's unique-key insert. JavaScript
 * runs this function without an await boundary, so two concurrent demo
 * requests cannot both pass the lookup and create separate tickets.
 */
export function createDemoOrderOnce(input: Parameters<typeof createDemoOrder>[0] & {
    submissionKey: string;
    submissionFingerprint: string;
}): CreateDemoOrderOnceResult {
    const existing = getDemoOrderSubmission(input.submissionKey);
    if (existing) {
        return {
            ...existing,
            conflict: existing.fingerprint !== input.submissionFingerprint,
            created: false,
        };
    }

    const order = createDemoOrder(input);
    submissionStore.set(input.submissionKey, {
        fingerprint: input.submissionFingerprint,
        orderId: order.id,
    });
    return {
        fingerprint: input.submissionFingerprint,
        order,
        conflict: false,
        created: true,
    };
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
    submissionStore.clear();
}

/** Clears rehearsal tickets without touching real-looking demo orders. */
export function removeDemoSimulationOrders(): number {
    let removed = 0;
    for (const [id, order] of store) {
        if (!order.order_num.startsWith('SIM-')) continue;
        store.delete(id);
        for (const [key, submission] of submissionStore) {
            if (submission.orderId === id) submissionStore.delete(key);
        }
        removed += 1;
    }
    return removed;
}

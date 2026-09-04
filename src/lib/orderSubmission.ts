const STORAGE_KEY = 'baribali-order-submission-v1';

export const ORDER_SUBMISSION_TTL_MS = 30 * 60 * 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface OrderSubmissionStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface OrderSubmissionRecord {
    intent: string;
    submissionKey: string;
    createdAt: number;
    /** Stable basket identity used to recover after SummaryView remounts. */
    cartIntent?: string;
    /** Exact body originally sent, excluding authorization and submissionKey. */
    requestBody?: Record<string, unknown>;
    pendingPayment?: {
        orderId: string;
        orderNum: string | null;
        idempotencyKey: string;
    };
}

interface ClaimOptions {
    storage?: OrderSubmissionStorage | null;
    now?: () => number;
    randomUUID?: () => string;
    ttlMs?: number;
    requestBody?: unknown;
    cartIntent?: string;
}

interface ClearOptions {
    storage?: OrderSubmissionStorage | null;
}

interface RestoreOptions {
    storage?: OrderSubmissionStorage | null;
    now?: () => number;
    ttlMs?: number;
}

function browserStorage(): OrderSubmissionStorage | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function resolveStorage(storage: OrderSubmissionStorage | null | undefined): OrderSubmissionStorage | null {
    return storage === undefined ? browserStorage() : storage;
}

/**
 * JSON with recursively sorted object keys. Arrays retain their order because
 * ingredient order is part of the submitted intent. Undefined object fields
 * are omitted and undefined array entries become null, matching JSON.stringify.
 */
function canonicalJson(value: unknown, seen: WeakSet<object>): string | undefined {
    if (value === null) return 'null';

    switch (typeof value) {
        case 'string':
        case 'boolean':
            return JSON.stringify(value);
        case 'number':
            return Number.isFinite(value) ? JSON.stringify(value) : 'null';
        case 'undefined':
        case 'function':
        case 'symbol':
            return undefined;
        case 'bigint':
            throw new TypeError('Order intent must be JSON serializable');
        case 'object': {
            if (seen.has(value)) throw new TypeError('Order intent must not be circular');
            seen.add(value);
            try {
                if (Array.isArray(value)) {
                    return `[${value.map(item => canonicalJson(item, seen) ?? 'null').join(',')}]`;
                }

                const prototype = Object.getPrototypeOf(value);
                if (prototype !== Object.prototype && prototype !== null) {
                    throw new TypeError('Order intent must contain only plain JSON objects');
                }

                const object = value as Record<string, unknown>;
                const fields: string[] = [];
                for (const key of Object.keys(object).sort()) {
                    const encoded = canonicalJson(object[key], seen);
                    if (encoded !== undefined) fields.push(`${JSON.stringify(key)}:${encoded}`);
                }
                return `{${fields.join(',')}}`;
            } finally {
                seen.delete(value);
            }
        }
    }
}

function optionalString(
    value: unknown,
    field: string,
    normalize: (value: string) => string,
): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw new TypeError(`${field} must be a string`);
    return normalize(value) || null;
}

function normalizePaymentChoice(value: unknown): 'now' | 'pickup' | 'fail' | null {
    if (value === undefined || value === null) return null;
    if (value === 'now' || value === 'pickup' || value === 'fail') return value;
    throw new TypeError('Order payment choice is invalid');
}

interface SemanticOrderFields {
    itemIds: string[];
    size: number;
    productType: 'salad' | 'tortilla';
    pickupTime: string | null;
    notes: string | null;
    discountCode: string | null;
    paymentChoice: 'now' | 'pickup' | 'fail' | null;
}

function semanticOrderFields(body: unknown): SemanticOrderFields {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new TypeError('Order body must be an object');
    }
    const input = body as Record<string, unknown>;
    if (!Array.isArray(input.items)) throw new TypeError('Order items must be an array');

    const itemIds = input.items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new TypeError('Order items must be objects');
        }
        const id = (item as Record<string, unknown>).id;
        if (typeof id !== 'string' || !id) throw new TypeError('Order item id is required');
        return id;
    });

    if (typeof input.size !== 'number' || !Number.isFinite(input.size)) {
        throw new TypeError('Order size must be a finite number');
    }
    if (input.productType !== 'salad' && input.productType !== 'tortilla') {
        throw new TypeError('Order product type is invalid');
    }

    return {
        itemIds,
        size: input.size,
        productType: input.productType,
        pickupTime: optionalString(input.pickupTime, 'Order pickup time', value => value.trim()),
        notes: optionalString(input.notes, 'Order notes', value => value.replace(/\r\n?/g, '\n').trim()),
        discountCode: optionalString(input.discountCode, 'Order discount code', value => value.trim().toUpperCase()),
        paymentChoice: normalizePaymentChoice(input.paymentChoice),
    };
}

/**
 * Stable identity for customer intent, derived from the complete order body.
 * Mutable client prices and item presentation are deliberately excluded: the
 * server re-derives them, so a refresh must not turn one ambiguous submission
 * into a second order. Ordered ids and customer-entered choices remain exact.
 */
export function orderSubmissionIntent(body: unknown): string {
    const fields = semanticOrderFields(body);
    const semanticIntent = {
        version: 1,
        ...fields,
    };
    const encoded = canonicalJson(semanticIntent, new WeakSet());
    if (encoded === undefined) throw new TypeError('Order intent must be a JSON value');
    return `order-v1:${encoded}`;
}

/**
 * Identity of the persisted builder draft, excluding checkout-only choices
 * that are lost on a hard reload (pickup, promo and demo payment route).
 */
export function orderSubmissionCartIntent(body: unknown): string {
    const fields = semanticOrderFields(body);
    const encoded = canonicalJson({
        version: 1,
        itemIds: fields.itemIds,
        size: fields.size,
        productType: fields.productType,
        notes: fields.notes,
    }, new WeakSet());
    if (encoded === undefined) throw new TypeError('Order cart intent must be a JSON value');
    return `order-cart-v1:${encoded}`;
}

function cloneRequestBody(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Order request body must be an object');
    }
    const encoded = canonicalJson(value, new WeakSet());
    if (!encoded) throw new TypeError('Order request body must be serializable');
    return JSON.parse(encoded) as Record<string, unknown>;
}

function parseRecord(value: unknown): OrderSubmissionRecord | null {
    if (!value || typeof value !== 'object') return null;
    const parsed = value as Partial<OrderSubmissionRecord>;
    if (
        typeof parsed.intent !== 'string'
        || typeof parsed.submissionKey !== 'string'
        || !UUID_PATTERN.test(parsed.submissionKey)
        || typeof parsed.createdAt !== 'number'
        || !Number.isFinite(parsed.createdAt)
    ) return null;

    const requestBody = parsed.requestBody;
    if (
        requestBody !== undefined
        && (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody))
    ) return null;

    const pendingPayment = parsed.pendingPayment;
    if (
        pendingPayment !== undefined
        && (
            !pendingPayment
            || typeof pendingPayment !== 'object'
            || !UUID_PATTERN.test(pendingPayment.orderId)
            || !UUID_PATTERN.test(pendingPayment.idempotencyKey)
            || (
                pendingPayment.orderNum !== null
                && typeof pendingPayment.orderNum !== 'string'
            )
        )
    ) return null;

    return {
        intent: parsed.intent,
        submissionKey: parsed.submissionKey,
        createdAt: parsed.createdAt,
        ...(typeof parsed.cartIntent === 'string' ? { cartIntent: parsed.cartIntent } : {}),
        ...(requestBody ? { requestBody: requestBody as Record<string, unknown> } : {}),
        ...(pendingPayment ? { pendingPayment } : {}),
    };
}

function isRecoverable(record: OrderSubmissionRecord, now: number, ttlMs: number): boolean {
    // Once the order exists, its hosted page may remain chargeable indefinitely
    // under the current provider contract. Keep that exact order/payment
    // identity for the rest of this tab session; tracking clears it after the
    // terminal hand-off. The short TTL applies only to pre-order ambiguity.
    if (record.pendingPayment) return true;
    const age = now - record.createdAt;
    return age >= 0 && age <= ttlMs;
}

function readStored(storage: OrderSubmissionStorage | null): OrderSubmissionRecord[] {
    if (!storage) return [];
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.map(parseRecord).filter((record): record is OrderSubmissionRecord => record !== null);
    } catch {
        return [];
    }
}

function writeStored(storage: OrderSubmissionStorage | null, records: OrderSubmissionRecord[]): void {
    if (!storage) return;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
        // Private browsing/storage quotas must not prevent an order attempt. The
        // caller still retains this record in memory for retries in this mount.
    }
}

function removeStored(storage: OrderSubmissionStorage | null): void {
    if (!storage) return;
    try {
        storage.removeItem(STORAGE_KEY);
    } catch {
        // Storage is an extra durability layer, never a reason to break checkout.
    }
}

function withClaimDetails(
    record: OrderSubmissionRecord,
    options: ClaimOptions,
): OrderSubmissionRecord {
    const requestBody = options.requestBody === undefined
        ? record.requestBody
        : cloneRequestBody(options.requestBody);
    const cartIntent = options.cartIntent
        ?? (requestBody ? orderSubmissionCartIntent(requestBody) : record.cartIntent);
    return {
        ...record,
        ...(cartIntent ? { cartIntent } : {}),
        ...(requestBody ? { requestBody } : {}),
    };
}

function replaceStored(
    storage: OrderSubmissionStorage | null,
    record: OrderSubmissionRecord,
): void {
    const stored = readStored(storage);
    const remaining = stored.filter(candidate => !(
        candidate.intent === record.intent
        && candidate.submissionKey === record.submissionKey
    ));
    writeStored(storage, [...remaining, record]);
}

/**
 * Reuse the key for the same fresh intent from memory first, then sessionStorage.
 * A changed basket/pickup/payment intent always receives a new key.
 */
export function claimOrderSubmission(
    intent: string,
    current: OrderSubmissionRecord | null,
    options: ClaimOptions = {},
): OrderSubmissionRecord {
    if (!intent) throw new TypeError('Order intent is required');

    const storage = resolveStorage(options.storage);
    const now = (options.now ?? Date.now)();
    const ttlMs = options.ttlMs ?? ORDER_SUBMISSION_TTL_MS;

    const allStored = readStored(storage);
    const recoverableStored = allStored.filter(record => isRecoverable(record, now, ttlMs));

    if (current?.intent === intent && isRecoverable(current, now, ttlMs)) {
        const enriched = withClaimDetails(current, options);
        const withoutCurrent = recoverableStored.filter(record => record.intent !== intent);
        writeStored(storage, [...withoutCurrent, enriched]);
        return enriched;
    }

    const stored = recoverableStored.find(record => record.intent === intent);
    if (stored) {
        const enriched = withClaimDetails(stored, options);
        const withoutStored = recoverableStored.filter(record => record.intent !== intent);
        writeStored(storage, [...withoutStored, enriched]);
        return enriched;
    }

    const submissionKey = (options.randomUUID ?? (() => globalThis.crypto.randomUUID()))();
    if (!UUID_PATTERN.test(submissionKey)) throw new TypeError('randomUUID returned an invalid UUID');

    const record = withClaimDetails({ intent, submissionKey, createdAt: now }, options);
    writeStored(storage, [...recoverableStored, record]);
    return record;
}

/** Most recent unresolved request belonging to the currently restored draft. */
export function restoreOrderSubmission(
    cartIntent: string,
    options: RestoreOptions = {},
): OrderSubmissionRecord | null {
    if (!cartIntent) return null;
    const storage = resolveStorage(options.storage);
    const now = (options.now ?? Date.now)();
    const ttlMs = options.ttlMs ?? ORDER_SUBMISSION_TTL_MS;
    const allStored = readStored(storage);
    const recoverableStored = allStored.filter(record => isRecoverable(record, now, ttlMs));
    if (recoverableStored.length !== allStored.length) {
        if (recoverableStored.length === 0) removeStored(storage);
        else writeStored(storage, recoverableStored);
    }
    return recoverableStored
        .filter(record => record.cartIntent === cartIntent && record.requestBody)
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

/** Persist the order/payment identity before trying to leave for the provider. */
export function markOrderSubmissionPaymentPending(
    record: OrderSubmissionRecord,
    pendingPayment: NonNullable<OrderSubmissionRecord['pendingPayment']>,
    options: ClearOptions = {},
): OrderSubmissionRecord {
    if (
        !UUID_PATTERN.test(pendingPayment.orderId)
        || !UUID_PATTERN.test(pendingPayment.idempotencyKey)
        || (pendingPayment.orderNum !== null && typeof pendingPayment.orderNum !== 'string')
    ) throw new TypeError('Pending payment identity is invalid');

    const updated: OrderSubmissionRecord = {
        ...record,
        pendingPayment: { ...pendingPayment },
    };
    replaceStored(resolveStorage(options.storage), updated);
    return updated;
}

/** Tracking is the terminal hand-off: this order no longer needs checkout recovery. */
export function clearOrderSubmissionForOrder(
    orderId: string,
    options: ClearOptions = {},
): void {
    if (!UUID_PATTERN.test(orderId)) return;
    const storage = resolveStorage(options.storage);
    const stored = readStored(storage);
    const remaining = stored.filter(record => record.pendingPayment?.orderId !== orderId);
    if (remaining.length === stored.length) return;
    if (remaining.length === 0) removeStored(storage);
    else writeStored(storage, remaining);
}

/** Remove only the record that this response definitively settled. */
export function clearOrderSubmission(
    record: OrderSubmissionRecord,
    options: ClearOptions = {},
): void {
    const storage = resolveStorage(options.storage);
    const stored = readStored(storage);
    const remaining = stored.filter(candidate => !(
        candidate.intent === record.intent
        && candidate.submissionKey === record.submissionKey
    ));
    if (remaining.length === stored.length) return;
    if (remaining.length === 0) removeStored(storage);
    else writeStored(storage, remaining);
}

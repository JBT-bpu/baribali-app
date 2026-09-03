import { createHash } from 'node:crypto';

import { discountAmount, type Discount } from '@/lib/discounts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 100;
const MAX_ITEM_ID_LENGTH = 128;
const MAX_PICKUP_LENGTH = 32;
const MAX_NOTES_LENGTH = 200;
const MAX_DISCOUNT_CODE_LENGTH = 64;

export interface OrderSubmissionIntent {
    itemIds: string[];
    total: number;
    pickupTime: string | null;
    notes: string | null;
    size: number;
    productType: 'salad' | 'tortilla' | null;
    discountCode: string | null;
    paymentChoice: 'now' | 'pickup' | 'fail' | null;
}

export type InitialOrderPaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'pay_at_pickup'
    | 'no_payment_required';

/**
 * Chooses the truthful initial money state for a newly-created order.
 * A zero total always wins over gateway availability and demo controls: there
 * is no charge to initialize, fail, or collect later.
 */
export function initialOrderPaymentStatus(input: {
    total: number;
    demoMode: boolean;
    paymentChoice: OrderSubmissionIntent['paymentChoice'];
    paymentConfigured: boolean;
}): InitialOrderPaymentStatus {
    if (input.total === 0) return 'no_payment_required';

    if (input.demoMode) {
        if (input.paymentChoice === 'now') return 'paid';
        if (input.paymentChoice === 'fail') return 'failed';
        return 'pay_at_pickup';
    }

    return input.paymentConfigured ? 'pending' : 'pay_at_pickup';
}

type ParsedIntent =
    | { valid: true; intent: OrderSubmissionIntent }
    | { valid: false };

export function isValidSubmissionKey(value: unknown): value is string {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Reduces a request to the fields that can materially change the order.
 * Client-provided labels, icons, prices and extra object fields are excluded:
 * the server never persists them, so changing one must not turn an ambiguous
 * retry into a second kitchen ticket.
 *
 * This deliberately runs before live hours, discount-tag and menu-price
 * checks. A committed request must remain recoverable after a response loss
 * even if the shop closes or configuration changes before the retry.
 */
export function parseOrderSubmissionIntent(
    body: unknown,
    demoMode: boolean,
): ParsedIntent {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { valid: false };
    const input = body as Record<string, unknown>;

    if (!Array.isArray(input.items) || input.items.length > MAX_ITEMS) return { valid: false };
    const itemIds: string[] = [];
    for (const item of input.items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return { valid: false };
        const id = (item as Record<string, unknown>).id;
        if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ITEM_ID_LENGTH) {
            return { valid: false };
        }
        itemIds.push(id);
    }

    if (!Number.isSafeInteger(input.total) || (input.total as number) < 0) return { valid: false };
    if (typeof input.size !== 'number' || !Number.isFinite(input.size)) return { valid: false };

    const rawPickup = input.pickupTime;
    if (rawPickup !== undefined && rawPickup !== null && typeof rawPickup !== 'string') {
        return { valid: false };
    }
    const pickupTime = typeof rawPickup === 'string' ? rawPickup.trim() : null;
    if ((pickupTime?.length ?? 0) > MAX_PICKUP_LENGTH) return { valid: false };

    const rawNotes = input.notes;
    if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== 'string') {
        return { valid: false };
    }
    if ((rawNotes?.length ?? 0) > MAX_NOTES_LENGTH) return { valid: false };
    const normalizedNotes = typeof rawNotes === 'string'
        ? rawNotes.replace(/\r\n?/g, '\n').trim()
        : '';
    const notes = normalizedNotes || null;

    const rawProduct = input.productType;
    if (
        rawProduct !== undefined
        && rawProduct !== null
        && rawProduct !== 'salad'
        && rawProduct !== 'tortilla'
    ) return { valid: false };
    const productType = rawProduct === 'salad' || rawProduct === 'tortilla' ? rawProduct : null;

    const rawDiscountCode = input.discountCode;
    if (
        rawDiscountCode !== undefined
        && rawDiscountCode !== null
        && typeof rawDiscountCode !== 'string'
    ) return { valid: false };
    const discountCode = typeof rawDiscountCode === 'string'
        ? rawDiscountCode.trim().toUpperCase() || null
        : null;
    if ((discountCode?.length ?? 0) > MAX_DISCOUNT_CODE_LENGTH) return { valid: false };

    let paymentChoice: OrderSubmissionIntent['paymentChoice'] = null;
    if (demoMode) {
        if (
            input.paymentChoice !== undefined
            && input.paymentChoice !== 'now'
            && input.paymentChoice !== 'pickup'
            && input.paymentChoice !== 'fail'
        ) return { valid: false };
        paymentChoice = input.paymentChoice === 'now' || input.paymentChoice === 'fail'
            ? input.paymentChoice
            : 'pickup';
    }

    return {
        valid: true,
        intent: {
            itemIds,
            total: input.total as number,
            pickupTime,
            notes,
            size: input.size,
            productType,
            discountCode,
            paymentChoice,
        },
    };
}

export function orderSubmissionFingerprint(intent: OrderSubmissionIntent): string {
    // Object insertion order is fixed here; caller object order never enters
    // the hash. The client total is intentionally excluded: it is untrusted,
    // recomputed below, and correcting a rejected price should not require a
    // new key. Mutable server prices/assigned discounts are excluded too, so a
    // committed request remains recoverable after configuration changes.
    const canonical = JSON.stringify({
        version: 1,
        itemIds: intent.itemIds,
        pickupTime: intent.pickupTime,
        notes: intent.notes,
        size: intent.size,
        productType: intent.productType,
        discountCode: intent.discountCode,
        paymentChoice: intent.paymentChoice,
    });
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export type OrderPricingAcceptance =
    | 'exact'
    | 'missed-stronger-standing-discount'
    | 'rejected';

export interface OrderPricingDecision {
    discount: Discount | null;
    discountAmount: number;
    total: number;
    accepted: boolean;
    acceptance: OrderPricingAcceptance;
}

interface OrderPricingDecisionInput {
    subtotal: number;
    submittedTotal: number;
    typedDiscount: Discount | null;
    assignedDiscount: Discount | null;
}

/**
 * Resolves the server-authoritative price and narrowly decides whether the
 * submitted price can be accepted. Besides an exact match, the only allowed
 * mismatch is the client's exact typed-code quote when a stronger standing
 * discount was discovered after the client submitted.
 */
export function resolveOrderPricingDecision({
    subtotal,
    submittedTotal,
    typedDiscount,
    assignedDiscount,
}: OrderPricingDecisionInput): OrderPricingDecision {
    const typedAmount = discountAmount(subtotal, typedDiscount);
    const assignedAmount = discountAmount(subtotal, assignedDiscount);
    const discount = assignedAmount >= typedAmount ? assignedDiscount : typedDiscount;
    const authoritativeDiscountAmount = Math.max(assignedAmount, typedAmount);
    const total = subtotal - authoritativeDiscountAmount;

    if (submittedTotal === total) {
        return {
            discount,
            discountAmount: authoritativeDiscountAmount,
            total,
            accepted: true,
            acceptance: 'exact',
        };
    }

    const typedOnlyTotal = subtotal - typedAmount;
    if (assignedAmount > typedAmount && submittedTotal === typedOnlyTotal) {
        return {
            discount,
            discountAmount: authoritativeDiscountAmount,
            total,
            accepted: true,
            acceptance: 'missed-stronger-standing-discount',
        };
    }

    return {
        discount,
        discountAmount: authoritativeDiscountAmount,
        total,
        accepted: false,
        acceptance: 'rejected',
    };
}

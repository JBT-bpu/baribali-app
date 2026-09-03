import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfigurationState } from '@/lib/supabaseServerConfig';
import { computeOrderTotal } from '@/lib/pricing';
import {
    createDemoOrderOnce,
    getDemoOrderSubmission,
    type DemoOrder,
} from '@/lib/demoStore';
import { enforceRateLimit } from '@/lib/rateLimit';
import { isPaymentConfigured } from '@/lib/payment';
import { findDiscount, type Discount } from '@/lib/discounts';
import {
    CustomerDiscountLookupError,
    getCustomerDiscount,
} from '@/lib/customerTags';
import {
    SHOP_STATE_UNAVAILABLE_ERROR_CODE,
    shopStatus,
    checkPickup,
} from '@/lib/shopHours';
import { readShopState } from '@/lib/shopState';
import {
    initialOrderPaymentStatus,
    isValidSubmissionKey,
    orderSubmissionFingerprint,
    parseOrderSubmissionIntent,
    resolveOrderPricingDecision,
} from '@/lib/orderSubmissionServer';
import { supabaseConfigurationErrorResponse } from '@/lib/supabaseRoute';

const ORDER_INTENT_VERSION = 1;

interface StoredOrder {
    id: string;
    order_num: string;
    created_at: string;
    payment_status: string;
    total: number;
}

interface OrderCreationRow {
    result: 'created' | 'replayed' | 'conflict';
    result_order_id: string | null;
    result_order_num: string | null;
    result_created_at: string | null;
    result_payment_status: string | null;
}

function submissionConflict() {
    return NextResponse.json({
        error: 'פרטי ההזמנה השתנו. נסו לשלוח שוב.',
        code: 'SUBMISSION_KEY_CONFLICT',
    }, { status: 409 });
}

function idempotencyUnavailable() {
    return NextResponse.json({
        error: 'Order submission is temporarily unavailable',
        code: 'ORDER_IDEMPOTENCY_NOT_READY',
    }, { status: 503 });
}

function customerDiscountUnavailable() {
    return NextResponse.json({
        error: 'לא הצלחנו לאמת כרגע את הטבת החשבון. נסו שוב בעוד רגע.',
        code: 'CUSTOMER_DISCOUNT_UNAVAILABLE',
    }, { status: 503 });
}

function recordedOrderResponse(
    order: StoredOrder | DemoOrder,
    options: { demo: boolean; replayed: boolean; priceAdjusted?: boolean },
) {
    const paymentStatus = order.payment_status;
    return NextResponse.json({
        id: order.id,
        orderNum: order.order_num,
        createdAt: order.created_at,
        total: order.total,
        ...(options.demo ? { demo: true } : {}),
        replayed: options.replayed,
        ...(options.priceAdjusted ? { priceAdjusted: true } : {}),
        payAtPickup: paymentStatus === 'pay_at_pickup',
        paymentStatus,
        ...(options.demo ? { paymentFailed: paymentStatus === 'failed' } : {}),
    });
}

/** Verify a supplied Supabase token; guests deliberately resolve to null. */
async function verifiedUserId(
    req: NextRequest,
    admin: SupabaseClient | null,
): Promise<string | null> {
    const auth = req.headers.get('authorization');
    if (!admin || !auth?.startsWith('Bearer ')) return null;
    const { data, error } = await admin.auth.getUser(auth.slice(7));
    if (error || !data.user) return null;
    return data.user.id;
}

export async function POST(req: NextRequest) {
    const limited = enforceRateLimit(req, 'orders', 12, 60_000);
    if (limited) return limited;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
    }

    try {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid order fields' }, { status: 400 });
        }
        const input = body as Record<string, unknown>;
        if (!isValidSubmissionKey(input.submissionKey)) {
            return NextResponse.json({
                error: 'Missing or invalid submission key',
                code: 'INVALID_SUBMISSION_KEY',
            }, { status: 400 });
        }

        const configuration = supabaseConfigurationState();
        if (configuration === 'misconfigured') return supabaseConfigurationErrorResponse();
        const demoMode = configuration === 'demo';
        let admin: SupabaseClient | null = null;
        if (!demoMode) {
            try {
                // Dynamic so the plain Node demo tests do not have to resolve
                // Next's compile-time-only `server-only` marker package.
                const { getSupabaseAdmin } = await import('@/lib/serverSupabase');
                admin = getSupabaseAdmin();
            } catch (error) {
                console.error('[POST /api/orders] Admin client unavailable:', error);
                return supabaseConfigurationErrorResponse();
            }
        }
        const parsed = parseOrderSubmissionIntent(input, demoMode);
        if (!parsed.valid) {
            return NextResponse.json({ error: 'Invalid order fields' }, { status: 400 });
        }

        const { intent } = parsed;
        // PostgreSQL uuid equality is case-insensitive; normalize demo keys to
        // the same semantics so casing cannot create a second local ticket.
        const submissionKey = input.submissionKey.toLowerCase();
        const submissionFingerprint = orderSubmissionFingerprint(intent);

        // Recover before mutable validation. If the first transaction committed
        // but its response was lost, a later retry must work after closing time
        // or a menu/tag change instead of creating or implying a second order.
        if (demoMode) {
            const prior = getDemoOrderSubmission(submissionKey);
            if (prior) {
                if (prior.fingerprint !== submissionFingerprint) return submissionConflict();
                return recordedOrderResponse(prior.order, { demo: true, replayed: true });
            }
        } else {
            const { data: requestRecord, error: requestError } = await admin!
                .from('order_creation_requests')
                .select('intent_version, intent_hash, order_id')
                .eq('idempotency_key', submissionKey)
                .maybeSingle();

            if (requestError) {
                console.error('[POST /api/orders] Idempotency lookup failed:', requestError.message);
                return idempotencyUnavailable();
            }

            if (requestRecord) {
                if (
                    requestRecord.intent_version !== ORDER_INTENT_VERSION
                    || requestRecord.intent_hash !== submissionFingerprint
                ) return submissionConflict();

                const { data: priorOrder, error: priorOrderError } = await admin!
                    .from('orders')
                    .select('id, order_num, created_at, payment_status, total')
                    .eq('id', requestRecord.order_id)
                    .single();

                if (priorOrderError || !priorOrder) {
                    console.error(
                        '[POST /api/orders] Idempotency order recovery failed:',
                        priorOrderError?.message ?? 'missing order',
                    );
                    return idempotencyUnavailable();
                }

                return recordedOrderResponse(priorOrder as StoredOrder, {
                    demo: false,
                    replayed: true,
                });
            }
        }

        const computed = computeOrderTotal(
            input.items,
            intent.size,
            intent.productType ?? undefined,
        );
        if (!computed.valid) {
            return NextResponse.json({ error: 'Invalid order items or size' }, { status: 400 });
        }

        // The server, not the visible client clock, owns opening and pickup
        // acceptance. A manual open override may legitimately accept null.
        const now = new Date();
        const storedShopState = await readShopState();
        if (!storedShopState.available) {
            return NextResponse.json({
                error: 'לא הצלחנו לוודא כרגע שהמטבח פתוח. נסו שוב בעוד רגע.',
                code: SHOP_STATE_UNAVAILABLE_ERROR_CODE,
            }, { status: 503 });
        }
        const shop = shopStatus(now, storedShopState.override);
        if (!shop.open) {
            return NextResponse.json({
                error: shop.reason === 'override_closed'
                    ? 'הזמנות סגורות כרגע. נסו שוב מאוחר יותר.'
                    : shop.opensAt
                        ? `אנחנו סגורים כרגע. פתוח ${shop.opensAt}–${shop.closesAt}.`
                        : 'אנחנו סגורים היום.',
                shopClosed: true,
            }, { status: 409 });
        }

        const badPickup = checkPickup(intent.pickupTime, now);
        if (badPickup) {
            return NextResponse.json({
                error: badPickup === 'in_the_past'
                    ? 'שעת האיסוף שנבחרה כבר עברה. בחרו שעה חדשה.'
                    : `שעת האיסוף אינה בשעות הפעילות (${shop.opensAt}–${shop.closesAt}).`,
                pickupRejected: badPickup,
            }, { status: 409 });
        }

        // Resolve the final server-authoritative discount. The mutable tag and
        // current price values are deliberately outside the stable intent hash.
        // Authentication also happens only on a new request: replay is keyed by
        // the high-entropy submission secret and must survive an expired token.
        const userId = await verifiedUserId(req, admin);
        const typedDiscount = findDiscount(intent.discountCode);
        let assignedDiscount: Discount | null;
        try {
            // The strict service-role client matters here: an anon fallback is
            // blocked by RLS and would look exactly like "no standing tag".
            assignedDiscount = await getCustomerDiscount(userId, admin ?? undefined);
        } catch (error) {
            console.error(
                '[POST /api/orders] Customer discount lookup failed:',
                error instanceof CustomerDiscountLookupError ? error.code : 'unexpected error',
            );
            return customerDiscountUnavailable();
        }
        const pricing = resolveOrderPricingDecision({
            subtotal: computed.total,
            submittedTotal: intent.total,
            typedDiscount,
            assignedDiscount,
        });
        const {
            discount,
            discountAmount: discAmount,
            total: finalTotal,
        } = pricing;

        if (!pricing.accepted) {
            console.error(
                '[POST /api/orders] Price mismatch: client sent',
                intent.total,
                'server computed',
                finalTotal,
            );
            return NextResponse.json({
                error: `המחיר עודכן ל־₪${finalTotal}. עברו על הסכום ולחצו שוב לאישור.`,
                code: 'ORDER_TOTAL_CHANGED',
                expectedTotal: finalTotal,
                subtotal: computed.total,
                discountAmount: discAmount,
                discount: discount ? {
                    code: discount.code,
                    type: discount.type,
                    value: discount.value,
                    note: discount.note ?? null,
                } : null,
            }, { status: 409 });
        }

        if (demoMode) {
            const paymentStatus = initialOrderPaymentStatus({
                total: finalTotal,
                demoMode: true,
                paymentChoice: intent.paymentChoice,
                paymentConfigured: false,
            });
            const result = createDemoOrderOnce({
                submissionKey,
                submissionFingerprint,
                items: computed.items,
                total: finalTotal,
                pickupTime: intent.pickupTime,
                notes: intent.notes,
                size: String(intent.size),
                paymentStatus,
            });
            if (result.conflict) return submissionConflict();
            return recordedOrderResponse(result.order, {
                demo: true,
                replayed: !result.created,
                priceAdjusted: pricing.acceptance === 'missed-stronger-standing-discount',
            });
        }

        // A fully-discounted order has no payment operation at all. Otherwise,
        // no usable gateway means pay-at-pickup; a configured gateway remains
        // pending until the separately idempotent payment flow settles.
        const paymentStatus = initialOrderPaymentStatus({
            total: finalTotal,
            demoMode: false,
            paymentChoice: null,
            // Do not even inspect gateway configuration when there is no charge.
            paymentConfigured: finalTotal > 0 && isPaymentConfigured(),
        });
        const orderNum = `BB-${((Date.now() % 9000) + 1000)}`;
        const { data, error } = await admin!.rpc('create_order_idempotent', {
            p_idempotency_key: submissionKey,
            p_intent_version: ORDER_INTENT_VERSION,
            p_intent_hash: submissionFingerprint,
            p_order_num: orderNum,
            p_items: computed.items,
            p_total: finalTotal,
            p_pickup_time: intent.pickupTime,
            p_notes: intent.notes,
            p_size: String(intent.size),
            p_payment_status: paymentStatus,
            p_user_id: userId,
            // These are made durable by this migration; there was no tracked
            // schema for the fields even though the former direct insert wrote
            // them. The live types still need inspection before application.
            p_discount_code: discount?.code ?? null,
            p_discount_amount: discAmount,
        });

        if (error) {
            // A transport error may happen after commit. Never fall back to a
            // plain insert; the same key must be retried until the ledger can
            // answer conclusively.
            console.error('[POST /api/orders] Idempotent create failed:', error.message);
            return idempotencyUnavailable();
        }

        const row = (Array.isArray(data) ? data[0] : data) as OrderCreationRow | null;
        if (!row) {
            console.error('[POST /api/orders] Idempotent create returned no row');
            return idempotencyUnavailable();
        }
        if (row.result === 'conflict') return submissionConflict();
        if (
            (row.result !== 'created' && row.result !== 'replayed')
            || !row.result_order_id
            || !row.result_order_num
            || !row.result_created_at
            || !row.result_payment_status
        ) {
            console.error('[POST /api/orders] Invalid idempotent create result:', row.result);
            return idempotencyUnavailable();
        }

        // A concurrent request may have won with the same stable intent while
        // mutable auth/tag state produced a different quote in this request.
        // Return the actually persisted amount for a replay, never this
        // request's freshly computed amount.
        if (row.result === 'replayed') {
            const { data: replayedOrder, error: replayedOrderError } = await admin!
                .from('orders')
                .select('id, order_num, created_at, payment_status, total')
                .eq('id', row.result_order_id)
                .single();
            if (replayedOrderError || !replayedOrder) {
                console.error(
                    '[POST /api/orders] Concurrent replay recovery failed:',
                    replayedOrderError?.message ?? 'missing order',
                );
                return idempotencyUnavailable();
            }
            return recordedOrderResponse(replayedOrder as StoredOrder, {
                demo: false,
                replayed: true,
            });
        }

        return recordedOrderResponse({
            id: row.result_order_id,
            order_num: row.result_order_num,
            created_at: row.result_created_at,
            payment_status: row.result_payment_status,
            total: finalTotal,
        }, {
            demo: false,
            replayed: false,
            priceAdjusted: pricing.acceptance === 'missed-stronger-standing-discount',
        });
    } catch (err) {
        console.error('[POST /api/orders]', err);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

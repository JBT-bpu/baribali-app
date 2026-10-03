import { NextRequest, NextResponse } from 'next/server';

import { verifyHypPayment } from '@/lib/hypPay';
import { settleHypCallback } from '@/lib/hypSettlement';
import { applyPaymentVerification, recordPaymentCallback } from '@/lib/paymentAttempts';
import { clientIp, rateLimit } from '@/lib/rateLimit';

function appOrigin(req: NextRequest): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
        } catch {
            // Fall back to the URL Next.js constructed for this request.
        }
    }
    return req.nextUrl.origin;
}

function redirect(req: NextRequest, orderId: string | null, payment: 'success' | 'verifying') {
    const path = orderId ? `/order/${encodeURIComponent(orderId)}` : '/home2';
    const target = new URL(path, appOrigin(req));
    target.searchParams.set('payment', payment);
    const response = NextResponse.redirect(target, 303);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
}

export async function GET(req: NextRequest) {
    // This limiter never rejects the return. It only asks the database not to
    // retain excess unknown-reference evidence from one public IP. The RPC
    // ignores the flag for a real payment attempt, so a valid callback and its
    // refund-critical Id are always recorded first.
    const recordUnknownReference = rateLimit(
        `hyp-browser-unknown:${clientIp(req)}`,
        30,
        60_000,
    ).ok;

    try {
        const settled = await settleHypCallback(
            req.nextUrl.searchParams,
            'browser_return',
            {
                verify: verifyHypPayment,
                record: input => recordPaymentCallback({
                    ...input,
                    recordUnknownReference,
                }),
                apply: applyPaymentVerification,
                // The callback must be recorded before any limiter can defer
                // work: its Id is required for refunds and cannot be recovered
                // from Pay after the redirect is lost. This budget protects
                // outbound VERIFY calls; a deferred durable event can be
                // replayed later and lands on the explicit verifying state.
                // Scope VERIFY abuse to one unguessable payment reference;
                // unrelated customers behind the same carrier IP cannot defer
                // each other's first-party settlement.
                claimVerificationBudget: ({ merchantReference }) => rateLimit(
                    `hyp-browser-verify:${merchantReference}`,
                    12,
                    60_000,
                ).ok,
            },
        );
        return redirect(req, settled.orderId, settled.paid ? 'success' : 'verifying');
    } catch (error) {
        // A callback/database/VERIFY failure is ambiguous, never a decline.
        // The durable event (when recording succeeded) remains available for
        // reconciliation, and the order remains pending rather than failed.
        console.error('[GET /api/payment/hyp/return] settlement deferred', {
            name: error instanceof Error ? error.name : 'unknown',
        });
        return redirect(req, null, 'verifying');
    }
}

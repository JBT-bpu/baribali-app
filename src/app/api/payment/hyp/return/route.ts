import { NextRequest, NextResponse } from 'next/server';

import { verifyHypPayment } from '@/lib/hypPay';
import { settleHypCallback } from '@/lib/hypSettlement';
import { applyPaymentVerification, recordPaymentCallback } from '@/lib/paymentAttempts';
import { enforceRateLimit } from '@/lib/rateLimit';

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
    return NextResponse.redirect(target, 303);
}

export async function GET(req: NextRequest) {
    const limited = enforceRateLimit(req, 'hyp-browser-return', 30, 60_000);
    if (limited) return limited;

    try {
        const settled = await settleHypCallback(
            req.nextUrl.searchParams,
            'browser_return',
            {
                verify: verifyHypPayment,
                record: recordPaymentCallback,
                apply: applyPaymentVerification,
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

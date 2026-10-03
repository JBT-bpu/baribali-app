import { NextRequest, NextResponse } from 'next/server';

import { decryptHypCallback } from '@/lib/hypCallbackEnvelope';
import { verifyHypPayment } from '@/lib/hypPay';
import { settleRecordedHypCallback } from '@/lib/hypSettlement';
import { applyPaymentVerification, claimHypCallbackReplay } from '@/lib/paymentAttempts';
import { enforceRateLimit } from '@/lib/rateLimit';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
    const limited = enforceRateLimit(req, 'hyp-reconcile', 12, 60_000);
    if (limited) return limited;
    let body;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
    }
    const orderId = body?.orderId;
    if (typeof orderId !== 'string' || !UUID_PATTERN.test(orderId)) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }
    // Same unguessable order capability as customer tracking; no sign-in gate.
    // Clients cannot provide envelopes, amounts or a verification outcome.
    try {
        const replay = await claimHypCallbackReplay(orderId);
        if (!replay) return NextResponse.json({ state: 'pending' }, {
            status: 202, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        });
        const params = decryptHypCallback(replay.paramsEnvelope, replay.merchantReference);
        const result = await settleRecordedHypCallback(params, replay.callback, {
            verify: verifyHypPayment,
            apply: applyPaymentVerification,
        });
        return NextResponse.json({ state: result.paid ? 'paid' : 'pending' }, {
            status: result.paid ? 200 : 202, headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('[POST /api/payment/hyp/reconcile] verification deferred', {
            name: error instanceof Error ? error.name : 'unknown',
        });
        return NextResponse.json({ state: 'pending' }, {
            status: 503, headers: { 'Cache-Control': 'no-store' },
        });
    }
}

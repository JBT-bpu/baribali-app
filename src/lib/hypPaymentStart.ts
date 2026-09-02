import { createHypPaymentUrl, HypGatewayError } from '@/lib/hypPay';
import type { ClaimedPaymentAttempt, PaymentAttemptStatus } from '@/lib/paymentAttempts';

export class PaymentStartError extends Error {
    constructor(
        public readonly code: string,
        public readonly httpStatus: number,
        public readonly retryWithNewKey = false,
    ) {
        super(code);
        this.name = 'PaymentStartError';
    }
}

export interface HypPaymentStartDependencies {
    randomUUID: () => string;
    claim: (input: {
        orderId: string;
        idempotencyKey: string;
        leaseToken: string;
    }) => Promise<ClaimedPaymentAttempt>;
    finish: (input: {
        attemptId: string;
        leaseToken: string;
        checkoutUrl: string | null;
        errorCode?: string | null;
    }) => Promise<{ status: PaymentAttemptStatus; checkoutUrl: string | null }>;
    createUrl: typeof createHypPaymentUrl;
}

export interface StartedHypPayment {
    paymentUrl: string;
    attemptId: string;
    reused: boolean;
}

function existingAttemptResult(attempt: ClaimedPaymentAttempt): StartedHypPayment | never {
    if (attempt.status === 'checkout_ready' && attempt.checkoutUrl) {
        return {
            paymentUrl: attempt.checkoutUrl,
            attemptId: attempt.id,
            reused: true,
        };
    }
    if (attempt.status === 'initializing') {
        throw new PaymentStartError('PAYMENT_INITIALIZATION_IN_PROGRESS', 202);
    }
    if (attempt.status === 'verification_pending' || attempt.status === 'needs_review') {
        throw new PaymentStartError('PAYMENT_VERIFICATION_PENDING', 409);
    }
    if (attempt.status === 'paid' || attempt.status === 'duplicate_paid') {
        throw new PaymentStartError('PAYMENT_ALREADY_SETTLED', 409);
    }
    throw new PaymentStartError('PAYMENT_ATTEMPT_CLOSED', 409, true);
}

export async function startHypPayment(
    input: { orderId: string; idempotencyKey: string },
    dependencies: HypPaymentStartDependencies,
): Promise<StartedHypPayment> {
    const leaseToken = dependencies.randomUUID();
    const attempt = await dependencies.claim({
        orderId: input.orderId,
        idempotencyKey: input.idempotencyKey,
        leaseToken,
    });

    if (!attempt.leaseOwned) return existingAttemptResult(attempt);

    let paymentUrl: string;
    try {
        paymentUrl = await dependencies.createUrl({
            amountAgorot: attempt.amountAgorot,
            merchantReference: attempt.merchantReference,
            info: `BariBali ${attempt.merchantReference}`,
        });
    } catch (error) {
        const errorCode = error instanceof HypGatewayError
            ? error.code
            : 'HYP_SIGN_UNEXPECTED';
        await dependencies.finish({
            attemptId: attempt.id,
            leaseToken,
            checkoutUrl: null,
            errorCode,
        });
        throw new PaymentStartError(errorCode, 503, true);
    }

    const persisted = await dependencies.finish({
        attemptId: attempt.id,
        leaseToken,
        checkoutUrl: paymentUrl,
    });
    if (persisted.status !== 'checkout_ready' || !persisted.checkoutUrl) {
        throw new PaymentStartError('PAYMENT_CHECKOUT_NOT_PERSISTED', 503);
    }

    return {
        paymentUrl: persisted.checkoutUrl,
        attemptId: attempt.id,
        reused: !attempt.createdNew,
    };
}

interface PaymentPagePayload {
    paymentUrl?: string;
    code?: string;
    retryWithNewKey?: boolean;
}

/** One bounded request/retry path for the builder and existing-order tracking. */
export async function requestHostedPayment(
    pendingPayment: { orderId: string; idempotencyKey: string },
    fetchImpl: typeof fetch = fetch,
) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const response = await fetchImpl('/api/payment/create', {
                method: 'POST', signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: pendingPayment.orderId, idempotencyKey: pendingPayment.idempotencyKey }),
            });
            const payload = await response.json().catch(() => null) as PaymentPagePayload | null;
            if (response.status === 202 && attempt === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            return { response, payload, networkError: null };
        }
    } catch (error) {
        return { response: null, payload: null, networkError: error as Error };
    } finally {
        clearTimeout(timeoutId);
    }
    return { response: null, payload: null, networkError: null };
}

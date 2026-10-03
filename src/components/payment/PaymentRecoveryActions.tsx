'use client';

import { useRef, useState } from 'react';

import type { PaymentRecoveryMode } from '@/lib/customerPayment';
import { requestHostedPayment } from '@/lib/hostedPaymentRequest';
import { storedPaymentForOrder } from '@/lib/orderSubmission';

export default function PaymentRecoveryActions({
    orderId, mode,
}: { orderId: string; mode: PaymentRecoveryMode }) {
    const locked = useRef(false);
    const paymentKey = useRef<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    if (mode === 'none') return null;

    const recover = async () => {
        if (locked.current) return;
        locked.current = true;
        setBusy(true);
        setMessage('');
        try {
            if (mode === 'verifying') {
                const response = await fetch('/api/payment/hyp/reconcile', {
                    method: 'POST', signal: AbortSignal.timeout(20_000),
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId }),
                });
                const result = await response.json().catch(() => null);
                if (response.ok && result?.state === 'paid') {
                    window.location.replace(`/order/${encodeURIComponent(orderId)}`);
                    return;
                }
                setMessage('האישור עדיין בבדיקה. אל תשלמו שוב; אם אין עדכון, פנו לקופה עם מספר ההזמנה.');
                return;
            }

            paymentKey.current ??= storedPaymentForOrder(orderId)?.idempotencyKey ?? crypto.randomUUID();
            const { response, payload } = await requestHostedPayment({
                orderId, idempotencyKey: paymentKey.current,
            });
            if (response?.ok && payload?.paymentUrl) {
                window.location.assign(payload.paymentUrl);
                return;
            }
            if (payload?.code === 'PAYMENT_ALREADY_SETTLED' || payload?.code === 'PAYMENT_NOT_REQUIRED') {
                window.location.replace(`/order/${encodeURIComponent(orderId)}`);
                return;
            }
            if (payload?.code === 'PAYMENT_VERIFICATION_PENDING') {
                window.location.replace(`/order/${encodeURIComponent(orderId)}?payment=verifying`);
                return;
            }
            if (payload?.retryWithNewKey === true) paymentKey.current = crypto.randomUUID();
            setMessage('לא הצלחנו לפתוח את התשלום. אפשר לנסות שוב; ההזמנה הקיימת נשמרה.');
        } catch {
            setMessage('אין חיבור כרגע. ההזמנה נשמרה — בדקו את החיבור ונסו שוב.');
        } finally {
            locked.current = false;
            setBusy(false);
        }
    };

    return (
        <section aria-label="המשך תשלום" style={{
            position: 'relative', zIndex: 1, width: 'calc(100% - 32px)', maxWidth: 360,
            margin: '0 auto 24px', padding: 16, borderRadius: 18, textAlign: 'center',
            background: 'rgba(7,26,7,0.94)', border: '1px solid rgba(240,208,96,0.3)',
        }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6 }}>
                {mode === 'verifying'
                    ? 'ממתינים לאישור התשלום — אל תשלמו שוב.'
                    : 'התשלום עוד לא הושלם. חוזרים לתשלום של אותה הזמנה.'}
            </p>
            <button type="button" disabled={busy} onClick={() => void recover()} style={{
                minHeight: 44, padding: '10px 24px', borderRadius: 24, border: 0,
                background: '#f0d060', color: '#0d2e0d', font: 'inherit', fontWeight: 800,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.65 : 1,
            }}>
                {busy ? 'בודקים…' : mode === 'verifying' ? 'בדיקת אישור מחדש' : 'המשך לתשלום'}
            </button>
            <p role="status" aria-live="polite" style={{ margin: message ? '12px 0 0' : 0, fontSize: 13, lineHeight: 1.6 }}>
                {message}
            </p>
        </section>
    );
}

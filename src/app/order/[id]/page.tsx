import OrderStatusView from './OrderStatusView';

// This page gets parked in a background tab while the customer waits, so the
// tab needs to say what it is — and it is the title the "order ready" flash
// restores itself to.
export const metadata = { title: 'מעקב הזמנה — BariBali' };

export default async function OrderStatusPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ payment?: string | string[] }>;
}) {
    const { id } = await params;
    const payment = (await searchParams).payment;
    const paymentHint = payment === 'verifying' ? 'verifying' : null;
    return <OrderStatusView id={id} paymentHint={paymentHint} />;
}

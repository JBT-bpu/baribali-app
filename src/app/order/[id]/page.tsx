import OrderStatusView from './OrderStatusView';

// This page gets parked in a background tab while the customer waits, so the
// tab needs to say what it is — and it is the title the "order ready" flash
// restores itself to.
export const metadata = { title: 'מעקב הזמנה — BariBali' };

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrderStatusView id={id} />;
}

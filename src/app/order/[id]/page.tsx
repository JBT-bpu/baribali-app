import OrderStatusView from './OrderStatusView';

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrderStatusView id={id} />;
}

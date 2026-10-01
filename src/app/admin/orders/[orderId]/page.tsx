import OrderDetailClient from "./OrderDetailClient";

export default function OrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <OrderDetailClient orderId={params.orderId} />;
}

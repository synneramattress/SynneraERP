import SupplierDetailClient from "./SupplierDetailClient";

export default function SupplierDetailPage({
  params,
}: {
  params: { supplierId: string };
}) {
  return <SupplierDetailClient supplierId={params.supplierId} />;
}

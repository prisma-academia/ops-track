import { redirect } from "next/navigation";

import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function NewSupplierPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; orderId?: string }>;
}) {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key);

  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.supplierId) query.set("supplierId", params.supplierId);
  if (params.orderId) query.set("orderId", params.orderId);
  const qs = query.toString();

  redirect(`/admin/payments/new/outgoing${qs ? `?${qs}` : ""}`);
}

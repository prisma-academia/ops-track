import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SupplierPaymentView } from "./supplier-payment-view";

export default async function NewSupplierPaymentPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key);
  return <SupplierPaymentView />;
}

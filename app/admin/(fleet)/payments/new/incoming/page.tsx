import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { IncomingPaymentView } from "./incoming-payment-view";

export default async function NewIncomingPaymentPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key);

  return <IncomingPaymentView />;
}

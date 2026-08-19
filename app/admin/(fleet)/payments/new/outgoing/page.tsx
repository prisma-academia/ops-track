import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { OutgoingPaymentView } from "./outgoing-payment-view";

export default async function NewOutgoingPaymentPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key);

  return <OutgoingPaymentView />;
}

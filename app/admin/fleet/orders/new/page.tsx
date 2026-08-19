import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateOrderForm } from "./order-form";

export default async function NewOrderPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  return (
    <div className="space-y-6">
      <CreateOrderForm />
    </div>
  );
}

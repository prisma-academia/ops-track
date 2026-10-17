import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { CreateOrderForm } from "./order-form";

export default async function NewOrderPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_WRITE.key);
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { settingsJson: true },
  });
  const fleetSettings = parseTenantSettings(tenant?.settingsJson).fleet;

  return (
    <div className="space-y-6">
      <CreateOrderForm fleetSettings={fleetSettings} />
    </div>
  );
}

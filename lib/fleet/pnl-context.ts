import type { OrderPnlOptions } from "@/lib/fleet/order-pnl-summary";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { prisma } from "@/lib/db/client";
import { getOrderPnlOptions } from "@/lib/fleet/pnl-options";

export { getOrderPnlOptions, isCompanyPnlLossLog } from "@/lib/fleet/pnl-options";

export async function loadOrderPnlOptionsForTenant(tenantId: string): Promise<OrderPnlOptions> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  return getOrderPnlOptions(parseTenantSettings(tenant?.settingsJson));
}

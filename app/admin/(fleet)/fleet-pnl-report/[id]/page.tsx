import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { OrderPnlDetailsManager } from "./order-pnl-details-manager";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { loadOrderPnlOptionsForTenant } from "@/lib/fleet/pnl-context";
import { parseTenantSettings } from "@/lib/tenant/settings";

export default async function OrderPnlDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);
  const [pnlOptions, tenant] = await Promise.all([
    loadOrderPnlOptionsForTenant(actor.tenantId),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    }),
  ]);
  const fleetSettings = parseTenantSettings(tenant?.settingsJson).fleet;

  const order = await prisma.order.findFirst({
    where: { 
      id: params.id,
      tenantId: actor.tenantId 
    },
    include: {
      supplierRecord: { select: { supplierType: true } },
      transports: {
        include: {
          transporter: { select: { name: true } },
          truck: { select: { id: true, name: true, plateNumber: true } },
          lossLogs: true,
          deliveries: {
            include: {
              customer: { select: { name: true } },
              station: { select: { name: true } },
              transactions: {
                where: { type: "INFLOW" },
                select: { type: true, amount: true },
              },
            },
            orderBy: { createdAt: "desc" }
          },
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const { summary, transports } = calculateOrderPnlSummary(order, pnlOptions);

  const serializedSummary = JSON.parse(JSON.stringify(summary));
  const serializedTransports = JSON.parse(JSON.stringify(transports));

  return (
    <OrderPnlDetailsManager
      summary={serializedSummary}
      transports={serializedTransports}
      fleetSettings={fleetSettings}
    />
  );
}

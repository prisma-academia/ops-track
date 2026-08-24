import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { FleetPnlReportManager } from "./fleet-pnl-report-manager";

export default async function FleetPnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);

  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      transports: {
        include: {
          transporter: { select: { name: true } },
          truck: { select: { id: true, name: true, plateNumber: true } },
          deliveries: {
            include: {
              customer: { select: { name: true } },
              station: { select: { name: true } },
              transactions: {
                where: { type: "INFLOW" },
                select: { type: true, amount: true },
              },
            },
          },
        },
      },
    },
  });

  const orderRows = orders.map((order) => {
    const { summary } = calculateOrderPnlSummary(order);
    return {
      ...summary,
      purchasePricePerLitre: summary.priceBought,
      purchaseCost: summary.priceBought * summary.litersOrdered,
      loadingCost: summary.totalLoadingCost,
    };
  });

  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, plateNumber: true },
    orderBy: { plateNumber: "asc" },
  });

  const serializedOrders = JSON.parse(JSON.stringify(orderRows));
  const serializedTrucks = JSON.parse(JSON.stringify(trucks));

  return (
    <FleetPnlReportManager
      initialOrders={serializedOrders}
      trucks={serializedTrucks}
    />
  );
}

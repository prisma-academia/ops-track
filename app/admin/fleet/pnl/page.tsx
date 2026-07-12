import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PnLTable } from "./table";
import { calculateOrderPnL } from "@/lib/fleet/financials";

export default async function PnLPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pnlSummaries = await Promise.all(
    orders.map(async (o) => {
      const pnl = await calculateOrderPnL(o.id);
      return {
        id: o.id,
        reference: o.reference || "NO REF",
        productType: o.productType,
        litersOrdered: Number(o.litersOrdered),
        date: o.createdAt.toISOString(),
        status: o.status,
        totalRevenue: pnl.totalRevenue,
        totalCosts: pnl.totalCogs + pnl.totalLoadingCost + pnl.totalTransportFeesPaid + pnl.totalTripExpenses + pnl.totalOrderExpenses,
        netProfit: pnl.netProfit,
      };
    })
  );

  return (
    <div>
      <DataTableToolbar
        title="Profit & Loss Overview"
        description="Detailed financial breakdown of your fuel procurement orders."
      />
      <PnLTable data={pnlSummaries} />
    </div>
  );
}

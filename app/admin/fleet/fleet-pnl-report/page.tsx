import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FleetPnlReportManager } from "./fleet-pnl-report-manager";

export default async function FleetPnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  // Fetch orders with their transports and sales to aggregate PnL
  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId },
    include: {
      transports: {
        include: {
          sales: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const unsortedRows = [];
  
  for (const order of orders) {
    const orderCost = (Number(order.litersOrdered) * Number(order.pricePerLitre)) + Number(order.loadingCost);
    
    let totalTransportCost = 0;
    let totalFleetExpenses = 0;
    let totalLossDeduction = 0;
    
    let totalAmountSoldQty = 0;
    let amountSoldRev = 0;
    let amountPaid = 0;

    for (const transport of order.transports) {
      totalFleetExpenses += Number(transport.maintenanceCost || 0);
      totalLossDeduction += Number(transport.totalDeduction || 0);
      
      for (const sale of transport.sales) {
        totalTransportCost += Number(sale.transportCost) || (Number(sale.litersDespatched) * Number(transport.ratePerLiter));
        totalAmountSoldQty += Number(sale.litersDespatched || 0);
        amountSoldRev += Number(sale.totalExpectedAmount || 0);
        amountPaid += Number(sale.paymentReceived || 0);
      }
    }

    const totalCost = orderCost + totalTransportCost + totalFleetExpenses - totalLossDeduction;
    const pnl = amountSoldRev - totalCost;
    const debtRemaining = amountSoldRev - amountPaid;
    const qtyBalance = Number(order.litersOrdered) - totalAmountSoldQty;

    unsortedRows.push({
      id: order.id,
      sn: 0,
      orderDate: order.createdAt.toISOString(),
      orderReference: order.reference || "N/A",
      depot: order.sourceDepot || "N/A",
      productType: order.productType,
      litersOrdered: Number(order.litersOrdered),
      orderCost,
      loadingCost: Number(order.loadingCost),
      priceBought: Number(order.pricePerLitre),
      totalTransportCost,
      totalFleetExpenses,
      totalLossDeduction,
      totalCost,
      totalAmountSoldQty,
      qtyBalance,
      amountSoldRev,
      amountPaid,
      debtRemaining,
      pnl
    });
  }

  // Sort rows ascending for default UI presentation (oldest first)
  unsortedRows.sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  
  const rows = unsortedRows.map((r, index) => ({ ...r, sn: index + 1 }));

  return (
    <FleetPnlReportManager
      initialRows={rows}
    />
  );
}

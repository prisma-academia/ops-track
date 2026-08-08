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
          truck: true,
          driver: true,
          transporter: true
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

    const rowTransports = [];

    for (const transport of order.transports) {
      let trSalesRev = 0;
      let trPaid = 0;
      let trQtySold = 0;
      let trCost = 0;

      for (const sale of transport.sales) {
        const sCost = Number(sale.transportCost) || (Number(sale.litersDespatched) * Number(transport.ratePerLiter));
        trCost += sCost;
        trQtySold += Number(sale.litersDespatched || 0);
        trSalesRev += Number(sale.totalExpectedAmount || 0);
        trPaid += Number(sale.paymentReceived || 0);

        totalTransportCost += sCost;
        totalAmountSoldQty += Number(sale.litersDespatched || 0);
        amountSoldRev += Number(sale.totalExpectedAmount || 0);
        amountPaid += Number(sale.paymentReceived || 0);
      }

      totalFleetExpenses += Number(transport.maintenanceCost || 0);
      totalLossDeduction += Number(transport.totalDeduction || 0);

      rowTransports.push({
        id: transport.id,
        truckNumber: transport.truck?.plateNumber || transport.truck?.name || "Unknown",
        driverName: transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unknown",
        transporterName: transport.transporter?.name || "Unknown",
        ratePerLiter: Number(transport.ratePerLiter || 0),
        maintenanceCost: Number(transport.maintenanceCost || 0),
        totalDeduction: Number(transport.totalDeduction || 0),
        litersCarried: Number(transport.litersCarried || 0),
        litersDelivered: Number(transport.litersDelivered || 0),
        salesCount: transport.sales.length,
        totalTransportCost: trCost,
        amountSoldRev: trSalesRev,
        amountPaid: trPaid
      });
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
      pnl,
      transports: rowTransports
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

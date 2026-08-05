import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FleetPnlReportManager } from "./fleet-pnl-report-manager";

export default async function FleetPnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  // Fetch sales connected to a transport (and thus an order).
  // A fleet PnL is based on the sale of transported products.
  const sales = await prisma.sale.findMany({
    where: { tenantId: actor.tenantId, transportId: { not: null } },
    include: {
      customer: { select: { name: true } },
      station: { select: { name: true } },
      transport: {
        include: {
          transporter: { select: { name: true } },
          truck: { select: { name: true, plateNumber: true } },
          order: {
            select: {
              reference: true,
              productType: true,
              litersOrdered: true,
              pricePerLitre: true,
              loadingCost: true,
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const unsortedRows = [];
  
  for (const sale of sales) {
    if (!sale.transport || !sale.transport.order) continue;

    const transport = sale.transport;
    const order = transport.order;

    // Order Cost = (Liters Ordered * Price Per Liter) + Loading Cost
    const orderCost = (Number(order.litersOrdered) * Number(order.pricePerLitre)) + Number(order.loadingCost);
    
    // Transport Cost
    const transportCost = Number(sale.transportCost) || (Number(sale.litersDespatched) * Number(transport.ratePerLiter));

    const fleetExpenses = Number(transport.maintenanceCost) || 0;
    const lossDeduction = Number(transport.totalDeduction) || 0;

    const totalCost = orderCost + transportCost + fleetExpenses - lossDeduction;

    // Sales Revenue
    const salesRevenue = Number(sale.totalExpectedAmount);

    // Profit & Loss
    const pnl = salesRevenue - totalCost;

    // Balance
    const balance = salesRevenue - Number(sale.paymentReceived);

    unsortedRows.push({
      id: sale.id,
      sn: 0,
      saleDate: sale.createdAt.toISOString(),
      orderReference: order.reference || "N/A",
      productType: order.productType,
      litersOrdered: Number(order.litersOrdered),
      orderCost,
      loadingCost: Number(order.loadingCost),
      priceBought: Number(order.pricePerLitre),
      transporterName: transport.transporter.name,
      truckNo: transport.truck.plateNumber || transport.truck.name,
      transportRate: Number(transport.ratePerLiter),
      transportCost,
      fleetExpenses,
      lossDeduction,
      totalCost,
      soldTo: sale.customer?.name || sale.station?.name || "Unknown",
      litersSold: Number(sale.litersDespatched),
      sellingPrice: Number(sale.amountPerLiter),
      salesRevenue,
      paymentReceived: Number(sale.paymentReceived),
      balance,
      paymentStatus: sale.status,
      pnl
    });
  }

  // Sort rows ascending for default UI presentation (oldest first)
  unsortedRows.sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
  
  const rows = unsortedRows.map((r, index) => ({ ...r, sn: index + 1 }));

  return (
    <FleetPnlReportManager
      initialRows={rows}
    />
  );
}

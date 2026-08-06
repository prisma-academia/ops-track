import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { OrderPnlDetailsManager } from "./order-pnl-details-manager";

export default async function OrderPnlDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const order = await prisma.order.findFirst({
    where: { 
      id: params.id,
      tenantId: actor.tenantId 
    },
    include: {
      transports: {
        include: {
          transporter: { select: { name: true } },
          truck: { select: { name: true, plateNumber: true } },
          sales: {
            include: {
              customer: { select: { name: true } },
              station: { select: { name: true } }
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

  // Pre-calculate aggregate data for the client component
  const orderCost = (Number(order.litersOrdered) * Number(order.pricePerLitre)) + Number(order.loadingCost);
  
  let totalTransportCost = 0;
  let totalFleetExpenses = 0;
  let totalLossDeduction = 0;
  
  let totalAmountSoldQty = 0;
  let amountSoldRev = 0;
  let amountPaid = 0;

  const transportsData = order.transports.map(transport => {
    const fleetExpenses = Number(transport.maintenanceCost || 0);
    const lossDeduction = Number(transport.totalDeduction || 0);
    
    totalFleetExpenses += fleetExpenses;
    totalLossDeduction += lossDeduction;

    let transportTotalQty = 0;
    let transportTotalRev = 0;
    let transportTotalPaid = 0;
    let transportTotalCost = 0;

    const salesData = transport.sales.map(sale => {
      const saleTransportCost = Number(sale.transportCost) || (Number(sale.litersDespatched) * Number(transport.ratePerLiter));
      const saleQty = Number(sale.litersDespatched || 0);
      const saleRev = Number(sale.totalExpectedAmount || 0);
      const salePaid = Number(sale.paymentReceived || 0);

      transportTotalQty += saleQty;
      transportTotalRev += saleRev;
      transportTotalPaid += salePaid;
      transportTotalCost += saleTransportCost;

      return {
        id: sale.id,
        soldTo: sale.customer?.name || sale.station?.name || "Unknown",
        litersSold: saleQty,
        sellingPrice: Number(sale.amountPerLiter || 0),
        transportCost: saleTransportCost,
        salesRevenue: saleRev,
        paymentReceived: salePaid,
        debtRemaining: saleRev - salePaid,
        paymentStatus: sale.status,
        createdAt: sale.createdAt.toISOString()
      };
    });

    totalTransportCost += transportTotalCost;
    totalAmountSoldQty += transportTotalQty;
    amountSoldRev += transportTotalRev;
    amountPaid += transportTotalPaid;

    return {
      id: transport.id,
      transporterName: transport.transporter?.name || "Unknown",
      truckNo: transport.truck?.plateNumber || transport.truck?.name || "Unknown",
      ratePerLiter: Number(transport.ratePerLiter || 0),
      fleetExpenses,
      lossDeduction,
      transportTotalQty,
      transportTotalRev,
      transportTotalPaid,
      transportTotalCost,
      sales: salesData
    };
  });

  const totalCost = orderCost + totalTransportCost + totalFleetExpenses - totalLossDeduction;
  const pnl = amountSoldRev - totalCost;
  const debtRemaining = amountSoldRev - amountPaid;
  const qtyBalance = Number(order.litersOrdered) - totalAmountSoldQty;

  const summary = {
    id: order.id,
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
  };

  return (
    <OrderPnlDetailsManager
      summary={summary}
      transports={transportsData}
    />
  );
}

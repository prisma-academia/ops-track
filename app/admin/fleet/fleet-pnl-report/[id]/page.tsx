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
          deliveries: {
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

  let totalOrderLossLiters = 0;
  let totalOrderLossAmount = 0;

  const transportsData = order.transports.map(transport => {
    const fleetExpenses = Number(transport.maintenanceCost || 0);
    let transportStationLossAmount = 0;

    let transportTotalQty = 0;
    let transportTotalRev = 0;
    let transportTotalPaid = 0;
    let transportTotalCost = 0;

    const salesData = transport.deliveries.map(delivery => {
      const saleTransportCost = Number(delivery.transportCost) || (Number(delivery.litersDespatched) * Number(transport.ratePerLiter));
      const clientTransportFee = delivery.transportCostBorneBy === "CLIENT" ? Number(delivery.transportCost || 0) : 0;
      const saleQty = Number(delivery.litersDespatched || 0);
      const sellingPrice = Number(delivery.amountPerLiter || 0);
      const litersReceived = delivery.litersReceived !== null && delivery.litersReceived !== undefined
        ? Number(delivery.litersReceived)
        : null;
      
      const saleLossLiters = litersReceived !== null ? Math.max(0, saleQty - litersReceived) : 0;
      const saleLossAmount = saleLossLiters * sellingPrice;

      totalOrderLossLiters += saleLossLiters;
      totalOrderLossAmount += saleLossAmount;
      transportStationLossAmount += saleLossAmount;

      const saleRev = Number(delivery.totalExpectedAmount || 0) + clientTransportFee;
      const salePaid = Number(delivery.paymentReceived || 0);

      transportTotalQty += saleQty;
      transportTotalRev += saleRev;
      transportTotalPaid += salePaid;
      transportTotalCost += saleTransportCost;

      return {
        id: delivery.id,
        soldTo: delivery.customer?.name || delivery.station?.name || "Unknown",
        litersSold: saleQty,
        litersReceived,
        lossLiters: saleLossLiters,
        sellingPrice,
        transportCost: saleTransportCost,
        salesRevenue: saleRev,
        paymentReceived: salePaid,
        debtRemaining: saleRev - salePaid,
        paymentStatus: delivery.status,
        createdAt: delivery.createdAt.toISOString()
      };
    });

    const dbLossDeduction = Math.max(0, Number(transport.totalDeduction || 0) - fleetExpenses);
    const lossDeduction = Math.max(dbLossDeduction, transportStationLossAmount);
    
    totalFleetExpenses += fleetExpenses;
    totalLossDeduction += lossDeduction;

    const transportLitersLost = Number(transport.litersLost || 0);
    if (transportLitersLost > 0 && transport.deliveries.length === 0) {
      totalOrderLossLiters += transportLitersLost;
    }

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
      deliveries: salesData
    };
  });

  const totalCost = orderCost + totalTransportCost + totalFleetExpenses - totalLossDeduction;
  const pnl = amountSoldRev - totalCost;
  const debtRemaining = amountSoldRev - amountPaid;
  const qtyBalance = Number(order.litersOrdered) - totalAmountSoldQty;
  const effectiveLossLiters = totalOrderLossLiters > 0 ? totalOrderLossLiters : Math.max(0, qtyBalance);

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
    totalLitersLost: effectiveLossLiters,
    totalLossAmount: totalOrderLossAmount,
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


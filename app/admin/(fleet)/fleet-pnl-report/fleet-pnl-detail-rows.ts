import type { FleetPnlTableRow } from "./fleet-pnl-columns";
import type {
  OrderPnlDeliveryRow,
  OrderPnlSummary,
  OrderPnlTransportRow,
} from "@/lib/fleet/order-pnl-summary";

type SummaryContext = Pick<
  OrderPnlSummary,
  "orderDate" | "depot" | "productType" | "priceBought" | "loadingCostPerLitre"
>;

export function toFleetPnlDetailRow(
  delivery: OrderPnlDeliveryRow,
  summary: SummaryContext,
  transport?: Pick<OrderPnlTransportRow, "id" | "truckId" | "truckNo" | "transporterName">
): FleetPnlTableRow {
  const truckLabels =
    transport?.truckNo && transport.truckNo !== "Unknown" ? [transport.truckNo] : [];
  const truckIds = transport?.truckId ? [transport.truckId] : [];

  return {
    id: delivery.id,
    orderDate: delivery.createdAt,
    orderReference: delivery.soldTo,
    depot: summary.depot,
    productType: summary.productType,
    litersOrdered: delivery.litersSold,
    litersDespatched: delivery.litersSold,
    litersReceived: delivery.litersReceived ?? null,
    purchaseCost: delivery.purchaseCost,
    purchasePricePerLitre: summary.priceBought,
    loadingCost: delivery.loadingCost,
    loadingCostPerLitre: summary.loadingCostPerLitre,
    sellingPrice: delivery.sellingPrice,
    orderCost: delivery.orderCost,
    depotToPrimaryCost: delivery.depotToPrimaryCost,
    deliveryTransportCost: delivery.deliveryTransportCost,
    totalTransportCost: delivery.transportCost,
    totalFleetExpenses: delivery.fleetCost,
    totalLossDeduction: delivery.lossAmount ?? 0,
    totalCost: delivery.totalCost,
    totalAmountSoldQty: delivery.litersReceived ?? delivery.litersSold,
    amountSoldRev: delivery.salesRevenue,
    amountPaid: delivery.paymentReceived,
    debtRemaining: delivery.debtRemaining,
    pnl: delivery.pnl,
    truckIds,
    truckLabels,
  };
}

export function buildFleetPnlDetailRows(
  summary: SummaryContext,
  transports: OrderPnlTransportRow[]
): FleetPnlTableRow[] {
  return transports.flatMap((transport): FleetPnlTableRow[] => {
    const truckLabels =
      transport.truckNo && transport.truckNo !== "Unknown" ? [transport.truckNo] : [];
    const truckIds = transport.truckId ? [transport.truckId] : [];

    if (transport.deliveries.length === 0) {
      const totalCost =
        transport.depotToPrimaryCost +
        transport.deliveryTransportCost +
        transport.fleetExpenses;
      return [
        {
          id: transport.id,
          orderDate: summary.orderDate,
          orderReference: transport.transporterName,
          depot: summary.depot,
          productType: summary.productType,
          litersOrdered: transport.litersCarried,
          litersDespatched: transport.litersCarried,
          litersReceived: null,
          purchaseCost: 0,
          purchasePricePerLitre: summary.priceBought,
          loadingCost: 0,
          loadingCostPerLitre: summary.loadingCostPerLitre,
          sellingPrice: 0,
          orderCost: 0,
          depotToPrimaryCost: transport.depotToPrimaryCost,
          deliveryTransportCost: transport.deliveryTransportCost,
          totalTransportCost: transport.transportTotalCost,
          totalFleetExpenses: transport.fleetExpenses,
          totalLossDeduction: transport.lossDeduction,
          totalCost,
          totalAmountSoldQty: 0,
          amountSoldRev: 0,
          amountPaid: 0,
          debtRemaining: 0,
          pnl: -totalCost,
          truckIds,
          truckLabels,
        },
      ];
    }

    return transport.deliveries.map((delivery) =>
      toFleetPnlDetailRow(delivery, summary, transport)
    );
  });
}

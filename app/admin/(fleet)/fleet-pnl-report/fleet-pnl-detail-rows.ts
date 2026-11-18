import type { FleetPnlTableRow } from "./fleet-pnl-columns";
import type {
  OrderPnlDeliveryRow,
  OrderPnlSummary,
  OrderPnlTransportRow,
} from "@/lib/fleet/order-pnl-summary";
import { getLossTypeLabel } from "@/lib/fleet/loss-types";
import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import { defaultFleetSettings } from "@/lib/fleet/fleet-settings";
import { companyLossAmountFromLog, toNum } from "@/lib/fleet/loss-attribution";
import { isCompanyPnlLossLog } from "@/lib/fleet/pnl-options";

type SummaryContext = Pick<
  OrderPnlSummary,
  | "id"
  | "orderDate"
  | "depot"
  | "productType"
  | "priceBought"
  | "loadingCostPerLitre"
  | "litersOrdered"
  | "totalAmountSoldQty"
  | "amountSoldRev"
  | "totalCost"
  | "pnl"
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
  transports: OrderPnlTransportRow[],
  fleet: FleetSettings = defaultFleetSettings()
): FleetPnlTableRow[] {
  const useAttribution = fleet.useAttributionPnL;
  const orderRates = {
    pricePerLitre: summary.priceBought,
    loadingCostPerLitre: summary.loadingCostPerLitre,
  };

  const rows = transports.flatMap((transport): FleetPnlTableRow[] => {
    const truckLabels =
      transport.truckNo && transport.truckNo !== "Unknown" ? [transport.truckNo] : [];
    const truckIds = transport.truckId ? [transport.truckId] : [];

    const deliveryRows = transport.deliveries.map((delivery) =>
      toFleetPnlDetailRow(delivery, summary, transport)
    );

    const lossRows: FleetPnlTableRow[] = (transport.incidentLossLogs ?? [])
      .filter((log) => !useAttribution || isCompanyPnlLossLog(log, fleet))
      .map((log) => {
      const qty = toNum(log.lostQuantity);
      const expenses = toNum(log.expensesIncurred);
      const tCost = useAttribution
        ? companyLossAmountFromLog(log, orderRates)
        : qty * summary.priceBought + qty * summary.loadingCostPerLitre + expenses;
      const pCost = qty * summary.priceBought;
      const lCost = qty * summary.loadingCostPerLitre;
      const lossTypeLabel = getLossTypeLabel(log.lossType);

      return {
        id: `loss-${log.id}`,
        orderDate: log.createdAt ? new Date(log.createdAt).toISOString() : summary.orderDate,
        orderReference: `Loss: ${lossTypeLabel}${log.comment ? ` (${log.comment})` : ""}`,
        depot: summary.depot,
        productType: summary.productType,
        litersOrdered: qty,
        litersDespatched: qty,
        litersReceived: 0,
        purchaseCost: pCost,
        purchasePricePerLitre: summary.priceBought,
        loadingCost: lCost,
        loadingCostPerLitre: summary.loadingCostPerLitre,
        sellingPrice: 0,
        orderCost: pCost + lCost,
        depotToPrimaryCost: 0,
        deliveryTransportCost: 0,
        totalTransportCost: 0,
        totalFleetExpenses: expenses,
        totalLossDeduction: tCost,
        totalCost: tCost,
        totalAmountSoldQty: 0,
        amountSoldRev: 0,
        amountPaid: 0,
        debtRemaining: 0,
        pnl: -tCost,
        truckIds,
        truckLabels,
      };
    });

    if (
      !useAttribution &&
      lossRows.length === 0 &&
      (transport.incidentLossLiters ?? 0) > 0
    ) {
      const qty = transport.incidentLossLiters;
      const pCost = qty * summary.priceBought;
      const lCost = qty * summary.loadingCostPerLitre;
      const tCost = pCost + lCost;
      lossRows.push({
        id: `loss-transport-${transport.id}`,
        orderDate: summary.orderDate,
        orderReference: `Transit Loss (${transport.transporterName || transport.truckNo})`,
        depot: summary.depot,
        productType: summary.productType,
        litersOrdered: qty,
        litersDespatched: qty,
        litersReceived: 0,
        purchaseCost: pCost,
        purchasePricePerLitre: summary.priceBought,
        loadingCost: lCost,
        loadingCostPerLitre: summary.loadingCostPerLitre,
        sellingPrice: 0,
        orderCost: pCost + lCost,
        depotToPrimaryCost: 0,
        deliveryTransportCost: 0,
        totalTransportCost: 0,
        totalFleetExpenses: 0,
        totalLossDeduction: transport.incidentLossAmount || pCost,
        totalCost: tCost,
        totalAmountSoldQty: 0,
        amountSoldRev: 0,
        amountPaid: 0,
        debtRemaining: 0,
        pnl: -tCost,
        truckIds,
        truckLabels,
      });
    }

    if (transport.deliveries.length === 0) {
      if (lossRows.length > 0) return lossRows;
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

    return [...deliveryRows, ...lossRows];
  });

  if (useAttribution) return rows;

  const linePnl = rows.reduce((sum, row) => sum + row.pnl, 0);
  const remainderPnl = summary.pnl - linePnl;
  if (Math.abs(remainderPnl) < 0.005) return rows;

  const qtyBalance = Math.max(0, summary.litersOrdered - summary.totalAmountSoldQty);
  const purchaseCost = qtyBalance * summary.priceBought;
  const loadingCost = qtyBalance * summary.loadingCostPerLitre;
  const unsoldOrderCost = purchaseCost + loadingCost;
  const remainderCost = Math.max(0, summary.totalCost - rows.reduce((s, r) => s + r.totalCost, 0));

  return [
    ...rows,
    {
      id: `remainder-${summary.id}`,
      orderDate: summary.orderDate,
      orderReference: "Remaining order cost",
      depot: summary.depot,
      productType: summary.productType,
      litersOrdered: qtyBalance,
      litersDespatched: qtyBalance,
      litersReceived: null,
      purchaseCost,
      purchasePricePerLitre: summary.priceBought,
      loadingCost,
      loadingCostPerLitre: summary.loadingCostPerLitre,
      sellingPrice: 0,
      orderCost: unsoldOrderCost,
      depotToPrimaryCost: 0,
      deliveryTransportCost: 0,
      totalTransportCost: 0,
      totalFleetExpenses: 0,
      totalLossDeduction: 0,
      totalCost: remainderCost > 0 ? remainderCost : unsoldOrderCost,
      totalAmountSoldQty: 0,
      amountSoldRev: 0,
      amountPaid: 0,
      debtRemaining: 0,
      pnl: remainderPnl,
      truckIds: [],
      truckLabels: [],
    },
  ];
}

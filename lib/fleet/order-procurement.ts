import type { SupplierType } from "@/lib/generated/prisma/client";
import { landedCostPerLiter } from "@/lib/fleet/loss-attribution";
import { sumOrderLitersReceived } from "@/lib/fleet/order-payables";

export function isOrderTripsFinalized(
  transports: Array<{ status?: string }>,
): boolean {
  const active = transports.filter((t) => t.status !== "CANCELLED");
  if (active.length === 0) return false;
  return active.every((t) => t.status === "COMPLETED" || t.status === "LOSS");
}

export function getOrderProcurementDisplay(args: {
  litersOrdered: number;
  pricePerLitre: number;
  loadingCostPerLitre: number;
  supplierShortageLiters?: number | null;
  supplierType?: SupplierType | null;
  transports: Array<{ status?: string; deliveries?: Array<{ litersReceived?: unknown }> }>;
}) {
  const litersOrdered = Number(args.litersOrdered);
  const pricePerLitre = Number(args.pricePerLitre);
  const loadingCostPerLitre = Number(args.loadingCostPerLitre);
  const shortageLiters = Number(args.supplierShortageLiters ?? 0);
  const supplierType = args.supplierType ?? null;
  const tripsFinalized = isOrderTripsFinalized(args.transports);
  const received = sumOrderLitersReceived({
    litersOrdered,
    transports: args.transports,
  });

  const useReceivedForTotals =
    tripsFinalized && supplierType === "LOCAL" && received.hasReceipt;
  const basisLiters = useReceivedForTotals ? received.liters : litersOrdered;

  const totalProductCost = pricePerLitre * basisLiters;
  const totalLoadingCost = loadingCostPerLitre * basisLiters;
  const totalProcurementCost = totalProductCost + totalLoadingCost;

  const rate = landedCostPerLiter({ pricePerLitre, loadingCostPerLitre });
  const shortageAmount =
    shortageLiters > 0 && supplierType === "LOCAL" ? shortageLiters * rate : 0;

  return {
    tripsFinalized,
    receivedLiters: received.liters,
    hasReceipt: received.hasReceipt,
    useReceivedForTotals,
    basisLiters,
    totalProductCost,
    totalLoadingCost,
    totalProcurementCost,
    shortageLiters,
    shortageAmount,
    supplierType,
  };
}
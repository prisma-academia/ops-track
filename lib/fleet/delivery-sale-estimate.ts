export type DeliverySaleEstimateInput = {
  liters: number;
  sellingPricePerLiter: number;
  orderPricePerLiter: number;
  orderLoadingPerLiter: number;
  /** Transport haulage rate on the trip (depot → primary). */
  tripRatePerLiter: number;
  /** Per-litre delivery / sub-haul charge for this allocation. */
  deliveryTransportPerLiter: number;
  transportCostBorneBy: "CLIENT" | "COMPANY";
};

export type DeliverySaleEstimate = {
  revenue: number;
  productCost: number;
  loadingCost: number;
  tripHaulageCost: number;
  deliveryTransportCost: number;
  companyTransportCost: number;
  clientTransportBilled: number;
  totalLandedCost: number;
  grossProfit: number;
  marginPercent: number;
  marginPerLiter: number;
};

/** Mirrors fleet P&L delivery row logic for a not-yet-saved distribution. */
export function estimateDeliverySalePnl(input: DeliverySaleEstimateInput): DeliverySaleEstimate | null {
  const liters = Number(input.liters) || 0;
  if (liters <= 0) return null;

  const selling = Number(input.sellingPricePerLiter) || 0;
  const orderPrice = Number(input.orderPricePerLiter) || 0;
  const orderLoading = Number(input.orderLoadingPerLiter) || 0;
  const tripRate = Number(input.tripRatePerLiter) || 0;
  const deliveryRate = Number(input.deliveryTransportPerLiter) || 0;

  const revenue = liters * selling;
  const productCost = liters * orderPrice;
  const loadingCost = liters * orderLoading;
  const tripHaulageCost = liters * tripRate;
  const deliveryTransportCost = liters * deliveryRate;
  const companyTransportCost =
    input.transportCostBorneBy === "COMPANY" ? deliveryTransportCost : 0;
  const clientTransportBilled =
    input.transportCostBorneBy === "CLIENT" ? deliveryTransportCost : 0;

  const totalLandedCost = productCost + loadingCost + tripHaulageCost + companyTransportCost;
  const grossProfit = revenue - totalLandedCost;
  const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const marginPerLiter = grossProfit / liters;

  return {
    revenue,
    productCost,
    loadingCost,
    tripHaulageCost,
    deliveryTransportCost,
    companyTransportCost,
    clientTransportBilled,
    totalLandedCost,
    grossProfit,
    marginPercent,
    marginPerLiter,
  };
}

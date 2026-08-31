type Numeric = number | string | { toString(): string } | null | undefined;

function toNum(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

export type OrderPnlDeliveryTransaction = {
  type: string;
  amount: Numeric;
};

export type OrderPnlDelivery = {
  id: string;
  litersDespatched: Numeric;
  litersReceived?: Numeric;
  amountPerLiter: Numeric;
  totalExpectedAmount: Numeric;
  paymentReceived: Numeric;
  transportRate?: Numeric;
  transportCost?: Numeric;
  transportCostBorneBy?: string | null;
  status: string;
  createdAt: Date | string;
  customer?: { name: string | null } | null;
  station?: { name: string | null } | null;
  transactions?: OrderPnlDeliveryTransaction[];
};

function resolveDeliveryPaymentReceived(delivery: OrderPnlDelivery): number {
  const fromField = toNum(delivery.paymentReceived);
  const fromTransactions = (delivery.transactions ?? [])
    .filter((transaction) => transaction.type === "INFLOW")
    .reduce((sum, transaction) => sum + toNum(transaction.amount), 0);

  return Math.max(fromField, fromTransactions);
}

export type OrderPnlTransport = {
  id: string;
  ratePerLiter: Numeric;
  litersCarried?: Numeric;
  maintenanceCost?: Numeric;
  totalDeduction?: Numeric;
  litersLost?: Numeric;
  transporter?: { name: string | null } | null;
  truck?: { name: string | null; plateNumber: string | null; id?: string } | null;
  deliveries: OrderPnlDelivery[];
};

export type OrderPnlOrder = {
  id: string;
  reference: string | null;
  sourceDepot: string | null;
  productType: string;
  litersOrdered: Numeric;
  pricePerLitre: Numeric;
  loadingCostPerLitre: Numeric;
  createdAt: Date | string;
  transports: OrderPnlTransport[];
};

export type OrderPnlDeliveryRow = {
  id: string;
  soldTo: string;
  litersSold: number;
  litersReceived: number | null;
  lossLiters: number;
  lossAmount: number;
  sellingPrice: number;
  purchaseCost: number;
  loadingCost: number;
  orderCost: number;
  depotToPrimaryCost: number;
  deliveryTransportCost: number;
  transportCost: number;
  fleetCost: number;
  totalCost: number;
  salesRevenue: number;
  paymentReceived: number;
  debtRemaining: number;
  pnl: number;
  paymentStatus: string;
  createdAt: string;
};

export type OrderPnlTransportRow = {
  id: string;
  transporterName: string;
  truckNo: string;
  truckId?: string | null;
  ratePerLiter: number;
  litersCarried: number;
  fleetExpenses: number;
  lossDeduction: number;
  transportTotalQty: number;
  transportTotalRev: number;
  transportTotalPaid: number;
  depotToPrimaryCost: number;
  deliveryTransportCost: number;
  transportTotalCost: number;
  deliveries: OrderPnlDeliveryRow[];
};

export type OrderPnlSummary = {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  loadingCostPerLitre: number;
  totalLoadingCost: number;
  priceBought: number;
  totalDepotToPrimaryCost: number;
  totalDeliveryTransportCost: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalLossDeduction: number;
  totalCost: number;
  totalAmountSoldQty: number;
  qtyBalance: number;
  totalLitersLost: number;
  totalLossAmount: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
  truckIds: string[];
  truckLabels: string[];
};

export type OrderPnlResult = {
  summary: OrderPnlSummary;
  transports: OrderPnlTransportRow[];
};

/**
 * Computes an order's full profit & loss breakdown.
 *
 * Order / transport totals (company P&L):
 *  1. Purchase: pricePerLitre × liters ordered
 *  2. Loading:  loadingCostPerLitre × liters ordered
 *  3. Transport: depot → primary (ratePerLiter × liters carried) plus any
 *     primary → subsequent delivery fee; always a company cost
 *  4. Fleet:    full transport maintenance
 *
 * Delivery rows are scoped to litres despatched on that delivery only:
 *  purchase / loading / depot→primary = qty × per-litre rates
 *  fleet = (qty / liters carried) × maintenance (fallback: trip despatched qty)
 *
 * Total cost = purchase + loading + depot→primary + delivery transport + fleet.
 * Profit/Loss = sales revenue − total cost.
 * Shortage is shown separately and is not subtracted from total cost (revenue
 * is already based on received volume).
 */
export function calculateOrderPnlSummary(order: OrderPnlOrder): OrderPnlResult {
  const litersOrdered = toNum(order.litersOrdered);
  const pricePerLitre = toNum(order.pricePerLitre);
  const loadingCostPerLitre = toNum(order.loadingCostPerLitre);
  const totalLoadingCost = loadingCostPerLitre * litersOrdered;
  const purchaseCost = litersOrdered * pricePerLitre;
  const orderCost = purchaseCost + totalLoadingCost;

  let totalDepotToPrimaryCost = 0;
  let totalDeliveryTransportCost = 0;
  let totalTransportCost = 0;
  let totalFleetExpenses = 0;
  let totalLossDeduction = 0;

  let totalAmountSoldQty = 0;
  let amountSoldRev = 0;
  let amountPaid = 0;

  let totalOrderLossLiters = 0;
  let totalOrderLossAmount = 0;

  const truckIds = new Set<string>();
  const truckLabels = new Set<string>();

  const transportsData: OrderPnlTransportRow[] = order.transports.map((transport) => {
    const fleetExpenses = toNum(transport.maintenanceCost);
    const ratePerLiter = toNum(transport.ratePerLiter);
    const litersCarried = toNum(transport.litersCarried);
    let transportStationLossAmount = 0;

    let transportTotalQty = 0;
    let transportTotalRev = 0;
    let transportTotalPaid = 0;
    let allocatedDeliveryTransport = 0;

    if (transport.truck?.id) truckIds.add(transport.truck.id);
    const truckLabel = transport.truck?.plateNumber || transport.truck?.name;
    if (truckLabel) truckLabels.add(truckLabel);

    const deliveryVolumes = transport.deliveries.map((delivery) => toNum(delivery.litersDespatched));
    const distributedQty = deliveryVolumes.reduce((sum, qty) => sum + qty, 0);
    const depotToPrimaryVolume = litersCarried > 0 ? litersCarried : distributedQty;
    const depotToPrimaryCost = ratePerLiter * depotToPrimaryVolume;
    const fleetBase = litersCarried > 0 ? litersCarried : distributedQty;

    const deliveriesData: OrderPnlDeliveryRow[] = transport.deliveries.map((delivery, index) => {
      const saleQty = deliveryVolumes[index] ?? 0;
      const depotToPrimaryShare = saleQty * ratePerLiter;
      const subsequentRate = toNum(delivery.transportRate);
      const subsequentCost =
        toNum(delivery.transportCost) || (subsequentRate > 0 ? saleQty * subsequentRate : 0);
      // Company always bears depot → primary plus any onward delivery transport.
      const saleTransportCost = depotToPrimaryShare + subsequentCost;
      const fleetShare = fleetBase > 0 ? (saleQty / fleetBase) * fleetExpenses : 0;

      const sellingPrice = toNum(delivery.amountPerLiter);
      const litersReceived =
        delivery.litersReceived !== null && delivery.litersReceived !== undefined
          ? toNum(delivery.litersReceived)
          : null;

      // Only count loss when received volume is explicitly logged and is less than despatched.
      const saleLossLiters =
        litersReceived !== null && saleQty > litersReceived ? saleQty - litersReceived : 0;
      const saleLossAmount = saleLossLiters * sellingPrice;

      const salePurchase = saleQty * pricePerLitre;
      const saleLoading = saleQty * loadingCostPerLitre;
      const saleOrderCost = salePurchase + saleLoading;
      const saleTotalCost =
        salePurchase + saleLoading + depotToPrimaryShare + subsequentCost + fleetShare;

      totalOrderLossLiters += saleLossLiters;
      totalOrderLossAmount += saleLossAmount;
      transportStationLossAmount += saleLossAmount;

      const saleRev = toNum(delivery.totalExpectedAmount);
      const salePaid = resolveDeliveryPaymentReceived(delivery);
      const clientTransportFee =
        delivery.transportCostBorneBy === "CLIENT"
          ? toNum(delivery.transportCost) || saleQty * toNum(delivery.transportRate)
          : 0;
      const billedAmount = saleRev + clientTransportFee;
      const salePnl = saleRev - saleTotalCost;

      transportTotalQty += saleQty;
      transportTotalRev += saleRev;
      transportTotalPaid += salePaid;
      allocatedDeliveryTransport += subsequentCost;

      return {
        id: delivery.id,
        soldTo: delivery.customer?.name || delivery.station?.name || "Unknown",
        litersSold: saleQty,
        litersReceived,
        lossLiters: saleLossLiters,
        lossAmount: saleLossAmount,
        sellingPrice,
        purchaseCost: salePurchase,
        loadingCost: saleLoading,
        orderCost: saleOrderCost,
        depotToPrimaryCost: depotToPrimaryShare,
        deliveryTransportCost: subsequentCost,
        transportCost: saleTransportCost,
        fleetCost: fleetShare,
        totalCost: saleTotalCost,
        salesRevenue: saleRev,
        paymentReceived: salePaid,
        debtRemaining: billedAmount - salePaid,
        pnl: salePnl,
        paymentStatus: delivery.status,
        createdAt: new Date(delivery.createdAt).toISOString(),
      };
    });

    let lossDeduction = transportStationLossAmount;

    const transportLitersLost = toNum(transport.litersLost);
    if (lossDeduction === 0 && transport.deliveries.length === 0 && transportLitersLost > 0) {
      lossDeduction = transportLitersLost * pricePerLitre;
    }

    const transportDepotToPrimaryCost = depotToPrimaryCost;
    const transportTotalCost = depotToPrimaryCost + allocatedDeliveryTransport;

    totalFleetExpenses += fleetExpenses;
    totalLossDeduction += lossDeduction;

    if (transportLitersLost > 0 && transport.deliveries.length === 0) {
      totalOrderLossLiters += transportLitersLost;
    }

    totalDepotToPrimaryCost += transportDepotToPrimaryCost;
    totalDeliveryTransportCost += allocatedDeliveryTransport;
    totalTransportCost += transportTotalCost;
    totalAmountSoldQty += transportTotalQty;
    amountSoldRev += transportTotalRev;
    amountPaid += transportTotalPaid;

    return {
      id: transport.id,
      transporterName: transport.transporter?.name || "Unknown",
      truckNo: transport.truck?.plateNumber || transport.truck?.name || "Unknown",
      truckId: transport.truck?.id ?? null,
      ratePerLiter,
      litersCarried,
      fleetExpenses,
      lossDeduction,
      transportTotalQty,
      transportTotalRev,
      transportTotalPaid,
      depotToPrimaryCost: transportDepotToPrimaryCost,
      deliveryTransportCost: allocatedDeliveryTransport,
      transportTotalCost,
      deliveries: deliveriesData,
    };
  });

  const totalCost =
    purchaseCost +
    totalLoadingCost +
    totalDepotToPrimaryCost +
    totalDeliveryTransportCost +
    totalFleetExpenses;
  const pnl = amountSoldRev - totalCost;
  const debtRemaining = transportsData.reduce(
    (sum, transport) =>
      sum + transport.deliveries.reduce((dSum, delivery) => dSum + delivery.debtRemaining, 0),
    0
  );
  const qtyBalance = litersOrdered - totalAmountSoldQty;
  const effectiveLossLiters = totalOrderLossLiters > 0 ? totalOrderLossLiters : Math.max(0, qtyBalance);

  const summary: OrderPnlSummary = {
    id: order.id,
    orderDate: new Date(order.createdAt).toISOString(),
    orderReference: order.reference || "N/A",
    depot: order.sourceDepot || "N/A",
    productType: order.productType,
    litersOrdered,
    orderCost,
    loadingCostPerLitre,
    totalLoadingCost,
    priceBought: pricePerLitre,
    totalDepotToPrimaryCost,
    totalDeliveryTransportCost,
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
    pnl,
    truckIds: Array.from(truckIds),
    truckLabels: Array.from(truckLabels),
  };

  return { summary, transports: transportsData };
}

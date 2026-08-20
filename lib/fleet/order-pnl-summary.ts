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
  sellingPrice: number;
  transportCost: number;
  salesRevenue: number;
  paymentReceived: number;
  debtRemaining: number;
  paymentStatus: string;
  createdAt: string;
};

export type OrderPnlTransportRow = {
  id: string;
  transporterName: string;
  truckNo: string;
  truckId?: string | null;
  ratePerLiter: number;
  fleetExpenses: number;
  lossDeduction: number;
  transportTotalQty: number;
  transportTotalRev: number;
  transportTotalPaid: number;
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
 * Computes an order's full profit & loss breakdown (cost of goods, loading cost,
 * company-borne transport cost, fleet expenses, loss deductions vs. product revenue).
 * Client-borne transport is excluded from both revenue and expense.
 * Shared between the P&L list (aggregate row per order) and the order detail page
 * (per-transport / per-delivery breakdown) so the numbers never drift apart.
 */
export function calculateOrderPnlSummary(order: OrderPnlOrder): OrderPnlResult {
  const litersOrdered = toNum(order.litersOrdered);
  const pricePerLitre = toNum(order.pricePerLitre);
  const loadingCostPerLitre = toNum(order.loadingCostPerLitre);
  const totalLoadingCost = loadingCostPerLitre * litersOrdered;
  const orderCost = litersOrdered * pricePerLitre + totalLoadingCost;

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
    let transportStationLossAmount = 0;

    let transportTotalQty = 0;
    let transportTotalRev = 0;
    let transportTotalPaid = 0;
    let transportTotalCost = 0;

    if (transport.truck?.id) truckIds.add(transport.truck.id);
    const truckLabel = transport.truck?.plateNumber || transport.truck?.name;
    if (truckLabel) truckLabels.add(truckLabel);

    const deliveriesData: OrderPnlDeliveryRow[] = transport.deliveries.map((delivery) => {
      const rawTransportCost =
        toNum(delivery.transportCost) || toNum(delivery.litersDespatched) * toNum(transport.ratePerLiter);
      const clientTransportFee =
        delivery.transportCostBorneBy === "CLIENT" ? toNum(delivery.transportCost) : 0;
      const saleTransportCost =
        delivery.transportCostBorneBy === "COMPANY" ? rawTransportCost : 0;
      const saleQty = toNum(delivery.litersDespatched);
      const sellingPrice = toNum(delivery.amountPerLiter);
      const litersReceived =
        delivery.litersReceived !== null && delivery.litersReceived !== undefined
          ? toNum(delivery.litersReceived)
          : null;

      // Only count loss when received volume is explicitly logged and is less than despatched.
      // If not logged (null), revenue is billed on full despatch — no separate loss to deduct.
      const saleLossLiters =
        litersReceived !== null && saleQty > litersReceived ? saleQty - litersReceived : 0;
      const saleLossAmount = saleLossLiters * sellingPrice;

      totalOrderLossLiters += saleLossLiters;
      totalOrderLossAmount += saleLossAmount;
      transportStationLossAmount += saleLossAmount;

      // Product sales only — client-borne transport is not company revenue (or expense).
      const saleRev = toNum(delivery.totalExpectedAmount);
      const salePaid = resolveDeliveryPaymentReceived(delivery);
      // Debt still reflects what the customer was billed (product + client transport fee).
      const billedAmount = saleRev + clientTransportFee;

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
        debtRemaining: billedAmount - salePaid,
        paymentStatus: delivery.status,
        createdAt: new Date(delivery.createdAt).toISOString(),
      };
    });

    // Loss deduction only applies when a logged delivery shortfall exists.
    // transport.totalDeduction may include transporter clawbacks that are already
    // reflected in revenue (full despatch billed) — do not subtract those from cost.
    let lossDeduction = transportStationLossAmount;

    const transportLitersLost = toNum(transport.litersLost);
    if (lossDeduction === 0 && transport.deliveries.length === 0 && transportLitersLost > 0) {
      lossDeduction = transportLitersLost * pricePerLitre;
    }

    totalFleetExpenses += fleetExpenses;
    totalLossDeduction += lossDeduction;

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
      truckId: transport.truck?.id ?? null,
      ratePerLiter: toNum(transport.ratePerLiter),
      fleetExpenses,
      lossDeduction,
      transportTotalQty,
      transportTotalRev,
      transportTotalPaid,
      transportTotalCost,
      deliveries: deliveriesData,
    };
  });

  const totalCost = orderCost + totalTransportCost + totalFleetExpenses - totalLossDeduction;
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

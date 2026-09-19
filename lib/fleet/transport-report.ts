export function toNum(value: unknown) {
  return Number(value ?? 0) || 0;
}

export function sellingPricePerLiter(deliveries: Array<{ amountPerLiter: unknown }>) {
  for (const delivery of deliveries) {
    const price = toNum(delivery.amountPerLiter);
    if (price > 0) return price;
  }
  return 0;
}

export function loggedShortageLiters(transport: {
  litersLost: unknown;
  lossLogs: Array<{ lostQuantity: unknown }>;
}) {
  const fromLogs = transport.lossLogs.reduce(
    (sum, log) => sum + toNum(log.lostQuantity),
    0
  );
  return Math.max(toNum(transport.litersLost), fromLogs);
}

export function subsequentFee(delivery: {
  transportCost: unknown;
  transportRate: unknown;
  litersDespatched: unknown;
  litersReceived: unknown;
}) {
  const cost = toNum(delivery.transportCost);
  if (cost > 0) return cost;
  const rate = toNum(delivery.transportRate);
  if (rate <= 0) return 0;
  const liters =
    delivery.litersReceived == null
      ? toNum(delivery.litersDespatched)
      : toNum(delivery.litersReceived);
  return rate * liters;
}

export function litersDespatchedFromSales(
  deliveries: Array<{ litersDespatched: unknown }>
) {
  return deliveries.reduce((sum, delivery) => sum + toNum(delivery.litersDespatched), 0);
}

export function litersDeliveredFromSales(
  deliveries: Array<{ litersDespatched: unknown; litersReceived: unknown }>
) {
  return deliveries.reduce((sum, delivery) => {
    const despatched = toNum(delivery.litersDespatched);
    return sum + (delivery.litersReceived == null ? despatched : toNum(delivery.litersReceived));
  }, 0);
}

export function summarizeTransportFinances(transport: {
  litersCarried: unknown;
  litersLost: unknown;
  ratePerLiter: unknown;
  maintenanceCost: unknown;
  totalDeduction: unknown;
  deliveries: Array<{
    transportCost: unknown;
    amountPerLiter: unknown;
    litersDespatched: unknown;
    litersReceived: unknown;
  }>;
  transactions: Array<{ type: string; category: string; amount: unknown }>;
  lossLogs: Array<{ expensesIncurred: unknown; lostQuantity: unknown }>;
}) {
  const paidTransport = transport.transactions
    .filter((txn) => txn.type === "OUTFLOW" && txn.category === "TRANSPORT_PAYMENT")
    .reduce((sum, txn) => sum + toNum(txn.amount), 0);
  const depotToPrimaryFee = toNum(transport.litersCarried) * toNum(transport.ratePerLiter);
  const expectedFee =
    depotToPrimaryFee +
    transport.deliveries.reduce((sum, delivery) => sum + toNum(delivery.transportCost), 0);

  const loggedDeduction = transport.lossLogs.reduce(
    (sum, log) => sum + toNum(log.expensesIncurred),
    0
  );
  const lossDeduction = loggedDeduction;
  const shortage = loggedShortageLiters(transport);
  const remaining = Math.max(
    0,
    toNum(transport.litersCarried) - litersDespatchedFromSales(transport.deliveries) - shortage
  );
  const sellingPrice = sellingPricePerLiter(transport.deliveries);
  const amountToDeduct =
    sellingPrice > 0 ? Math.max(0, shortage * sellingPrice - lossDeduction) : 0;
  const hasLossDeduction = lossDeduction > 0;

  const totalFee = Math.max(0, (expectedFee > 0 ? expectedFee : paidTransport) - lossDeduction);

  let fleetExpense = toNum(transport.maintenanceCost);
  let tripExpense = 0;

  for (const txn of transport.transactions) {
    if (txn.type !== "OUTFLOW") continue;
    const amount = toNum(txn.amount);
    if (txn.category === "FLEET_EXPENSE") {
      fleetExpense += amount;
    } else if (txn.category === "EXPENSE") {
      tripExpense += amount;
    }
  }

  const fleetTripExpense = fleetExpense + tripExpense;
  const transportExpense = expectedFee > 0 ? expectedFee : paidTransport;
  const totalExpense = transportExpense + fleetTripExpense + lossDeduction;

  return {
    expectedFee,
    paidTransport,
    totalFee,
    transportExpense,
    fleetTripExpense,
    depotToPrimaryFee,
    fleetExpense,
    tripExpense,
    hasLossDeduction,
    lossDeduction,
    shortage,
    remaining,
    amountToDeduct,
    litersDelivered: litersDeliveredFromSales(transport.deliveries),
    sellingPrice,
    totalExpense,
    net: totalFee - fleetTripExpense,
  };
}

export type TransportReportDelivery = {
  id: string;
  destination: string;
  litersDespatched: number;
  litersReceived: number | null;
  amountPerLiter: number;
  transportRate: number;
  subsequentFee: number;
  transportCostBorneBy: string;
};

export type TransportReportLossLog = {
  id: string;
  lossType: string;
  lostQuantity: number;
  expensesIncurred: number;
  comment: string | null;
  createdAt: string;
};

export type TransportReportRow = {
  id: string;
  createdAt: string;
  status: string;
  destination: string;
  litersCarried: number;
  litersDelivered: number;
  shortage: number;
  remaining: number;
  sellingPrice: number;
  ratePerLiter: number;
  depotToPrimaryFee: number;
  fleetExpense: number;
  tripExpense: number;
  truck?: { plateNumber: string | null };
  transporter?: { id: string; name: string };
  driver?: { firstName: string; lastName: string };
  isOneTime?: boolean | null;
  oneTimeTransporterName?: string | null;
  oneTimeTruckPlate?: string | null;
  oneTimeDriverName?: string | null;
  order?: { id?: string; reference: string; sourceDepot?: string | null };
  expectedFee: number;
  paidTransport: number;
  totalFee: number;
  transportExpense: number;
  fleetTripExpense: number;
  hasLossDeduction: boolean;
  lossDeduction: number;
  amountToDeduct: number;
  totalExpense: number;
  net: number;
};

export type TransportReportDetails = TransportReportRow & {
  deliveries: TransportReportDelivery[];
  lossLogs: TransportReportLossLog[];
};

type MappedDelivery = {
  id: string;
  litersDespatched: unknown;
  litersReceived: unknown;
  amountPerLiter: unknown;
  transportRate: unknown;
  transportCost: unknown;
  transportCostBorneBy?: string | null;
  customer: { name: string | null } | null;
  station: { name: string | null } | null;
};

export function mapTransportReportDelivery(delivery: MappedDelivery): TransportReportDelivery {
  return {
    id: delivery.id,
    destination: delivery.station?.name || delivery.customer?.name || "Secondary stop",
    litersDespatched: toNum(delivery.litersDespatched),
    litersReceived: delivery.litersReceived == null ? null : toNum(delivery.litersReceived),
    amountPerLiter: toNum(delivery.amountPerLiter),
    transportRate: toNum(delivery.transportRate),
    subsequentFee: subsequentFee(delivery),
    transportCostBorneBy: delivery.transportCostBorneBy === "COMPANY" ? "COMPANY" : "CLIENT",
  };
}

export function mapTransportReportRow(transport: {
  id: string;
  createdAt: Date;
  status: string;
  destination: string;
  litersCarried: unknown;
  litersLost: unknown;
  ratePerLiter: unknown;
  maintenanceCost: unknown;
  totalDeduction: unknown;
  truck: { plateNumber: string | null } | null;
  driver: { firstName: string; lastName: string } | null;
  transporter: { id: string; name: string } | null;
  isOneTime?: boolean | null;
  oneTimeTransporterName?: string | null;
  oneTimeTruckPlate?: string | null;
  oneTimeDriverName?: string | null;
  order: { id: string; reference: string | null; sourceDepot?: string | null } | null;
  deliveries: MappedDelivery[];
  transactions: Array<{ type: string; category: string; amount: unknown }>;
  lossLogs: Array<{ expensesIncurred: unknown; lostQuantity: unknown }>;
}): TransportReportRow {
  const finances = summarizeTransportFinances(transport);
  return {
    id: transport.id,
    createdAt: transport.createdAt.toISOString(),
    status: transport.status,
    destination: transport.destination,
    litersCarried: toNum(transport.litersCarried),
    ratePerLiter: toNum(transport.ratePerLiter),
    truck: transport.truck ? { plateNumber: transport.truck.plateNumber } : undefined,
    driver: transport.driver
      ? { firstName: transport.driver.firstName, lastName: transport.driver.lastName }
      : undefined,
    transporter: transport.transporter ? { id: transport.transporter.id, name: transport.transporter.name } : undefined,
    isOneTime: transport.isOneTime,
    oneTimeTransporterName: transport.oneTimeTransporterName,
    oneTimeTruckPlate: transport.oneTimeTruckPlate,
    oneTimeDriverName: transport.oneTimeDriverName,
    order: transport.order
      ? {
          id: transport.order.id,
          reference: transport.order.reference ?? "",
          sourceDepot: transport.order.sourceDepot,
        }
      : undefined,
    ...finances,
  };
}

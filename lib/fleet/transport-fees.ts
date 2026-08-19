import type { TransportFeeLeg } from "@/lib/generated/prisma/client";

export type TransportFeeLegContext = {
  destination?: string | null;
  sourceDepot?: string | null;
  supplier?: string | null;
};

export type TransportFeeTransport = {
  id: string;
  destination?: string | null;
  litersCarried: number | string | { toString(): string };
  ratePerLiter: number | string | { toString(): string };
  order?: { sourceDepot?: string | null; supplier?: string | null } | null;
  deliveries?: TransportFeeDelivery[];
};

export type TransportFeeDelivery = {
  id: string;
  litersDespatched?: number | string | { toString(): string } | null;
  litersReceived?: number | string | { toString(): string } | null;
  transportRate?: number | string | { toString(): string } | null;
  transportCost?: number | string | { toString(): string } | null;
  station?: { name: string } | null;
  customer?: { name: string } | null;
};

export type TransportFeeTransaction = {
  id: string;
  amount: number | string | { toString(): string };
  category: string;
  feeLeg?: TransportFeeLeg | null;
  deliveryId?: string | null;
};

export type FeeLegBreakdown = {
  feeLeg: TransportFeeLeg;
  deliveryId?: string;
  label: string;
  expected: number;
  paid: number;
  remaining: number;
  status: "unpaid" | "partial" | "paid" | "not_applicable";
};

const FEE_LEG_LABELS: Record<TransportFeeLeg, string> = {
  ORIGIN_TO_DEPOT: "Origin → Depot",
  DEPOT_TO_PRIMARY: "Depot → Primary",
  PRIMARY_TO_SUBSEQUENT: "Primary → Secondary",
  FULL_TRIP: "Full Trip",
};

function toNum(value: number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function deliveryLiters(delivery: TransportFeeDelivery): number {
  const received = delivery.litersReceived;
  if (received !== null && received !== undefined) {
    return toNum(received);
  }
  return toNum(delivery.litersDespatched);
}

function deliveryExpectedFee(delivery: TransportFeeDelivery): number {
  const cost = toNum(delivery.transportCost);
  if (cost > 0) return cost;
  const rate = toNum(delivery.transportRate);
  if (rate > 0) return deliveryLiters(delivery) * rate;
  return 0;
}

function deliveryLabel(delivery: TransportFeeDelivery): string {
  return delivery.station?.name || delivery.customer?.name || "Secondary stop";
}

export function getTransportLegContext(transport?: TransportFeeTransport | null): TransportFeeLegContext {
  return {
    destination: transport?.destination,
    sourceDepot: transport?.order?.sourceDepot,
    supplier: transport?.order?.supplier,
  };
}

export function getFeeLegLabel(
  feeLeg: TransportFeeLeg,
  delivery?: TransportFeeDelivery | null,
  context?: TransportFeeLegContext | null
): string {
  const depot = context?.sourceDepot || "Depot";
  const primary = context?.destination || "Primary";
  const origin = context?.supplier || "Origin";

  switch (feeLeg) {
    case "ORIGIN_TO_DEPOT":
      return `${origin} → ${depot}`;
    case "DEPOT_TO_PRIMARY":
      return `${depot} → ${primary}`;
    case "PRIMARY_TO_SUBSEQUENT": {
      const secondary = delivery ? deliveryLabel(delivery) : "Secondary";
      return `${primary} → ${secondary}`;
    }
    case "FULL_TRIP":
      return FEE_LEG_LABELS[feeLeg];
    default:
      return FEE_LEG_LABELS[feeLeg];
  }
}

export function getExpectedFeeForLeg(
  transport: TransportFeeTransport,
  feeLeg: TransportFeeLeg,
  options?: { deliveryId?: string; originToDepotFee?: number }
): number {
  const originFee = options?.originToDepotFee ?? 0;
  const litersCarried = toNum(transport.litersCarried);
  const ratePerLiter = toNum(transport.ratePerLiter);
  const depotToPrimary = litersCarried * ratePerLiter;
  const deliveries = transport.deliveries ?? [];

  if (feeLeg === "ORIGIN_TO_DEPOT") return originFee;
  if (feeLeg === "DEPOT_TO_PRIMARY") return depotToPrimary;

  if (feeLeg === "PRIMARY_TO_SUBSEQUENT") {
    if (options?.deliveryId) {
      const delivery = deliveries.find((d) => d.id === options.deliveryId);
      return delivery ? deliveryExpectedFee(delivery) : 0;
    }
    return deliveries.reduce((sum, d) => sum + deliveryExpectedFee(d), 0);
  }

  if (feeLeg === "FULL_TRIP") {
    const subsequentTotal = deliveries.reduce((sum, d) => sum + deliveryExpectedFee(d), 0);
    return originFee + depotToPrimary + subsequentTotal;
  }

  return 0;
}

export function getTransportFeeTransactions(
  transactions: TransportFeeTransaction[]
): TransportFeeTransaction[] {
  return transactions.filter((t) => t.category === "TRANSPORT_PAYMENT");
}

export function getPaidByLeg(
  transactions: TransportFeeTransaction[]
): Map<string, number> {
  const paid = new Map<string, number>();
  for (const txn of getTransportFeeTransactions(transactions)) {
    if (!txn.feeLeg) continue;
    const key =
      txn.feeLeg === "PRIMARY_TO_SUBSEQUENT" && txn.deliveryId
        ? `${txn.feeLeg}:${txn.deliveryId}`
        : txn.feeLeg;
    paid.set(key, (paid.get(key) ?? 0) + toNum(txn.amount));
  }
  return paid;
}

export function hasFullTripPayment(transactions: TransportFeeTransaction[]): boolean {
  return getTransportFeeTransactions(transactions).some((t) => t.feeLeg === "FULL_TRIP");
}

export function hasPartialLegPayments(transactions: TransportFeeTransaction[]): boolean {
  return getTransportFeeTransactions(transactions).some(
    (t) => t.feeLeg && t.feeLeg !== "FULL_TRIP"
  );
}

export function getRemainingForLeg(
  transport: TransportFeeTransport,
  transactions: TransportFeeTransaction[],
  feeLeg: TransportFeeLeg,
  options?: { deliveryId?: string; originToDepotFee?: number }
): number {
  const expected = getExpectedFeeForLeg(transport, feeLeg, options);
  const paidMap = getPaidByLeg(transactions);

  if (feeLeg === "FULL_TRIP") {
    const fullPaid = paidMap.get("FULL_TRIP") ?? 0;
    if (fullPaid > 0) return Math.max(0, expected - fullPaid);
    const partialPaid = Array.from(paidMap.entries())
      .filter(([key]) => key !== "FULL_TRIP")
      .reduce((sum, [, amount]) => sum + amount, 0);
    return Math.max(0, expected - partialPaid);
  }

  const key =
    feeLeg === "PRIMARY_TO_SUBSEQUENT" && options?.deliveryId
      ? `${feeLeg}:${options.deliveryId}`
      : feeLeg;
  const paid = paidMap.get(key) ?? 0;
  return Math.max(0, expected - paid);
}

export function getFeeLegBreakdown(
  transport: TransportFeeTransport,
  transactions: TransportFeeTransaction[],
  options?: { originToDepotFee?: number }
): FeeLegBreakdown[] {
  const paidMap = getPaidByLeg(transactions);
  const fullTripPaid = hasFullTripPayment(transactions);
  const breakdown: FeeLegBreakdown[] = [];

  const addRow = (
    feeLeg: TransportFeeLeg,
    expected: number,
    paidKey: string,
    label: string,
    deliveryId?: string
  ) => {
    const paid = fullTripPaid
      ? expected
      : paidMap.get(paidKey) ?? 0;
    const remaining = Math.max(0, expected - paid);
    let status: FeeLegBreakdown["status"] = "unpaid";
    if (expected <= 0) status = "not_applicable";
    else if (paid >= expected) status = "paid";
    else if (paid > 0) status = "partial";

    breakdown.push({
      feeLeg,
      deliveryId,
      label,
      expected,
      paid,
      remaining,
      status,
    });
  };

  const legContext = getTransportLegContext(transport);

  const originExpected = getExpectedFeeForLeg(transport, "ORIGIN_TO_DEPOT", options);
  addRow("ORIGIN_TO_DEPOT", originExpected, "ORIGIN_TO_DEPOT", getFeeLegLabel("ORIGIN_TO_DEPOT", null, legContext));

  const depotExpected = getExpectedFeeForLeg(transport, "DEPOT_TO_PRIMARY", options);
  addRow("DEPOT_TO_PRIMARY", depotExpected, "DEPOT_TO_PRIMARY", getFeeLegLabel("DEPOT_TO_PRIMARY", null, legContext));

  const deliveries = transport.deliveries ?? [];
  if (deliveries.length === 0) {
    addRow(
      "PRIMARY_TO_SUBSEQUENT",
      0,
      "PRIMARY_TO_SUBSEQUENT",
      getFeeLegLabel("PRIMARY_TO_SUBSEQUENT", null, legContext)
    );
  } else {
    for (const delivery of deliveries) {
      const expected = deliveryExpectedFee(delivery);
      addRow(
        "PRIMARY_TO_SUBSEQUENT",
        expected,
        `PRIMARY_TO_SUBSEQUENT:${delivery.id}`,
        getFeeLegLabel("PRIMARY_TO_SUBSEQUENT", delivery, legContext),
        delivery.id
      );
    }
  }

  const fullExpected = getExpectedFeeForLeg(transport, "FULL_TRIP", options);
  const fullPaid = paidMap.get("FULL_TRIP") ?? 0;
  const partialPaidTotal = Array.from(paidMap.entries())
    .filter(([key]) => key !== "FULL_TRIP")
    .reduce((sum, [, amount]) => sum + amount, 0);
  const fullRemaining = hasPartialLegPayments(transactions)
    ? Math.max(0, fullExpected - partialPaidTotal)
    : Math.max(0, fullExpected - fullPaid);

  let fullStatus: FeeLegBreakdown["status"] = "unpaid";
  if (fullTripPaid && fullPaid >= fullExpected) fullStatus = "paid";
  else if (fullTripPaid || fullPaid > 0) fullStatus = "partial";
  else if (hasPartialLegPayments(transactions)) fullStatus = "not_applicable";

  breakdown.push({
    feeLeg: "FULL_TRIP",
    label: getFeeLegLabel("FULL_TRIP", null, legContext),
    expected: fullExpected,
    paid: fullTripPaid ? fullPaid : partialPaidTotal,
    remaining: fullRemaining,
    status: fullStatus,
  });

  return breakdown;
}

export function getAvailableFeeLegs(
  transport: TransportFeeTransport,
  transactions: TransportFeeTransaction[],
  options?: { originToDepotFee?: number }
): Array<{ feeLeg: TransportFeeLeg; deliveryId?: string; label: string; remaining: number }> {
  const breakdown = getFeeLegBreakdown(transport, transactions, options);
  const results: Array<{ feeLeg: TransportFeeLeg; deliveryId?: string; label: string; remaining: number }> = [];

  for (const row of breakdown) {
    if (row.feeLeg === "FULL_TRIP") {
      if (hasPartialLegPayments(transactions) && !hasFullTripPayment(transactions)) continue;
      if (row.remaining <= 0) continue;
      results.push({
        feeLeg: row.feeLeg,
        label: row.label,
        remaining: row.remaining,
      });
      continue;
    }

    if (row.status === "not_applicable" || row.remaining <= 0) continue;
    if (hasFullTripPayment(transactions)) continue;

    results.push({
      feeLeg: row.feeLeg,
      deliveryId: row.deliveryId,
      label: row.label,
      remaining: row.remaining,
    });
  }

  return results;
}

export const TRANSPORT_FEE_LEG_OPTIONS: TransportFeeLeg[] = [
  "ORIGIN_TO_DEPOT",
  "DEPOT_TO_PRIMARY",
  "PRIMARY_TO_SUBSEQUENT",
  "FULL_TRIP",
];

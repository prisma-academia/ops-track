"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getFeeLegBreakdown,
  getFeeLegLabel,
  type TransportFeeDelivery,
  type TransportFeeTransaction,
  type TransportFeeTransport,
} from "@/lib/fleet/transport-fees";
import type { TransportFeeLeg } from "@/lib/generated/prisma/client";

type FeeBreakdownTransport = TransportFeeTransport & {
  lossLogs?: Array<{
    lostQuantity?: number | string | null;
    expensesIncurred?: number | string | null;
    comment?: string | null;
  }>;
  transactions?: TransportFeeTransaction[];
  deliveries?: TransportFeeDelivery[];
};

function formatMoney(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatRate(rate: number) {
  if (rate <= 0) return "—";
  return `${formatMoney(rate)}/L`;
}

function toNum(value: number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function deliveryDestinationName(delivery: TransportFeeDelivery) {
  return delivery.station?.name || delivery.customer?.name || "Secondary stop";
}

function matchLossToDelivery(
  log: { lostQuantity?: number | string | null; comment?: string | null },
  deliveries: TransportFeeDelivery[]
): TransportFeeDelivery | null {
  const comment = log.comment || "";
  const byId = deliveries.find((delivery) => comment.includes(delivery.id));
  if (byId) return byId;

  const lost = toNum(log.lostQuantity);
  if (lost <= 0) return null;

  return (
    deliveries.find((delivery) => {
      if (delivery.litersReceived === null || delivery.litersReceived === undefined) return false;
      const variance = toNum(delivery.litersDespatched) - toNum(delivery.litersReceived);
      return variance > 0 && Math.abs(variance - lost) < 0.01;
    }) ?? null
  );
}

export function feeLegStatusBadge(status: "unpaid" | "partial" | "paid" | "not_applicable") {
  if (status === "paid") return <Badge variant="default">Paid</Badge>;
  if (status === "partial") return <Badge variant="secondary">Partial</Badge>;
  if (status === "not_applicable") return <Badge variant="outline">N/A</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
}

function tripFinancials(transport: FeeBreakdownTransport) {
  const ratePerLiter = toNum(transport.ratePerLiter);
  const deliveries = transport.deliveries || [];
  const lossLogs = transport.lossLogs || [];

  const lossByDeliveryId = new Map<string, { liters: number; amount: number; destination: string }>();
  let unattributedLiters = 0;
  let unattributedAmount = 0;
  let lossDeduction = 0;

  for (const log of lossLogs) {
    const liters = toNum(log.lostQuantity);
    const logged = toNum(log.expensesIncurred);
    const amount = logged > 0 ? logged : liters * ratePerLiter;
    lossDeduction += amount;

    const matched = matchLossToDelivery(log, deliveries);
    if (matched) {
      const prev = lossByDeliveryId.get(matched.id) || {
        liters: 0,
        amount: 0,
        destination: deliveryDestinationName(matched),
      };
      lossByDeliveryId.set(matched.id, {
        liters: prev.liters + liters,
        amount: prev.amount + amount,
        destination: prev.destination,
      });
    } else {
      unattributedLiters += liters;
      unattributedAmount += amount;
    }
  }

  const fleetExpense = (transport.transactions || [])
    .filter((txn) => txn.category === "EXPENSE" || txn.category === "FLEET_EXPENSE")
    .reduce((sum, txn) => sum + toNum(txn.amount), 0);

  return {
    ratePerLiter,
    lossDeduction,
    fleetExpense,
    lossByDeliveryId,
    unattributedLiters,
    unattributedAmount,
  };
}

export function TransportFeeBreakdown({
  transport,
  originToDepotFee = 0,
}: {
  transport: FeeBreakdownTransport;
  originToDepotFee?: number;
}) {
  const feeTransactions = (transport.transactions || []).filter(
    (t) => t.category === "TRANSPORT_PAYMENT"
  );
  const breakdown = getFeeLegBreakdown(transport, feeTransactions, { originToDepotFee });
  const displayRows = breakdown.filter((row) => row.feeLeg !== "ORIGIN_TO_DEPOT");
  const fullTripRow = displayRows.find((row) => row.feeLeg === "FULL_TRIP");
  const {
    ratePerLiter,
    lossDeduction,
    fleetExpense,
    lossByDeliveryId,
    unattributedLiters,
    unattributedAmount,
  } = tripFinancials(transport);
  const deliveries = transport.deliveries || [];
  const legRows = displayRows.filter((row) => {
    if (row.feeLeg === "FULL_TRIP") return false;
    if (row.feeLeg !== "PRIMARY_TO_SUBSEQUENT") return true;
    if (row.expected > 0) return true;
    return Boolean(row.deliveryId && lossByDeliveryId.has(row.deliveryId));
  });
  const netOutstanding = Math.max(
    0,
    (fullTripRow?.expected ?? 0) - (fullTripRow?.paid ?? 0) - lossDeduction - fleetExpense
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Financial Overview</CardTitle>
        <CardDescription>
          Haul fees, rate per liter, loss deduction, and fleet expense for this trip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fee Leg</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Rate / L</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Expected</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Loss deduction</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Fleet expense</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Paid</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Remaining</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {legRows.map((row) => {
                const isPrimary = row.feeLeg === "DEPOT_TO_PRIMARY";
                const delivery = row.deliveryId
                  ? deliveries.find((d) => d.id === row.deliveryId)
                  : null;
                const attributed = row.deliveryId ? lossByDeliveryId.get(row.deliveryId) : undefined;
                const rowRate = isPrimary
                  ? ratePerLiter
                  : delivery
                    ? toNum(delivery.transportRate)
                    : 0;
                const rowLoss = isPrimary ? unattributedAmount : attributed?.amount ?? 0;
                const rowLostLiters = isPrimary ? unattributedLiters : attributed?.liters ?? 0;
                const lossDestination = isPrimary
                  ? unattributedAmount > 0
                    ? transport.destination || "Primary"
                    : null
                  : attributed
                    ? attributed.destination
                    : null;
                const rowFleet = isPrimary ? fleetExpense : 0;
                const remaining = Math.max(0, row.expected - row.paid - rowLoss - rowFleet);

                return (
                  <tr
                    key={`${row.feeLeg}-${row.deliveryId || "default"}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{row.label}</p>
                      {rowLostLiters > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {rowLostLiters.toLocaleString()} L lost
                          {lossDestination ? ` at ${lossDestination}` : ""}
                          {rowRate > 0 ? ` × ${formatRate(rowRate)}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatRate(rowRate)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatMoney(row.expected)}</td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right font-mono",
                        rowLoss > 0 && "text-destructive"
                      )}
                    >
                      <p>{rowLoss > 0 ? `−${formatMoney(rowLoss)}` : formatMoney(0)}</p>
                      {lossDestination && rowLoss > 0 ? (
                        <p className="text-[11px] font-sans font-medium text-muted-foreground mt-0.5">
                          {lossDestination}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right font-mono",
                        rowFleet > 0 && "text-amber-600 dark:text-amber-500"
                      )}
                    >
                      {formatMoney(rowFleet)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-500">
                      {formatMoney(row.paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatMoney(remaining)}</td>
                    <td className="py-3 px-4 text-right">{feeLegStatusBadge(row.status)}</td>
                  </tr>
                );
              })}
            </tbody>
            {fullTripRow && (
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/5 dark:bg-primary/10">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-foreground">Full trip</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Expected minus paid, loss deduction, and fleet expense
                    </p>
                    {lossByDeliveryId.size > 0 ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Loss at{" "}
                        {Array.from(lossByDeliveryId.values())
                          .map((entry) => entry.destination)
                          .join(", ")}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">—</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {formatMoney(fullTripRow.expected)}
                  </td>
                  <td
                    className={cn(
                      "py-3.5 px-4 text-right font-mono font-bold",
                      lossDeduction > 0 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {lossDeduction > 0 ? `−${formatMoney(lossDeduction)}` : formatMoney(0)}
                  </td>
                  <td
                    className={cn(
                      "py-3.5 px-4 text-right font-mono font-bold",
                      fleetExpense > 0 ? "text-amber-600 dark:text-amber-500" : "text-foreground"
                    )}
                  >
                    {formatMoney(fleetExpense)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-500">
                    {formatMoney(fullTripRow.paid)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {formatMoney(netOutstanding)}
                  </td>
                  <td className="py-3.5 px-4 text-right">{feeLegStatusBadge(fullTripRow.status)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function getTransactionFeeLegLabel(
  txn: {
    feeLeg?: TransportFeeLeg | null;
    deliveryId?: string | null;
    description?: string | null;
    delivery?: { station?: { name: string } | null; customer?: { name: string } | null } | null;
  },
  transport?: {
    destination?: string | null;
    order?: { sourceDepot?: string | null; supplier?: string | null } | null;
  } | null
) {
  if (txn.feeLeg) {
    return getFeeLegLabel(txn.feeLeg, txn.delivery ?? null, {
      destination: transport?.destination,
      sourceDepot: transport?.order?.sourceDepot,
      supplier: transport?.order?.supplier,
    });
  }
  const match = txn.description?.match(/\[Leg: ([^\]]+)\]/);
  return match?.[1] || "—";
}

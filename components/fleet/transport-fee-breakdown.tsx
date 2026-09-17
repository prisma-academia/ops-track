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
import { DataTable } from "@/components/tables";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { type ColumnDef } from "@tanstack/react-table";

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

  const tableData = legRows.map((row) => {
    const isPrimary = row.feeLeg === "DEPOT_TO_PRIMARY";
    const delivery = row.deliveryId ? deliveries.find((d) => d.id === row.deliveryId) : null;
    const attributed = row.deliveryId ? lossByDeliveryId.get(row.deliveryId) : undefined;
    const rowRate = isPrimary ? ratePerLiter : delivery ? toNum(delivery.transportRate) : 0;
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

    return {
      ...row,
      isPrimary,
      rowRate,
      rowLoss,
      rowLostLiters,
      lossDestination,
      rowFleet,
      remaining,
    };
  });

  const columns: ColumnDef<typeof tableData[0]>[] = [
    {
      accessorKey: "label",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fee Leg" />,
      cell: ({ row }) => {
        const { label, rowLostLiters, lossDestination, rowRate } = row.original;
        return (
          <div>
            <p className="font-medium">{label}</p>
            {rowLostLiters > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {rowLostLiters.toLocaleString()} L lost
                {lossDestination ? ` at ${lossDestination}` : ""}
                {rowRate > 0 ? ` × ${formatRate(rowRate)}` : ""}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "rowRate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rate / L" className="justify-end" />,
      cell: ({ row }) => <div className="text-right font-mono">{formatRate(row.original.rowRate)}</div>,
    },
    {
      accessorKey: "expected",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expected" className="justify-end" />,
      cell: ({ row }) => <div className="text-right font-mono">{formatMoney(row.original.expected)}</div>,
    },
    {
      accessorKey: "rowLoss",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loss deduction" className="justify-end" />,
      cell: ({ row }) => {
        const { rowLoss, lossDestination } = row.original;
        return (
          <div className={cn("text-right font-mono", rowLoss > 0 && "text-destructive")}>
            <p>{rowLoss > 0 ? `−${formatMoney(rowLoss)}` : formatMoney(0)}</p>
            {lossDestination && rowLoss > 0 ? (
              <p className="text-[11px] font-sans font-medium text-muted-foreground mt-0.5">
                {lossDestination}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "rowFleet",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet expense" className="justify-end" />,
      cell: ({ row }) => (
        <div className={cn("text-right font-mono", row.original.rowFleet > 0 && "text-amber-600 dark:text-amber-500")}>
          {formatMoney(row.original.rowFleet)}
        </div>
      ),
    },
    {
      accessorKey: "paid",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-emerald-600 dark:text-emerald-500">
          {formatMoney(row.original.paid)}
        </div>
      ),
    },
    {
      accessorKey: "remaining",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remaining" className="justify-end" />,
      cell: ({ row }) => <div className="text-right font-mono">{formatMoney(row.original.remaining)}</div>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" className="justify-end" />,
      cell: ({ row }) => <div className="flex justify-end">{feeLegStatusBadge(row.original.status)}</div>,
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 pt-0">
        <DataTable
          columns={columns}
          data={tableData}
          tableId="transport-fee-breakdown-v1"
          hideSearch
          hideDateFilter
          title={
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Financial Overview</h3>
              <p className="text-sm text-muted-foreground font-normal">
                Haul fees, rate per liter, loss deduction, and fleet expense for this trip.
              </p>
            </div>
          }
        />
        {fullTripRow && (
          <div className="border-t-2 border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-foreground">Full trip summary</p>
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
            </div>
            <div className="flex gap-6 text-right flex-wrap justify-end">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected</p>
                <p className="font-mono font-bold text-foreground">{formatMoney(fullTripRow.expected)}</p>
              </div>
              {lossDeduction > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Loss Ded.</p>
                  <p className="font-mono font-bold text-destructive">−{formatMoney(lossDeduction)}</p>
                </div>
              )}
              {fleetExpense > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fleet Exp.</p>
                  <p className="font-mono font-bold text-amber-600 dark:text-amber-500">{formatMoney(fleetExpense)}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-500">{formatMoney(fullTripRow.paid)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
                <p className="font-mono font-bold text-foreground">{formatMoney(netOutstanding)}</p>
              </div>
              <div className="self-end pb-0.5">
                {feeLegStatusBadge(fullTripRow.status)}
              </div>
            </div>
          </div>
        )}
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

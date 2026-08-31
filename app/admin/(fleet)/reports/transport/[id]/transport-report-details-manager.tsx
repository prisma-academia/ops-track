"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, DataTableColumnHeader } from "@/components/tables";
import { getLossTypeLabel } from "@/lib/fleet/loss-types";
import type {
  TransportReportDelivery,
  TransportReportDetails,
  TransportReportLossLog,
} from "@/lib/fleet/transport-report";

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })} L`;
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyFooter(
  table: { getFilteredRowModel: () => { rows: Array<{ original: TransportReportDelivery }> } },
  pick: (row: TransportReportDelivery) => number
) {
  return fmtMoney(table.getFilteredRowModel().rows.reduce((sum, row) => sum + pick(row.original), 0));
}

function qtyFooter(
  table: { getFilteredRowModel: () => { rows: Array<{ original: TransportReportDelivery }> } },
  pick: (row: TransportReportDelivery) => number
) {
  return fmtQty(table.getFilteredRowModel().rows.reduce((sum, row) => sum + pick(row.original), 0));
}

function deductionLabel(transport: TransportReportDetails) {
  if (transport.hasLossDeduction && transport.amountToDeduct > 0.005) return "Partial";
  if (transport.hasLossDeduction) return "Yes";
  if (transport.amountToDeduct > 0) return "To deduct";
  return "No";
}

type DepotToPrimaryRow = {
  id: string;
  route: string;
  loaded: number;
  delivered: number;
  remaining: number;
  transportFee: number;
  fleetExpense: number;
  tripExpense: number;
  total: number;
};

export function TransportReportDetailsManager({
  transport,
}: {
  transport: TransportReportDetails;
}) {
  const driverName = transport.driver
    ? `${transport.driver.firstName} ${transport.driver.lastName}`
    : "—";
  const depot = transport.order?.sourceDepot || "Depot";
  const primary = transport.destination || "Primary";

  const expectedTotal =
    transport.depotToPrimaryFee +
    transport.deliveries.reduce((sum, delivery) => sum + delivery.subsequentFee, 0);

  const depotToPrimaryRows = useMemo<DepotToPrimaryRow[]>(() => {
    const transportFee = transport.depotToPrimaryFee;
    const fleetExpense = transport.fleetExpense;
    const tripExpense = transport.tripExpense;
    return [
      {
        id: transport.id,
        route: `${depot} → ${primary}`,
        loaded: transport.litersCarried,
        delivered: transport.litersDelivered,
        remaining: transport.remaining,
        transportFee,
        fleetExpense,
        tripExpense,
        total: transportFee + fleetExpense + tripExpense,
      },
    ];
  }, [depot, primary, transport]);

  const depotColumns = useMemo<ColumnDef<DepotToPrimaryRow>[]>(
    () => [
      {
        accessorKey: "route",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Route" />,
        meta: { label: "Route" },
        footer: () => "Total",
      },
      {
        accessorKey: "loaded",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Loaded" />,
        meta: { label: "Loaded" },
        cell: ({ row }) => <span className="font-mono tabular-nums">{fmtQty(row.original.loaded)}</span>,
        footer: ({ table }) =>
          fmtQty(table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.loaded, 0)),
      },
      {
        accessorKey: "delivered",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivered" />,
        meta: { label: "Delivered" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.delivered)}</span>
        ),
        footer: ({ table }) =>
          fmtQty(table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.delivered, 0)),
      },
      {
        accessorKey: "remaining",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Remaining" />,
        meta: { label: "Remaining" },
        cell: ({ row }) => (
          <span
            className={
              row.original.remaining > 0
                ? "font-mono font-bold tabular-nums text-amber-600 dark:text-amber-500"
                : "font-mono tabular-nums text-muted-foreground"
            }
          >
            {fmtQty(row.original.remaining)}
          </span>
        ),
        footer: ({ table }) =>
          fmtQty(table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.remaining, 0)),
      },
      {
        accessorKey: "transportFee",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transport" />,
        meta: { label: "Transport" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.transportFee)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.transportFee, 0)
          ),
      },
      {
        accessorKey: "fleetExpense",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet" />,
        meta: { label: "Fleet" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.fleetExpense)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.fleetExpense, 0)
          ),
      },
      {
        accessorKey: "tripExpense",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expense" />,
        meta: { label: "Expense" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.tripExpense)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.tripExpense, 0)
          ),
      },
      {
        accessorKey: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
        meta: { label: "Total" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">{fmtMoney(row.original.total)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.total, 0)),
      },
    ],
    []
  );

  const deliveryColumns = useMemo<ColumnDef<TransportReportDelivery>[]>(
    () => [
      {
        accessorKey: "destination",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Destination" />,
        meta: { label: "Destination" },
        footer: () => "Total",
        cell: ({ row }) => (
          <span>
            {primary} → {row.original.destination}
          </span>
        ),
      },
      {
        accessorKey: "litersDespatched",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Despatched" />,
        meta: { label: "Despatched" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.litersDespatched)}</span>
        ),
        footer: ({ table }) => qtyFooter(table, (row) => row.litersDespatched),
      },
      {
        accessorKey: "litersReceived",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received" />,
        meta: { label: "Received" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {row.original.litersReceived === null ? "—" : fmtQty(row.original.litersReceived)}
          </span>
        ),
        footer: ({ table }) =>
          qtyFooter(table, (row) => row.litersReceived ?? 0),
      },
      {
        accessorKey: "subsequentFee",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Subsequent fee" />,
        meta: { label: "Subsequent fee" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.subsequentFee)}</span>
        ),
        footer: ({ table }) => moneyFooter(table, (row) => row.subsequentFee),
      },
      {
        accessorKey: "transportCostBorneBy",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cost borne by" />,
        meta: { label: "Cost borne by" },
        cell: ({ row }) => (
          <Badge
            variant={row.original.transportCostBorneBy === "COMPANY" ? "secondary" : "default"}
            className="text-[10px]"
          >
            {row.original.transportCostBorneBy}
          </Badge>
        ),
      },
    ],
    [primary]
  );

  const lossColumns = useMemo<ColumnDef<TransportReportLossLog>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.createdAt), "LLL dd, y HH:mm")}
          </span>
        ),
      },
      {
        accessorKey: "lossType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        meta: { label: "Type" },
        cell: ({ row }) => getLossTypeLabel(row.original.lossType),
      },
      {
        accessorKey: "lostQuantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Logged shortage" />,
        meta: { label: "Logged shortage" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums text-rose-600">
            {fmtQty(row.original.lostQuantity)}
          </span>
        ),
      },
      {
        accessorKey: "expensesIncurred",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount deducted" />,
        meta: { label: "Amount deducted" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-rose-600">
            {row.original.expensesIncurred > 0
              ? `−${fmtMoney(row.original.expensesIncurred)}`
              : fmtMoney(0)}
          </span>
        ),
      },
      {
        accessorKey: "comment",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
        meta: { label: "Notes" },
        cell: ({ row }) => row.original.comment || "—",
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href="/admin/reports/transport">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Transport report details</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {transport.order?.reference || "Unlinked trip"} · {format(new Date(transport.createdAt), "LLL dd, y HH:mm")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-wider">
          {transport.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card className="shadow-xs">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Order" value={transport.order?.reference || "—"} />
          <Meta label="Transporter" value={transport.transporter?.name || "—"} />
          <Meta label="Truck" value={transport.truck?.plateNumber || "—"} />
          <Meta label="Driver" value={driverName} />
          <Meta label="Depot" value={depot} />
          <Meta label="Primary destination" value={primary} />
          <Meta label="Haulage rate" value={`${fmtMoney(transport.ratePerLiter)}/L`} />
          <Meta label="Loss deduction" value={deductionLabel(transport)} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Expected amount"
          hint="Depot → primary plus subsequent fees"
          value={fmtMoney(expectedTotal)}
          className="text-indigo-600 dark:text-indigo-400"
        />
        <SummaryCard
          label="Paid"
          hint="Transport payments logged"
          value={fmtMoney(transport.paidTransport)}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          label="Deducted"
          hint="Logged shortage deduction"
          value={
            transport.lossDeduction > 0
              ? `−${fmtMoney(transport.lossDeduction)}`
              : fmtMoney(0)
          }
          className={transport.lossDeduction > 0 ? "text-rose-600" : "text-muted-foreground"}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Depot → Primary</h2>
        <DataTable
          columns={depotColumns}
          data={depotToPrimaryRows}
          tableId="fleet-transport-report-details-depot"
          hideSearch
          hideDateFilter
          hidePagination
          emptyMessage="No depot to primary movement on this trip."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Subsequent deliveries from {primary}
        </h2>
        <DataTable
          columns={deliveryColumns}
          data={transport.deliveries}
          tableId="fleet-transport-report-details-deliveries-v2"
          hideSearch
          hideDateFilter
          hidePagination
          emptyMessage="No subsequent deliveries from the primary destination."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Logged shortage</h2>
        <DataTable
          columns={lossColumns}
          data={transport.lossLogs}
          tableId="fleet-transport-report-details-losses"
          hideSearch
          hideDateFilter
          emptyMessage="No shortage or product loss has been logged on this trip."
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  hint,
  value,
  className,
}: {
  label: string;
  hint: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className="shadow-xs">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${className ?? ""}`}>{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

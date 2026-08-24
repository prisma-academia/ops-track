"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
  type DataTableFilterField,
} from "@/components/tables";
import { cn } from "@/lib/utils";

interface TransportRow {
  id: string;
  createdAt: string;
  status: string;
  litersCarried: number;
  truck?: { plateNumber: string | null };
  transporter?: { id: string; name: string };
  driver?: { firstName: string; lastName: string };
  order?: { reference: string };
  deliveries: Array<{
    litersDespatched: number | null;
    litersReceived: number | null;
    amountPerLiter: number;
  }>;
  expectedFee: number;
  totalFee: number;
  transportExpense: number;
  fleetTripExpense: number;
  hasLossDeduction: boolean;
  lossDeduction: number;
  amountToDeduct: number;
  totalExpense: number;
  net: number;
}

function deductionStatus(row: TransportRow) {
  const toDeduct = getAmountToDeduct(row);
  if (row.hasLossDeduction && toDeduct > 0 && row.lossDeduction + 0.005 < toDeduct) return "PARTIAL";
  if (row.hasLossDeduction) return "DEDUCTED";
  if (toDeduct > 0) return "PENDING";
  return "NONE";
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })} L`;
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyFooter(
  table: { getFilteredRowModel: () => { rows: Array<{ original: TransportRow }> } },
  pick: (row: TransportRow) => number
) {
  return fmtMoney(table.getFilteredRowModel().rows.reduce((sum, row) => sum + pick(row.original), 0));
}

function getDelivered(row: TransportRow) {
  let total = 0;
  row.deliveries.forEach((d) => {
    const des = Number(d.litersDespatched || 0);
    total += d.litersReceived !== null ? Number(d.litersReceived) : des;
  });
  return total;
}

function getShortage(row: TransportRow) {
  let total = 0;
  row.deliveries.forEach((d) => {
    const des = Number(d.litersDespatched || 0);
    const rec = d.litersReceived !== null ? Number(d.litersReceived) : des;
    total += des - rec;
  });
  const loaded = Number(row.litersCarried || 0);
  const delivered = getDelivered(row);
  return Math.max(total, loaded > 0 ? loaded - delivered : 0);
}

function getAmountToDeduct(row: TransportRow) {
  let amount = 0;
  let pricedShortage = 0;
  let fallbackPrice = 0;

  row.deliveries.forEach((d) => {
    const price = Number(d.amountPerLiter || 0);
    if (price > 0 && fallbackPrice === 0) fallbackPrice = price;
    const des = Number(d.litersDespatched || 0);
    if (d.litersReceived === null) return;
    const shortage = des - Number(d.litersReceived);
    if (shortage <= 0) return;
    pricedShortage += shortage;
    amount += shortage * price;
  });

  const remainingLoss = Math.max(0, getShortage(row) - pricedShortage);
  if (remainingLoss > 0 && fallbackPrice > 0) {
    amount += remainingLoss * fallbackPrice;
  }

  return amount;
}

export function TransportReportManager({
  initialTransports,
}: {
  initialTransports: TransportRow[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(draftDateRange);

  const [draftTransporterId, setDraftTransporterId] = React.useState<string | "ALL">("ALL");
  const [transporterId, setTransporterId] = React.useState<string | "ALL">(draftTransporterId);

  const applyFilters = React.useCallback(() => {
    setDateRange(draftDateRange);
    setTransporterId(draftTransporterId);
    setIsOpen(false);
  }, [draftDateRange, draftTransporterId]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDateRange(undefined);
    setDraftTransporterId("ALL");
    setTransporterId("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialTransports.filter((row) => {
      const d = new Date(row.createdAt);
      if (dateRange?.from) {
        const s = new Date(dateRange.from);
        s.setHours(0, 0, 0, 0);
        if (d < s) return false;
      }
      if (dateRange?.to) {
        const e = new Date(dateRange.to);
        e.setHours(23, 59, 59, 999);
        if (d > e) return false;
      }
      if (transporterId !== "ALL" && row.transporter?.id !== transporterId) {
        return false;
      }
      return true;
    });
  }, [initialTransports, dateRange, transporterId]);

  const metrics = React.useMemo(() => {
    let totalCarried = 0;
    let totalDelivered = 0;
    let totalShortage = 0;
    let expectedFee = 0;
    let totalFee = 0;
    let transportExpense = 0;
    let fleetTripExpense = 0;
    let lossDeduction = 0;
    let amountToDeduct = 0;
    let totalExpense = 0;

    filteredRows.forEach((r) => {
      totalCarried += Number(r.litersCarried || 0);
      totalDelivered += getDelivered(r);
      totalShortage += getShortage(r);
      expectedFee += r.expectedFee;
      totalFee += r.totalFee;
      transportExpense += r.transportExpense;
      fleetTripExpense += r.fleetTripExpense;
      lossDeduction += r.lossDeduction;
      amountToDeduct += getAmountToDeduct(r);
      totalExpense += r.totalExpense;
    });

    return {
      totalTrips: filteredRows.length,
      totalCarried,
      totalDelivered,
      totalShortage,
      expectedFee,
      totalFee,
      transportExpense,
      fleetTripExpense,
      lossDeduction,
      amountToDeduct,
      totalExpense,
      net: totalFee - fleetTripExpense,
    };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "expected",
          label: "Expected Fee",
          value: metrics.expectedFee,
          color: "#3b82f6",
          format: (n) => fmtMoney(n),
        },
        {
          key: "totalFee",
          label: "Total Fee",
          value: metrics.totalFee,
          color: "#10b981",
          format: (n) => fmtMoney(n),
        },
        {
          key: "loss",
          label: "Amount Deducted",
          value: metrics.lossDeduction,
          color: "#f43f5e",
          format: (n) => fmtMoney(n),
        },
        {
          key: "toDeduct",
          label: "To Be Deducted",
          value: metrics.amountToDeduct,
          color: "#e11d48",
          format: (n) => fmtMoney(n),
        },
        {
          key: "opex",
          label: "Fleet / Trip Exp",
          value: metrics.fleetTripExpense,
          color: "#f59e0b",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<TransportRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.createdAt), "LLL dd, y HH:mm")}
          </span>
        ),
      },
      {
        id: "orderRef",
        accessorFn: (row) => row.order?.reference ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order Ref" />,
        meta: { label: "Order Ref" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">{row.original.order?.reference || "—"}</span>
        ),
      },
      {
        id: "transporter",
        accessorFn: (row) => row.transporter?.name ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transporter" />,
        meta: { label: "Transporter" },
        cell: ({ row }) => (
          <span className="truncate max-w-[150px] inline-block">{row.original.transporter?.name || "—"}</span>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true;
          return value.includes(row.original.transporter?.id);
        },
      },
      {
        id: "truckPlate",
        accessorFn: (row) => row.truck?.plateNumber ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
        meta: { label: "Truck" },
        cell: ({ row }) => (
          <span className="font-semibold uppercase">{row.original.truck?.plateNumber || "—"}</span>
        ),
      },
      {
        id: "driver",
        accessorFn: (row) =>
          row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Driver" />,
        meta: { label: "Driver" },
        cell: ({ row }) =>
          row.original.driver
            ? `${row.original.driver.firstName} ${row.original.driver.lastName}`
            : "—",
      },
      {
        accessorKey: "litersCarried",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Loaded" />,
        meta: { label: "Loaded" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-blue-600 tabular-nums">
            {fmtQty(row.original.litersCarried)}
          </span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + Number(row.original.litersCarried || 0), 0)
          ),
      },
      {
        id: "delivered",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivered" />,
        meta: { label: "Delivered" },
        accessorFn: (row) => getDelivered(row),
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-emerald-600 tabular-nums">
            {fmtQty(getDelivered(row.original))}
          </span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + getDelivered(row.original), 0)
          ),
      },
      {
        id: "shortage",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Shortage" />,
        meta: { label: "Shortage" },
        accessorFn: (row) => getShortage(row),
        cell: ({ row }) => {
          const shortage = getShortage(row.original);
          return (
            <span
              className={cn(
                "font-mono font-bold tabular-nums",
                shortage > 0 ? "text-rose-600" : "text-muted-foreground"
              )}
            >
              {fmtQty(shortage)}
            </span>
          );
        },
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + getShortage(row.original), 0)
          ),
      },
      {
        id: "deductionStatus",
        accessorFn: (row) => deductionStatus(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Loss Deduction" />,
        meta: { label: "Loss Deduction" },
        cell: ({ row }) => {
          const status = deductionStatus(row.original);
          if (status === "DEDUCTED") {
            return (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                Yes
              </Badge>
            );
          }
          if (status === "PARTIAL") {
            return (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                Partial
              </Badge>
            );
          }
          if (status === "PENDING") {
            return (
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900">
                To deduct
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-muted-foreground">
              No
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true;
          return value.includes(deductionStatus(row.original));
        },
      },
      {
        accessorKey: "lossDeduction",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount Deducted" />,
        meta: { label: "Amount Deducted" },
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono tabular-nums",
              row.original.lossDeduction > 0 ? "text-rose-600" : "text-muted-foreground"
            )}
          >
            {row.original.lossDeduction > 0
              ? `−${fmtMoney(row.original.lossDeduction)}`
              : fmtMoney(0)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + row.original.lossDeduction, 0);
          return total > 0 ? `−${fmtMoney(total)}` : fmtMoney(0);
        },
      },
      {
        accessorKey: "amountToDeduct",
        accessorFn: (row) => getAmountToDeduct(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="To Be Deducted" />,
        meta: { label: "To Be Deducted" },
        cell: ({ row }) => {
          const amount = getAmountToDeduct(row.original);
          return (
          <span
            className={cn(
              "font-mono tabular-nums",
              amount > 0 ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {fmtMoney(amount)}
          </span>
          );
        },
        footer: ({ table }) =>
          moneyFooter(table, (row) => getAmountToDeduct(row)),
      },
      {
        accessorKey: "transportExpense",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transport Exp" />,
        meta: { label: "Transport Exp" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.transportExpense)}</span>
        ),
        footer: ({ table }) => moneyFooter(table, (row) => row.transportExpense),
      },
      {
        accessorKey: "fleetTripExpense",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet / Trip Exp" />,
        meta: { label: "Fleet / Trip Exp" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.fleetTripExpense)}</span>
        ),
        footer: ({ table }) => moneyFooter(table, (row) => row.fleetTripExpense),
      },
      {
        accessorKey: "totalFee",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Fee" />,
        meta: { label: "Total Fee" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-emerald-600 tabular-nums">
            {fmtMoney(row.original.totalFee)}
          </span>
        ),
        footer: ({ table }) => moneyFooter(table, (row) => row.totalFee),
      },
      {
        accessorKey: "expectedFee",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Fee" />,
        meta: { label: "Expected Fee" },
        cell: ({ row }) => (
          <span className="font-mono text-indigo-600 tabular-nums dark:text-indigo-400">
            {fmtMoney(row.original.expectedFee)}
          </span>
        ),
        footer: ({ table }) => moneyFooter(table, (row) => row.expectedFee),
      },
      {
        accessorKey: "net",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Net" />,
        meta: { label: "Net" },
        cell: ({ row }) => {
          const isProfit = row.original.net >= 0;
          return (
            <span className={cn("font-mono tabular-nums", isProfit ? "text-emerald-600" : "text-rose-600")}>
              {isProfit ? "+" : ""}
              {fmtMoney(row.original.net)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.net, 0);
          return (
            <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {total >= 0 ? "+" : ""}
              {fmtMoney(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {row.original.status.replace(/_/g, " ")}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<TransportRow>[]>(
    () => {
      const uniqueTransporters = new Map<string, string>();
      initialTransports.forEach(t => {
        if (t.transporter) {
          uniqueTransporters.set(t.transporter.id, t.transporter.name);
        }
      });

      return [
        {
          id: "transporter",
          label: "Transporter",
          options: Array.from(uniqueTransporters.entries()).map(([id, name]) => ({
            label: name,
            value: id,
          })),
        },
        {
          id: "status",
          label: "Status",
          options: Array.from(new Set(initialTransports.map((t) => t.status))).map((s) => ({
            label: s.replace(/_/g, " "),
            value: s,
          })),
        },
        {
          id: "deductionStatus",
          label: "Loss Deduction",
          options: [
            { label: "Yes", value: "DEDUCTED" },
            { label: "Partial", value: "PARTIAL" },
            { label: "To deduct", value: "PENDING" },
            { label: "No", value: "NONE" },
          ],
        },
      ];
    },
    [initialTransports]
  );

  const uniqueTransportersList = React.useMemo(() => {
    const map = new Map<string, string>();
    initialTransports.forEach(t => {
      if (t.transporter) map.set(t.transporter.id, t.transporter.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [initialTransports]);

  const filterSheet = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 h-9">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[400px] flex-col sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filter Records</SheetTitle>
          <SheetDescription>Apply filters to narrow down results.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          <div className="space-y-3 w-full">
            <Label className="text-sm font-semibold">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={draftDateRange?.from ? format(draftDateRange.from, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setDraftDateRange((prev) => ({
                      from: e.target.value ? new Date(e.target.value) : undefined,
                      to: prev?.to,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={draftDateRange?.to ? format(draftDateRange.to, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setDraftDateRange((prev) => ({
                      from: prev?.from,
                      to: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-3 w-full border-t pt-4">
            <Label className="text-sm font-semibold">Transporter</Label>
            <Select value={draftTransporterId} onValueChange={setDraftTransporterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Transporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Transporters</SelectItem>
                {uniqueTransportersList.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Reset Filters
          </Button>
          <Button onClick={applyFilters} className="w-full">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Transport & Allocation Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trip volumes, whether a loss was deducted, amounts already deducted or still to deduct, haulage fees, and fleet / trip expenses.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="fleet-transport-report"
        filterFields={filterFields}
        searchPlaceholder="Search order, truck, driver, transporter..."
        toolbarActions={filterSheet}
        emptyMessage="No transport records found for the selected filters."
      />
    </div>
  );
}

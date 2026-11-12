"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
} from "@/components/tables";
import { cn } from "@/lib/utils";

interface DeliveryPnlRow {
  id: string;
  stationId: string;
  stationName: string;
  waybillNumber: string;
  deliveryDate: string;
  cycleEndDate: string | null;
  reconciledDate: string | null;
  cycleState: "pending" | "open" | "closed";
  truckPlate: string;
  productType: string;
  receivedQty: number | null;
  dispatchedQty: number;
  soldQty: number;
  remainingQty: number;
  remainingPct: number;
  level: "ACTIVE" | "DEPLETED" | "PENDING";
  stockValue: number;
  expectedRevenue: number | null;
  purchasePrice: number;
  deliveryCost: number;
  deliveryRate: number;
  transportTotal: number;
  totalOrderCost?: number;
  cycleRevenue: number;
  amountCollected?: number;
  balanceDue?: number;
  collectionStatus?: "balanced" | "debt" | "none";
  cycleExpenses: number;
  netProfit: number | null;
  margin: number | null;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

export function DeliveryPnlManager({
  initialRows,
  stations,
}: {
  initialRows: DeliveryPnlRow[];
  stations: Station[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>(undefined);
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);
  const [draftProduct, setDraftProduct] = React.useState<string>("ALL");
  const [draftLevel, setDraftLevel] = React.useState<string>("ALL");

  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(undefined);
  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");
  const [appliedLevel, setAppliedLevel] = React.useState<string>("ALL");

  const applyFilters = React.useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedProduct(draftProduct);
    setAppliedLevel(draftLevel);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftProduct, draftLevel]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftProduct("ALL");
    setDraftLevel("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedProduct("ALL");
    setAppliedLevel("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(row.stationId)) return false;
      if (appliedProduct !== "ALL" && row.productType !== appliedProduct) return false;
      if (appliedLevel !== "ALL" && row.level !== appliedLevel) return false;

      const d = new Date(row.deliveryDate);
      if (appliedDateRange?.from) {
        const s = new Date(appliedDateRange.from);
        s.setHours(0, 0, 0, 0);
        if (d < s) return false;
      }
      if (appliedDateRange?.to) {
        const e = new Date(appliedDateRange.to);
        e.setHours(23, 59, 59, 999);
        if (d > e) return false;
      }
      return true;
    });
  }, [initialRows, appliedStationIds, appliedProduct, appliedLevel, appliedDateRange]);

  const metrics = React.useMemo(() => {
    let totalReceived = 0;
    let totalSold = 0;
    let totalRemaining = 0;
    let totalOrderCost = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalRevenue = 0; // Received amount
    let totalExpectedRevenue = 0; // Expected amount (if sold)
    let totalExpenses = 0; // Cycle Expense
    let totalProfit = 0; // Net Profit
    let totalStockValue = 0;

    filteredRows.forEach((r) => {
      const rec = r.receivedQty ?? 0;
      const sold = r.soldQty ?? 0;
      const remaining = r.remainingQty ?? Math.max(0, rec - sold);
      totalReceived += rec;
      totalSold += sold;
      totalRemaining += remaining;
      totalOrderCost += (r.deliveryCost ?? 0) + (r.transportTotal ?? 0);
      totalCollected += r.amountCollected ?? 0;
      totalOutstanding += r.balanceDue ?? 0;
      totalRevenue += r.cycleRevenue ?? 0;
      totalExpectedRevenue += r.expectedRevenue ?? 0;
      totalExpenses += r.cycleExpenses ?? 0;
      totalProfit += r.netProfit ?? 0;
      totalStockValue += r.stockValue ?? 0;
    });

    return {
      totalReceived,
      totalSold,
      totalRemaining,
      totalOrderCost,
      totalCollected,
      totalOutstanding,
      totalRevenue,
      totalExpectedRevenue,
      totalExpenses,
      totalProfit,
      totalStockValue,
    };
  }, [filteredRows]);

  const leftStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "received",
          label: "Received Volume",
          value: metrics.totalReceived,
          color: "#3b82f6",
          format: (n) => fmtQty(n),
        },
        {
          key: "orderCost",
          label: "Order Cost",
          value: metrics.totalOrderCost,
          color: "#64748b",
          format: (n) => fmtMoney(n),
        },
        {
          key: "sold",
          label: "Sold Volume",
          value: metrics.totalSold,
          color: "#8b5cf6",
          format: (n) => fmtQty(n),
        },
        {
          key: "remaining",
          label: "Remaining Volume",
          value: metrics.totalRemaining,
          color: "#10b981",
          format: (n) => fmtQty(n),
        },
        {
          key: "collected",
          label: "Received Payment",
          value: metrics.totalCollected,
          color: "#0d9488",
          format: (n) => fmtMoney(n),
        },
        {
          key: "outstanding",
          label: "Outstanding",
          value: metrics.totalOutstanding,
          color: "#f43f5e",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const chartStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "profit",
          label: "Net Profit",
          value: metrics.totalProfit,
          color: metrics.totalProfit >= 0 ? "#10b981" : "#ef4444",
          format: (n) => fmtMoney(n),
        },
        {
          key: "expected",
          label: "Expected Revenue",
          value: metrics.totalExpectedRevenue,
          color: "#3b82f6",
          format: (n) => fmtMoney(n),
        },
        {
          key: "revenue",
          label: "Received Amount",
          value: metrics.totalRevenue,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
        {
          key: "expenses",
          label: "Cycle Expense",
          value: metrics.totalExpenses,
          color: "#eab308",
          format: (n) => fmtMoney(n),
        },
        {
          key: "stock",
          label: "Stock Value",
          value: metrics.totalStockValue,
          color: "#0ea5e9",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<DeliveryPnlRow>[]>(
    () => [
      {
        accessorKey: "deliveryDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle Start" />,
        meta: { label: "Cycle Start" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) =>
          row.original.cycleState === "pending" ? (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-amber-600">In transit</span>
              <span className="text-[11px] text-muted-foreground">
                Dispatched {format(new Date(row.original.deliveryDate), "LLL dd, y")}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {format(new Date(row.original.deliveryDate), "LLL dd, y")}
            </span>
          ),
      },
      {
        accessorKey: "cycleEndDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle End" />,
        meta: { label: "Cycle End" },
        cell: ({ row }) => {
          if (row.original.cycleState === "pending") {
            return <span className="text-muted-foreground">—</span>;
          }
          if (row.original.cycleState === "open" || !row.original.cycleEndDate) {
            return (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Open
              </span>
            );
          }
          return (
            <span className="text-muted-foreground">
              {format(new Date(row.original.cycleEndDate), "LLL dd, y")}
            </span>
          );
        },
      },
      {
        accessorKey: "reconciledDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reconciled Date" />,
        meta: { label: "Reconciled Date" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.reconciledDate
              ? format(new Date(row.original.reconciledDate), "LLL dd, y")
              : "—"}
          </span>
        ),
      },
      {
        id: "stationName",
        accessorFn: (row) => row.stationName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-medium">{row.original.stationName}</span>,
      },
      {
        accessorKey: "truckPlate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
        meta: { label: "Truck" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold uppercase">{row.original.truckPlate}</span>
        ),
      },
      {
        accessorKey: "waybillNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Waybill" />,
        meta: { label: "Waybill" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">{row.original.waybillNumber}</span>
        ),
      },
      {
        accessorKey: "productType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        meta: { label: "Product" },
        cell: ({ row }) => (
          <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
            {row.original.productType}
          </span>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "waybillLevel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Waybill Level" />,
        meta: { label: "Waybill Level" },
        accessorFn: (row) => row.remainingQty,
        cell: ({ row }) => {
          const r = row.original;
          const remaining = r.remainingQty;
          const total = r.receivedQty ?? r.dispatchedQty;
          const pct = Math.max(0, Math.min(100, r.remainingPct));
          const isDelivered = r.cycleState !== "pending";
          const isDepleted = isDelivered && remaining <= 0.009;

          return (
            <div className="flex min-w-[150px] flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {fmtQty(remaining)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    !isDelivered
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : isDepleted
                        ? "bg-muted text-muted-foreground"
                        : pct <= 20
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : pct <= 50
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {!isDelivered ? "In Transit" : isDepleted ? "Depleted" : `${pct.toFixed(0)}% Left`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    !isDelivered
                      ? "bg-amber-400"
                      : isDepleted
                        ? "bg-muted-foreground/30"
                        : pct <= 20
                          ? "bg-red-500"
                          : pct <= 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                  )}
                  style={{ width: `${!isDelivered ? 100 : pct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {fmtQty(r.soldQty)} sold of {fmtQty(total)}
              </span>
            </div>
          );
        },
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.remainingQty ?? 0), 0)
          ),
      },
      {
        accessorKey: "receivedQty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received Vol." />,
        meta: { label: "Received Volume" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.receivedQty)}</span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + (row.original.receivedQty ?? 0), 0)
          ),
      },
      {
        accessorKey: "purchasePrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Purchase Price" />,
        meta: { label: "Purchase Price" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtMoney(row.original.purchasePrice)}/L
          </span>
        ),
      },
      {
        accessorKey: "deliveryCost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Cost" />,
        meta: { label: "Delivery Cost (Total Purchase)" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {fmtMoney(row.original.deliveryCost)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.deliveryCost, 0)
          ),
      },
      {
        accessorKey: "transportTotal",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transport Cost" />,
        meta: { label: "Transport Cost" },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono tabular-nums text-muted-foreground">
              {fmtMoney(row.original.transportTotal)}
            </span>
            {/* <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
              {fmtMoney(row.original.deliveryRate)}/L
            </span> */}
          </div>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.transportTotal, 0)
          ),
      },
      {
        id: "landedCost",
        accessorFn: (row) => row.deliveryCost + row.transportTotal,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Order Cost" />,
        meta: { label: "Total Order Cost" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">
            {fmtMoney(row.original.deliveryCost + row.original.transportTotal)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + row.original.deliveryCost + row.original.transportTotal, 0)
          ),
      },
      {
        accessorKey: "stockValue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Value" />,
        meta: { label: "Stock Value" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.stockValue)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.stockValue, 0)
          ),
      },
      {
        accessorKey: "expectedRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Revenue" />,
        meta: { label: "Expected Revenue" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.expectedRevenue)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.expectedRevenue ?? 0), 0)
          ),
      },
      {
        accessorKey: "cycleRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received Amount" />,
        meta: { label: "Received Amount" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.cycleRevenue)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.cycleRevenue, 0)
          ),
      },
      {
        accessorKey: "collectionStatus",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received Status" />,
        meta: { label: "Received Status" },
        cell: ({ row }) => {
          const status = row.original.collectionStatus ?? "none";
          const due = row.original.balanceDue ?? 0;
          if (status === "none") {
            return <span className="text-muted-foreground">—</span>;
          }
          if (status === "balanced") {
            return (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Balanced
              </span>
            );
          }
          return (
            <div className="flex flex-col gap-0.5">
              <span className="w-fit rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                Remaining debt
              </span>
              <span className="font-mono text-[11px] tabular-nums text-rose-600">{fmtMoney(due)}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "cycleExpenses",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle Expenses" />,
        meta: { label: "Cycle Expenses" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-amber-500">
            {fmtMoney(row.original.cycleExpenses)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.cycleExpenses, 0)
          ),
      },
      {
        accessorKey: "netProfit",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Net Profit" />,
        meta: { label: "Net Profit" },
        cell: ({ row }) => {
          const val = row.original.netProfit;
          if (val == null) {
            return <span className="text-xs font-medium text-amber-500">Awaiting</span>;
          }
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                val >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {fmtMoney(val)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.netProfit ?? 0), 0);
          return (
            <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {fmtMoney(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "margin",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Margin" />,
        meta: { label: "Margin" },
        cell: ({ row }) => {
          const val = row.original.margin;
          if (val == null) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                val >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {val.toFixed(2)}%
            </span>
          );
        },
      },
    ],
    []
  );

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
          <SheetDescription>Apply filters to narrow down the table results.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          <div className="space-y-1 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Station</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    draftStationIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {draftStationIds.length === 0
                    ? "All Stations"
                    : `${draftStationIds.length} station(s)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="station-all"
                      checked={draftStationIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setDraftStationIds([]);
                      }}
                    />
                    <label htmlFor="station-all" className="text-sm font-medium leading-none cursor-pointer">
                      All Stations
                    </label>
                  </div>
                  {stations.map((s) => (
                    <div key={s.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={`station-${s.id}`}
                        checked={draftStationIds.includes(s.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDraftStationIds([...draftStationIds, s.id]);
                          } else {
                            setDraftStationIds(draftStationIds.filter((id) => id !== s.id));
                          }
                        }}
                      />
                      <label htmlFor={`station-${s.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {s.name}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3 w-full">
            <Label className="text-sm font-semibold">Delivery Date Range</Label>
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

          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Waybill Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "ALL", label: "All Waybills" },
                { id: "ACTIVE", label: "Active (> 0 L)" },
                { id: "DEPLETED", label: "Depleted (0 L)" },
                { id: "PENDING", label: "In Transit" },
              ].map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant={draftLevel === opt.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-center text-xs"
                  onClick={() => setDraftLevel(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1 w-full">
            <Label className="text-xs text-muted-foreground font-medium">Product</Label>
            <Select value={draftProduct} onValueChange={setDraftProduct}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Products</SelectItem>
                <SelectItem value="PMS">PMS</SelectItem>
                <SelectItem value="AGO">AGO</SelectItem>
                <SelectItem value="DPK">DPK</SelectItem>
                <SelectItem value="LPG">LPG</SelectItem>
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
        <h1 className="text-xl font-semibold text-foreground">Waybill Profit Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each waybill&apos;s sales cycle, stock left, and profit. Open a row for the purchase, sales, and profit breakdown.
        </p>
      </div>

      <TableInsightCards
        leftStats={leftStats}
        chartStats={chartStats}
        breakdownTitle="Financial Overview"
      />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-delivery-pnl-v6"
        searchPlaceholder="Search station, truck, waybill..."
        rowHref={(row) => `/admin/station/delivery-pnl/${row.id}`}
        toolbarActions={filterSheet}
        emptyMessage="No delivery records found for the selected filters."
      />
    </div>
  );
}

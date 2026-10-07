"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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

interface StockReportRow {
  id: string;
  deliveryDate: string;
  truckNo: string;
  stationId: string;
  stationName: string;
  totalDelivery: number;
  deliveryCost: number;
  stockValue: number;
  reconciledDate: string | null;
  reconciledDeposit: number | null;
  totalExpense: number;
  pnl: number | null;
  reconciledQty: number | null;
  deliveryQty: number;
  soldQty: number;
  remainingQty: number;
  remainingPct: number;
  remainingStockValue: number | null;
  isFullySold: boolean;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StockReportManager({
  initialRows,
  stations,
}: {
  initialRows: StockReportRow[];
  stations: Station[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftSelectedStationIds, setDraftSelectedStationIds] = React.useState<string[]>([]);
  const [draftLevelFilter, setDraftLevelFilter] = React.useState<string>("ALL");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(draftDateRange);
  const [selectedStationIds, setSelectedStationIds] = React.useState<string[]>([]);
  const [levelFilter, setLevelFilter] = React.useState<string>("ALL");

  const applyFilters = React.useCallback(() => {
    setDateRange(draftDateRange);
    setSelectedStationIds(draftSelectedStationIds);
    setLevelFilter(draftLevelFilter);
    setIsOpen(false);
  }, [draftDateRange, draftSelectedStationIds, draftLevelFilter]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftSelectedStationIds([]);
    setDraftLevelFilter("ALL");
    setDateRange(undefined);
    setSelectedStationIds([]);
    setLevelFilter("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (selectedStationIds.length > 0 && !selectedStationIds.includes(row.stationId)) return false;
      
      if (levelFilter === "ACTIVE" && (row.remainingQty <= 0 || row.reconciledQty === null)) return false;
      if (levelFilter === "DEPLETED" && (row.remainingQty > 0 || row.reconciledQty === null)) return false;
      if (levelFilter === "PENDING" && row.reconciledQty !== null) return false;

      const d = new Date(row.deliveryDate);
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
      return true;
    });
  }, [initialRows, selectedStationIds, levelFilter, dateRange]);

  const metrics = React.useMemo(() => {
    let totalVolume = 0;
    let totalStockValue = 0;
    let totalReceived = 0;
    let totalDeposit = 0;
    let totalSold = 0;
    let totalRemaining = 0;

    filteredRows.forEach((r) => {
      totalVolume += r.deliveryQty;
      totalStockValue += r.stockValue;
      if (r.reconciledQty) totalReceived += r.reconciledQty;
      if (r.reconciledDeposit) totalDeposit += r.reconciledDeposit;
      totalSold += r.soldQty || 0;
      totalRemaining += r.remainingQty || 0;
    });

    return {
      count: filteredRows.length,
      totalVolume,
      totalStockValue,
      totalReceived,
      totalDeposit,
      totalSold,
      totalRemaining,
    };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "deliveries", label: "Deliveries", value: metrics.count, color: "#0d9488" },
        {
          key: "volume",
          label: "Total Volume",
          value: metrics.totalVolume,
          color: "#3b82f6",
          format: (n) => `${fmtQty(n)} L`,
        },
        {
          key: "received",
          label: "Volume Received",
          value: metrics.totalReceived,
          color: "#f97316",
          format: (n) => `${fmtQty(n)} L`,
        },
        {
          key: "sold",
          label: "Volume Sold",
          value: metrics.totalSold,
          color: "#8b5cf6",
          format: (n) => `${fmtQty(n)} L`,
        },
        {
          key: "remaining",
          label: "Stock Level (Remaining)",
          value: metrics.totalRemaining,
          color: "#10b981",
          format: (n) => `${fmtQty(n)} L`,
        },
        {
          key: "stock",
          label: "Stock Value",
          value: metrics.totalStockValue,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<StockReportRow>[]>(
    () => [
      {
        accessorKey: "deliveryDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Date" />,
        meta: { label: "Delivery Date" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.deliveryDate), "LLL dd, y")}
          </span>
        ),
      },
      {
        accessorKey: "truckNo",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
        meta: { label: "Truck" },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold uppercase">{row.original.truckNo}</span>
        ),
      },
      {
        accessorKey: "stationName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-medium">{row.original.stationName}</span>,
      },
      {
        accessorKey: "reconciledQty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received (L)" />,
        meta: { label: "Received (L)" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.reconciledQty)}</span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + (row.original.reconciledQty ?? 0), 0)
          ),
      },
      {
        id: "remainingLevel",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Waybill Level" />,
        meta: { label: "Waybill Level" },
        accessorFn: (row) => row.remainingQty,
        cell: ({ row }) => {
          const r = row.original;
          const remaining = r.remainingQty;
          const total = r.reconciledQty ?? r.deliveryQty;
          const pct = Math.max(0, Math.min(100, r.remainingPct));
          const isDelivered = r.reconciledQty !== null;
          const isDepleted = isDelivered && remaining <= 0;

          return (
            <div className="flex flex-col gap-1 min-w-[150px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {fmtQty(remaining)} L
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
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
                  {!isDelivered
                    ? "In Transit"
                    : isDepleted
                    ? "Depleted"
                    : `${pct.toFixed(0)}% Left`}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
              <span className="text-[10px] text-muted-foreground font-mono">
                {fmtQty(r.soldQty)} L sold of {fmtQty(total)} L
              </span>
            </div>
          );
        },
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.remainingQty ?? 0), 0);
          return `${fmtQty(total)} L`;
        },
      },
      {
        accessorKey: "stockValue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Value" />,
        meta: { label: "Stock Value" },
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">{fmtMoney(row.original.stockValue)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.stockValue, 0)
          ),
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
        accessorKey: "reconciledDeposit",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Deposit" />,
        meta: { label: "Deposit" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.reconciledDeposit)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + (row.original.reconciledDeposit ?? 0), 0)
          ),
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Profit/Loss" />,
        meta: { label: "Profit/Loss" },
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono font-semibold tabular-nums",
              (row.original.pnl ?? 0) < 0 ? "text-red-500" : "text-green-600"
            )}
          >
            {fmtMoney(row.original.pnl)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + (row.original.pnl ?? 0), 0);
          return (
            <span className={cn("font-mono", total < 0 ? "text-red-500" : "text-green-600")}>
              {fmtMoney(total)}
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
            <Label className="text-xs text-muted-foreground">Station(s)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    draftSelectedStationIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {draftSelectedStationIds.length === 0
                    ? "All Stations"
                    : `${draftSelectedStationIds.length} station(s) selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="station-all"
                      checked={draftSelectedStationIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setDraftSelectedStationIds([]);
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
                        checked={draftSelectedStationIds.includes(s.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDraftSelectedStationIds([...draftSelectedStationIds, s.id]);
                          } else {
                            setDraftSelectedStationIds(
                              draftSelectedStationIds.filter((id) => id !== s.id)
                            );
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
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-muted-foreground">Waybill Stock Level</Label>
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
                  variant={draftLevelFilter === opt.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8 justify-center"
                  onClick={() => setDraftLevelFilter(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
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
        <h1 className="text-xl font-semibold text-foreground">Inventory Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Delivery volumes, stock value, reconciliation, and profit/loss by station.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-stock-report"
        searchPlaceholder="Search station, truck..."
        toolbarActions={filterSheet}
        emptyMessage="No stock report records found for the selected filters."
      />
    </div>
  );
}

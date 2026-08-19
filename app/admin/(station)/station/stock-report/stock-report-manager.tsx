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
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(draftDateRange);
  const [selectedStationIds, setSelectedStationIds] = React.useState<string[]>([]);

  const applyFilters = React.useCallback(() => {
    setDateRange(draftDateRange);
    setSelectedStationIds(draftSelectedStationIds);
    setIsOpen(false);
  }, [draftDateRange, draftSelectedStationIds]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftSelectedStationIds([]);
    setDateRange(undefined);
    setSelectedStationIds([]);
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (selectedStationIds.length > 0 && !selectedStationIds.includes(row.stationId)) return false;
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
  }, [initialRows, selectedStationIds, dateRange]);

  const metrics = React.useMemo(() => {
    let totalVolume = 0;
    let totalStockValue = 0;
    let totalReceived = 0;
    let totalDeposit = 0;

    filteredRows.forEach((r) => {
      totalVolume += r.deliveryQty;
      totalStockValue += r.stockValue;
      if (r.reconciledQty) totalReceived += r.reconciledQty;
      if (r.reconciledDeposit) totalDeposit += r.reconciledDeposit;
    });

    return { count: filteredRows.length, totalVolume, totalStockValue, totalReceived, totalDeposit };
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
          key: "stock",
          label: "Stock Value",
          value: metrics.totalStockValue,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
        {
          key: "received",
          label: "Volume Received",
          value: metrics.totalReceived,
          color: "#f97316",
          format: (n) => `${fmtQty(n)} L`,
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
        accessorKey: "totalDelivery",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery (L)" />,
        meta: { label: "Delivery (L)" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.totalDelivery)}</span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.deliveryQty, 0)
          ),
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
        id: "variance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Variance (L)" />,
        meta: { label: "Variance (L)" },
        accessorFn: (row) =>
          (row.reconciledQty ?? row.deliveryQty) - (row.deliveryQty ?? 0),
        cell: ({ row }) => {
          const variance =
            (row.original.reconciledQty ?? row.original.deliveryQty) -
            (row.original.deliveryQty ?? 0);
          return (
            <span
              className={cn(
                "font-mono tabular-nums",
                variance < 0 ? "font-semibold text-red-500" : ""
              )}
            >
              {fmtQty(variance)}
            </span>
          );
        },
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
        <h1 className="text-xl font-semibold text-foreground">Stock Report</h1>
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

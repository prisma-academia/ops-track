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
  deliveryDate: string;
  cycleEndDate: string;
  truckPlate: string;
  productType: string;
  dispatchedQty: number;
  receivedQty: number | null;
  purchasePrice: number;
  deliveryCost: number;
  deliveryRate: number;
  transportTotal: number;
  cycleRevenue: number;
  cycleExpenses: number;
  netProfit: number;
  margin: number;
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

  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(undefined);
  const [appliedStationIds, setAppliedStationIds] = React.useState<string[]>([]);
  const [appliedProduct, setAppliedProduct] = React.useState<string>("ALL");

  const applyFilters = React.useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedProduct(draftProduct);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftProduct]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftProduct("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedProduct("ALL");
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialRows.filter((row) => {
      if (appliedStationIds.length > 0 && !appliedStationIds.includes(row.stationId)) return false;
      if (appliedProduct !== "ALL" && row.productType !== appliedProduct) return false;

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
  }, [initialRows, appliedStationIds, appliedProduct, appliedDateRange]);

  const metrics = React.useMemo(() => {
    let totalReceived = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    filteredRows.forEach((r) => {
      totalReceived += r.receivedQty ?? 0;
      totalRevenue += r.cycleRevenue;
      totalProfit += r.netProfit;
    });

    return { count: filteredRows.length, totalReceived, totalRevenue, totalProfit };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        { key: "deliveries", label: "Deliveries", value: metrics.count, color: "#0d9488" },
        {
          key: "volume",
          label: "Received Volume",
          value: metrics.totalReceived,
          color: "#3b82f6",
          format: (n) => fmtQty(n),
        },
        {
          key: "revenue",
          label: "Gross Revenue",
          value: metrics.totalRevenue,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
        {
          key: "profit",
          label: "Net Revenue",
          value: metrics.totalProfit,
          color: metrics.totalProfit >= 0 ? "#10b981" : "#ef4444",
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
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.deliveryDate), "LLL dd, y")}
          </span>
        ),
      },
      {
        accessorKey: "cycleEndDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle End" />,
        meta: { label: "Cycle End" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.cycleEndDate), "LLL dd, y")}
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
        accessorKey: "dispatchedQty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dispatched Vol." />,
        meta: { label: "Dispatched Volume" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtQty(row.original.dispatchedQty)}</span>
        ),
        footer: ({ table }) =>
          fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.dispatchedQty, 0)
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
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
              {fmtMoney(row.original.deliveryRate)}/L
            </span>
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Landed Cost" />,
        meta: { label: "Landed Cost (Purchase + Transport)" },
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
        accessorKey: "cycleRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Gross Revenue" />,
        meta: { label: "Gross Revenue" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.cycleRevenue)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.cycleRevenue, 0)
          ),
      },
      {
        accessorKey: "cycleExpenses",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle Expenses" />,
        meta: { label: "Cycle Expenses" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-rose-600">
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Net Revenue" />,
        meta: { label: "Net Revenue" },
        cell: ({ row }) => {
          const val = row.original.netProfit;
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
            .rows.reduce((sum, row) => sum + row.original.netProfit, 0);
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
        <h1 className="text-xl font-semibold text-foreground">Delivery Profit &amp; Loss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-delivery product purchase, transport, cycle sales, and net revenue by station.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-delivery-pnl-v4"
        searchPlaceholder="Search station, truck..."
        toolbarActions={filterSheet}
        emptyMessage="No delivery records found for the selected filters."
      />
    </div>
  );
}

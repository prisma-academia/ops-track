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
  type DataTableFilterField,
} from "@/components/tables";
import { cn } from "@/lib/utils";

interface OrderPnlRow {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalCost: number;
  totalAmountSoldQty: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
  truckIds: string[];
  truckLabels: string[];
}

interface Truck {
  id: string;
  plateNumber: string;
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FleetPnlReportManager({
  initialOrders,
  trucks,
}: {
  initialOrders: OrderPnlRow[];
  trucks: Truck[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftSelectedTruckIds, setDraftSelectedTruckIds] = React.useState<string[]>([]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(draftDateRange);
  const [selectedTruckIds, setSelectedTruckIds] = React.useState<string[]>([]);

  const applyFilters = React.useCallback(() => {
    setDateRange(draftDateRange);
    setSelectedTruckIds(draftSelectedTruckIds);
    setIsOpen(false);
  }, [draftDateRange, draftSelectedTruckIds]);

  const clearFilters = React.useCallback(() => {
    setDraftDateRange(undefined);
    setDraftSelectedTruckIds([]);
    setDateRange(undefined);
    setSelectedTruckIds([]);
    setIsOpen(false);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialOrders.filter((row) => {
      if (
        selectedTruckIds.length > 0 &&
        !row.truckIds.some((id) => selectedTruckIds.includes(id))
      ) {
        return false;
      }
      const d = new Date(row.orderDate);
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
  }, [initialOrders, selectedTruckIds, dateRange]);

  const metrics = React.useMemo(() => {
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalExpense = 0;
    let totalTransportCost = 0;
    let totalFleetExpenses = 0;
    let debtOutstanding = 0;
    let profitable = 0;
    let lossMaking = 0;

    filteredRows.forEach((r) => {
      totalRevenue += r.amountSoldRev;
      totalCollected += r.amountPaid;
      totalExpense += r.totalCost;
      totalTransportCost += r.totalTransportCost;
      totalFleetExpenses += r.totalFleetExpenses;
      debtOutstanding += r.debtRemaining;
      if (r.pnl >= 0) profitable += 1;
      else lossMaking += 1;
    });

    return {
      totalRevenue,
      totalCollected,
      totalExpense,
      totalTransportCost,
      totalFleetExpenses,
      netProfit: totalRevenue - totalExpense,
      debtOutstanding,
      profitable,
      lossMaking,
      count: filteredRows.length,
    };
  }, [filteredRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "revenue",
          label: "Revenue",
          value: metrics.totalRevenue,
          color: "#10b981",
          format: (n) => fmtMoney(n),
        },
        {
          key: "expense",
          label: "Expenses",
          value: metrics.totalExpense,
          color: "#f43f5e",
          format: (n) => fmtMoney(n),
        },
        {
          key: "profit",
          label: "Net Profit",
          value: Math.abs(metrics.netProfit),
          color: metrics.netProfit >= 0 ? "#6366f1" : "#e11d48",
          format: () => fmtMoney(metrics.netProfit),
        },
        {
          key: "debt",
          label: "Debt Outstanding",
          value: metrics.debtOutstanding,
          color: "#d97706",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<OrderPnlRow>[]>(
    () => [
      {
        accessorKey: "orderDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        footer: () => "Total",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.orderDate), "LLL dd, y")}
          </span>
        ),
      },
      {
        accessorKey: "orderReference",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
        meta: { label: "Order" },
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span>{row.original.orderReference}</span>
            {/* <span className=" text-muted-foreground">
              {row.original.productType} · {row.original.depot}
            </span> */}
          </div>
        ),
      },
      {
        accessorKey: "productType",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        meta: { label: "Product" },
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
            {row.original.productType}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "trucks",
        accessorFn: (row) => row.truckLabels.join(", "),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Truck(s)" />,
        meta: { label: "Truck(s)" },
        cell: ({ row }) => {
          const labels = row.original.truckLabels;
          if (!labels.length) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 2).map((label) => (
                <Badge key={label} variant="outline" className="font-mono text-[10px]">
                  {label}
                </Badge>
              ))}
              {labels.length > 2 ? (
                <Badge variant="outline" className="text-[10px]">
                  +{labels.length - 2}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "litersOrdered",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Ordered" />,
        meta: { label: "Volume Ordered" },
        cell: ({ row }) => (
          <span className="font-mono  tabular-nums">
            {fmtQty(row.original.litersOrdered)} L
          </span>
        ),
        footer: ({ table }) =>
          `${fmtQty(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.litersOrdered, 0)
          )} L`,
      },
      {
        accessorKey: "totalAmountSoldQty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume Sold" />,
        meta: { label: "Volume Sold" },
        cell: ({ row }) => (
          <span className="font-mono  tabular-nums">
            {fmtQty(row.original.totalAmountSoldQty)} L
          </span>
        ),
        footer: ({ table }) =>
          `${fmtQty(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + row.original.totalAmountSoldQty, 0)
          )} L`,
      },
      {
        accessorKey: "totalCost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost" />,
        meta: { label: "Total Cost" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.totalCost)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.totalCost, 0)
          ),
      },
      {
        accessorKey: "totalTransportCost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transport Cost" />,
        meta: { label: "Transport Cost" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.totalTransportCost)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + row.original.totalTransportCost, 0)
          ),
      },
      {
        accessorKey: "totalFleetExpenses",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fleet Cost" />,
        meta: { label: "Fleet Cost" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{fmtMoney(row.original.totalFleetExpenses)}</span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table
              .getFilteredRowModel()
              .rows.reduce((sum, row) => sum + row.original.totalFleetExpenses, 0)
          ),
      },
      {
        accessorKey: "amountSoldRev",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Revenue" />,
        meta: { label: "Sales Revenue" },
        cell: ({ row }) => (
          <span className="font-mono text-indigo-600 tabular-nums dark:text-indigo-400">
            {fmtMoney(row.original.amountSoldRev)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.amountSoldRev, 0)
          ),
      },
      {
        accessorKey: "amountPaid",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Collected" />,
        meta: { label: "Sales Collected" },
        cell: ({ row }) => (
          <span className="font-mono text-emerald-600 tabular-nums dark:text-emerald-400">
            {fmtMoney(row.original.amountPaid)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.amountPaid, 0)
          ),
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Profit / Loss" />,
        meta: { label: "Profit / Loss" },
        cell: ({ row }) => {
          const isProfit = row.original.pnl >= 0;
          return (
            <span
              className={cn(
                "font-mono ",
                isProfit ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isProfit ? "+" : ""}
              {fmtMoney(row.original.pnl)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.pnl, 0);
          return (
            <span className={cn("font-mono", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {total >= 0 ? "+" : ""}
              {fmtMoney(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "debtRemaining",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Debt Remaining" />,
        meta: { label: "Debt Remaining" },
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono tabular-nums",
              row.original.debtRemaining > 0 ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {fmtMoney(row.original.debtRemaining)}
          </span>
        ),
        footer: ({ table }) =>
          fmtMoney(
            table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.debtRemaining, 0)
          ),
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<OrderPnlRow>[]>(
    () => [
      {
        id: "productType",
        label: "Product",
        options: Array.from(new Set(initialOrders.map((o) => o.productType))).map((p) => ({
          label: p,
          value: p,
        })),
      },
    ],
    [initialOrders]
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
          <SheetDescription>Apply filters to narrow down results.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          <div className="space-y-1 w-full">
            <Label className=" text-muted-foreground">Truck(s)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    draftSelectedTruckIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {draftSelectedTruckIds.length === 0
                    ? "All Trucks"
                    : `${draftSelectedTruckIds.length} truck(s) selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="truck-all"
                      checked={draftSelectedTruckIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setDraftSelectedTruckIds([]);
                      }}
                    />
                    <label htmlFor="truck-all" className="text-sm font-medium leading-none cursor-pointer">
                      All Trucks
                    </label>
                  </div>
                  {trucks.map((t) => (
                    <div key={t.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={`truck-${t.id}`}
                        checked={draftSelectedTruckIds.includes(t.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDraftSelectedTruckIds([...draftSelectedTruckIds, t.id]);
                          } else {
                            setDraftSelectedTruckIds(
                              draftSelectedTruckIds.filter((id) => id !== t.id)
                            );
                          }
                        }}
                      />
                      <label htmlFor={`truck-${t.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {t.plateNumber}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3 w-full">
            <Label className="text-sm">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className=" text-muted-foreground">From</Label>
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
                <Label className=" text-muted-foreground">To</Label>
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
        <h1 className="text-xl text-foreground">Fleet Profit & Loss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order-level revenue, costs, profit/loss, and outstanding debt across fleet operations.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="fleet-pnl-report"
        filterFields={filterFields}
        searchPlaceholder="Search order, depot, truck..."
        toolbarActions={filterSheet}
        rowHref={(row) => `/admin/fleet-pnl-report/${row.id}`}
        emptyMessage="No orders found for the selected filters."
      />
    </div>
  );
}

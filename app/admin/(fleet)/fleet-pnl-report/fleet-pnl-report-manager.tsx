"use client";

import * as React from "react";
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
  TableInsightCards,
  buildPctStats,
  type DataTableFilterField,
} from "@/components/tables";
import { cn } from "@/lib/utils";
import type { FilterFn } from "@tanstack/react-table";

import {
  fmtMoney,
  getFleetPnlColumns,
  PRODUCT_LABELS,
  type FleetPnlTableRow,
} from "./fleet-pnl-columns";

interface Truck {
  id: string;
  plateNumber: string;
}

function last30Days(): DateRange {
  return { from: addDays(new Date(), -30), to: new Date() };
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function matchesDateRange(iso: string, range: DateRange | undefined) {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return false;
  if (range?.from) {
    const start = new Date(range.from);
    start.setHours(0, 0, 0, 0);
    if (created < start) return false;
  }
  if (range?.to) {
    const end = new Date(range.to);
    end.setHours(23, 59, 59, 999);
    if (created > end) return false;
  }
  return true;
}

const globalFilterFn: FilterFn<FleetPnlTableRow> = (row, _columnId, filterValue) => {
  const search = String(filterValue ?? "").trim().toLowerCase();
  if (!search) return true;
  const record = row.original;
  return [
    record.orderReference,
    record.depot,
    record.productType,
    PRODUCT_LABELS[record.productType],
    record.truckLabels.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
};

export function FleetPnlReportManager({
  initialOrders,
  trucks,
}: {
  initialOrders: FleetPnlTableRow[];
  trucks: Truck[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftDateRange, setDraftDateRange] = React.useState<DateRange | undefined>(last30Days);
  const [draftSelectedTruckIds, setDraftSelectedTruckIds] = React.useState<string[]>([]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(last30Days);
  const [selectedTruckIds, setSelectedTruckIds] = React.useState<string[]>([]);

  const [filtersResetKey, setFiltersResetKey] = React.useState(0);

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
    setFiltersResetKey((key) => key + 1);
  }, []);

  const handleDateRangeChange = React.useCallback((range: DateRange | undefined) => {
    setDraftDateRange(range);
    setDateRange(range);
  }, []);

  const filteredRows = React.useMemo(() => {
    return initialOrders.filter((row) => {
      if (
        selectedTruckIds.length > 0 &&
        !row.truckIds.some((id) => selectedTruckIds.includes(id))
      ) {
        return false;
      }
      return matchesDateRange(row.orderDate, dateRange);
    });
  }, [initialOrders, selectedTruckIds, dateRange]);

  const [visibleRows, setVisibleRows] = React.useState<FleetPnlTableRow[]>(filteredRows);

  const metrics = React.useMemo(() => {
    let totalCost = 0;
    let salesRevenue = 0;
    let salesCollected = 0;
    let debtRemaining = 0;
    let profitAndLoss = 0;

    visibleRows.forEach((r) => {
      totalCost += r.totalCost;
      salesRevenue += r.amountSoldRev;
      salesCollected += r.amountPaid;
      debtRemaining += r.debtRemaining;
      profitAndLoss += r.pnl;
    });

    return {
      totalCost,
      salesRevenue,
      salesCollected,
      debtRemaining,
      profitAndLoss,
    };
  }, [visibleRows]);

  const insightStats = React.useMemo(
    () =>
      buildPctStats([
        {
          key: "totalCost",
          label: "Total Cost",
          value: metrics.totalCost,
          color: "#64748b",
          format: (n) => fmtMoney(n),
        },
        {
          key: "salesRevenue",
          label: "Sales Revenue",
          value: metrics.salesRevenue,
          color: "#6366f1",
          format: (n) => fmtMoney(n),
        },
        {
          key: "salesCollected",
          label: "Sales Collected",
          value: metrics.salesCollected,
          color: "#10b981",
          format: (n) => fmtMoney(n),
        },
        {
          key: "debtRemaining",
          label: "Debt Remaining",
          value: metrics.debtRemaining,
          color: "#d97706",
          format: (n) => fmtMoney(n),
        },
        {
          key: "profitAndLoss",
          label: "Profit and Loss",
          value: metrics.profitAndLoss,
          color: metrics.profitAndLoss >= 0 ? "#059669" : "#e11d48",
          format: (n) => fmtMoney(n),
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo(() => getFleetPnlColumns(), []);

  const filterFields = React.useMemo<DataTableFilterField<FleetPnlTableRow>[]>(() => {
    const orders = Array.from(new Set(initialOrders.map((order) => order.orderReference))).sort((a, b) =>
      a.localeCompare(b)
    );
    const products = Array.from(new Set(initialOrders.map((order) => order.productType))).sort((a, b) =>
      a.localeCompare(b)
    );
    const depots = Array.from(new Set(initialOrders.map((order) => order.depot))).sort((a, b) =>
      a.localeCompare(b)
    );

    return [
      {
        id: "orderReference",
        label: "Order",
        options: orders.map((order) => ({ label: order, value: order })),
      },
      {
        id: "productType",
        label: "Product",
        options: products.map((product) => ({
          label: PRODUCT_LABELS[product] ?? product,
          value: product,
        })),
      },
      {
        id: "depot",
        label: "Depot",
        options: depots.map((depot) => ({ label: depot, value: depot })),
      },
    ];
  }, [initialOrders]);

  const hasExternalFilters = selectedTruckIds.length > 0 || Boolean(dateRange?.from || dateRange?.to);

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
                      from: parseDateInput(e.target.value),
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
                      to: parseDateInput(e.target.value),
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
        <h1 className="text-xl text-foreground">Profit & Loss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order-level revenue, costs, profit/loss, and outstanding debt across fleet operations.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="fleet-pnl-report-v3"
        filterFields={filterFields}
        searchPlaceholder="Search order, depot, product, truck..."
        globalFilterFn={globalFilterFn}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        hasExternalFilters={hasExternalFilters}
        onFiltersReset={clearFilters}
        onFilteredRowsChange={setVisibleRows}
        filtersResetKey={filtersResetKey}
        showFacetedFilters
        toolbarActions={filterSheet}
        rowHref={(row) => `/admin/fleet-pnl-report/${row.id}`}
        emptyMessage="No orders found for the selected filters."
      />
    </div>
  );
}

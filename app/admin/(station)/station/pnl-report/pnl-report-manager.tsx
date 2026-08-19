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

interface TransactionRow {
  id: string;
  createdAt: string;
  type: "INFLOW" | "OUTFLOW";
  category: string;
  amount: number;
  description: string | null;
  stationId: string | null;
  station?: { id: string; name: string; code: string };
}

interface Station {
  id: string;
  name: string;
  code: string;
}

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PnlReportManager({
  initialTransactions,
  stations,
}: {
  initialTransactions: TransactionRow[];
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
    return initialTransactions.filter((row) => {
      if (
        selectedStationIds.length > 0 &&
        (!row.stationId || !selectedStationIds.includes(row.stationId))
      ) {
        return false;
      }
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
      return true;
    });
  }, [initialTransactions, selectedStationIds, dateRange]);

  const metrics = React.useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;
    filteredRows.forEach((r) => {
      const amt = Number(r.amount);
      if (r.type === "INFLOW" && r.category === "STATION_SALE") totalRevenue += amt;
      if (r.type === "OUTFLOW" && r.category === "STATION_EXPENSE") totalExpense += amt;
    });
    return {
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
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
          key: "count",
          label: "Transactions",
          value: metrics.count,
          color: "#0d9488",
        },
      ]),
    [metrics]
  );

  const columns = React.useMemo<ColumnDef<TransactionRow>[]>(
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
        id: "stationName",
        accessorFn: (row) => row.station?.name ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => (
          <span className="font-medium">{row.original.station?.name || "—"}</span>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        meta: { label: "Category" },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              row.original.category === "STATION_SALE"
                ? "text-emerald-600 border-emerald-600"
                : "text-rose-600 border-rose-600"
            )}
          >
            {row.original.category.replace(/_/g, " ")}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
        meta: { label: "Description" },
        cell: ({ row }) => (
          <span className="max-w-[240px] truncate text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        meta: { label: "Amount" },
        cell: ({ row }) => {
          const isPos = row.original.type === "INFLOW";
          return (
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                isPos ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPos ? "+" : "-"}
              {fmtMoney(Number(row.original.amount))}
            </span>
          );
        },
        footer: ({ table }) => {
          const net = table.getFilteredRowModel().rows.reduce((sum, row) => {
            const amt = Number(row.original.amount);
            return sum + (row.original.type === "INFLOW" ? amt : -amt);
          }, 0);
          return (
            <span className={cn("font-mono", net >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {net >= 0 ? "+" : "-"}
              {fmtMoney(Math.abs(net))}
            </span>
          );
        },
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<TransactionRow>[]>(
    () => [
      {
        id: "category",
        label: "Category",
        options: [
          { label: "Station Sale", value: "STATION_SALE" },
          { label: "Station Expense", value: "STATION_EXPENSE" },
        ],
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
          <SheetDescription>Apply filters to narrow down results.</SheetDescription>
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
        <h1 className="text-xl font-semibold text-foreground">Station Profit & Loss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, expenses, and net profit across station transactions.
        </p>
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={filteredRows}
        tableId="station-pnl-report"
        filterFields={filterFields}
        searchPlaceholder="Search station, description..."
        toolbarActions={filterSheet}
        emptyMessage="No transactions found for the selected filters."
      />
    </div>
  );
}

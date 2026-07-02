"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  type ColumnDef,
  type ColumnPinningState,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { cn, formatShortCurrency } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  CalendarIcon,
  Truck,
  Layers,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReconciliationRow {
  id: string;
  sn: number;
  deliveryDate: string;
  truckNo: string;
  waybillNumber: string;
  productType: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  deliveryQty: number;
  totalDelivery: number;
  deliveryCost: number;
  stockValue: number;
  reconciledDate: string | null;
  reconciledDeposit: number | null;
  pnl: number | null;
  reconciledStation: string;
  reconciledQty: number | null;
  status: string;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

interface Props {
  initialRows: ReconciliationRow[];
  stations: Station[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy");
}

function fmtQty(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReconciliationReportManager({ initialRows, stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -90),
    to: new Date(),
  });
  const [selectedStationId, setSelectedStationId] = useState<string>("ALL");

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return initialRows
      .filter((row) => {
        if (selectedStationId !== "ALL" && row.stationId !== selectedStationId) return false;
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
      })
      .map((row, i) => ({ ...row, sn: i + 1 })); // Re-number after filter
  }, [initialRows, selectedStationId, dateRange]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalStockValue = 0;
    let totalPnl = 0;
    filteredRows.forEach((r) => {
      totalVolume += r.deliveryQty;
      totalStockValue += r.stockValue;
      if (r.pnl !== null) totalPnl += r.pnl;
    });
    return { count: filteredRows.length, totalVolume, totalStockValue, totalPnl };
  }, [filteredRows]);

  // ── Column defs ───────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ReconciliationRow>[]>(
    () => [
      {
        id: "sn",
        accessorKey: "sn",
        header: "S/N",
        size: 56,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {row.original.sn}
          </span>
        ),
      },
      {
        id: "deliveryDate",
        accessorKey: "deliveryDate",
        header: "Delivery Date",
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {fmtDate(row.original.deliveryDate)}
          </span>
        ),
      },
      {
        id: "truckNo",
        accessorKey: "truckNo",
        header: "Truck No",
        size: 110,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground uppercase whitespace-nowrap">
            {row.original.truckNo}
          </span>
        ),
      },
      {
        id: "stationName",
        accessorKey: "stationName",
        header: "Stations",
        size: 140,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
              {row.original.stationName}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {row.original.stationCode}
            </span>
          </div>
        ),
      },
      {
        id: "deliveryQty",
        accessorKey: "deliveryQty",
        header: () => <div className="text-right whitespace-nowrap">Delivery / Station</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.deliveryQty)}
          </div>
        ),
      },
      {
        id: "totalDelivery",
        accessorKey: "totalDelivery",
        header: () => <div className="text-right whitespace-nowrap">Total Delivery</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums">
            {fmtQty(row.original.totalDelivery)}
          </div>
        ),
      },
      {
        id: "deliveryCost",
        accessorKey: "deliveryCost",
        header: () => <div className="text-right whitespace-nowrap">Delivery Cost</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtMoney(row.original.deliveryCost)}
          </div>
        ),
      },
      {
        id: "stockValue",
        accessorKey: "stockValue",
        header: () => <div className="text-right whitespace-nowrap">Stock Value</div>,
        size: 140,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold text-foreground tabular-nums">
            {fmtMoney(row.original.stockValue)}
          </div>
        ),
      },
      {
        id: "reconciledDate",
        accessorKey: "reconciledDate",
        header: () => <div className="whitespace-nowrap">Reconciled Date</div>,
        size: 130,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {fmtDate(row.original.reconciledDate)}
          </span>
        ),
      },
      {
        id: "reconciledDeposit",
        accessorKey: "reconciledDeposit",
        header: () => <div className="text-right whitespace-nowrap">Reconciled Deposit</div>,
        size: 150,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtMoney(row.original.reconciledDeposit)}
          </div>
        ),
      },
      {
        id: "pnl",
        accessorKey: "pnl",
        header: () => <div className="text-right">P&L</div>,
        size: 130,
        cell: ({ row }) => {
          const v = row.original.pnl;
          if (v === null) return <div className="text-right text-xs text-muted-foreground">—</div>;
          const isPos = v >= 0;
          return (
            <div
              className={cn(
                "text-right text-xs font-mono font-semibold tabular-nums",
                isPos ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPos ? "+" : ""}
              {fmtMoney(v)}
            </div>
          );
        },
      },
      {
        id: "reconciledStation",
        accessorKey: "reconciledStation",
        header: () => <div className="whitespace-nowrap">Reconciled Station</div>,
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.reconciledStation}
          </span>
        ),
      },
      {
        id: "reconciledQty",
        accessorKey: "reconciledQty",
        header: () => <div className="text-right whitespace-nowrap">Reconciled Qty</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.reconciledQty)}
          </div>
        ),
      },
    ],
    []
  );

  // ── Table setup ───────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnPinning] = useState<ColumnPinningState>({
    left: [],
  });

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, columnFilters, columnPinning },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  // ── Stat cards config ─────────────────────────────────────────────────────
  const statCards = [
    {
      title: "Deliveries",
      value: stats.count.toLocaleString(),
      icon: Truck,
      badge: "Filtered",
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
    },
    {
      title: "Total Volume",
      value: `${fmtQty(stats.totalVolume)} L`,
      icon: Layers,
      badge: "Filtered",
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
    },
    {
      title: "Stock Value",
      value: formatShortCurrency(stats.totalStockValue),
      icon: BarChart3,
      badge: "Filtered",
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
    },
    {
      title: "Net P&L",
      value: formatShortCurrency(Math.abs(stats.totalPnl)),
      valueColor: stats.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600",
      icon: stats.totalPnl >= 0 ? TrendingUp : TrendingDown,
      iconColor: stats.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600",
      badge: stats.totalPnl >= 0 ? "Gain" : "Loss",
      badgeColor:
        stats.totalPnl >= 0
          ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-400/10 text-rose-700 dark:text-rose-400",
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-6 transition-all",
        isFullscreen && "bg-background p-6 overflow-auto h-full"
      )}
    >
      {/* ── Header + Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card text-card-foreground p-6 rounded-xl border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reconciliation Report
          </h1>
          <p className="text-muted-foreground text-sm">
            PMS general reconciliation across all stations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
          {/* Station filter */}
          <div className="space-y-1 w-full sm:w-48">
            <Label className="text-xs text-muted-foreground">Station</Label>
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stations</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} –{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fullscreen toggle */}
          <div className="space-y-1 shrink-0">
            <Label className="text-xs text-muted-foreground opacity-0 select-none">
              View
            </Label>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen view"}
              className="h-10 w-10"
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <Card className="p-0 shadow-xs border-border/40">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
          {statCards.map((item, index) => (
            <div
              key={index}
              className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0"
            >
              <div className="p-6 flex items-start justify-between">
                <div className="flex flex-col gap-4">
                  <p className="text-base font-medium text-card-foreground">{item.title}</p>
                  <div>
                    <p className={cn("text-2xl font-medium text-card-foreground", item.valueColor)}>
                      {item.value}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">Period</p>
                      <Badge
                        className={cn(
                          "font-medium text-[10px] uppercase tracking-wider",
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                  <item.icon
                    size={16}
                    className={cn("text-muted-foreground", item.iconColor)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="w-full py-0 overflow-hidden">
        <CardContent className="px-0">
          {/* Scrollable table container */}
          <div className="overflow-x-auto border-t border-border/40 relative">
            <table className="min-w-max w-full text-sm border-collapse">
              <thead className="bg-muted/30">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-none">
                    {headerGroup.headers.map((header) => {
                      const isPinned = header.column.getIsPinned();
                      const pinOffset = isPinned === "left"
                        ? header.column.getStart("left")
                        : undefined;

                      return (
                        <th
                          key={header.id}
                          style={{
                            width: header.column.getSize(),
                            minWidth: header.column.getSize(),
                            left: isPinned === "left" ? pinOffset : undefined,
                          }}
                          className={cn(
                            "h-11 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-left",
                            isPinned === "left" && [
                              "sticky z-20 bg-muted/40",
                              "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/60",
                            ]
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cn(
                                header.column.getCanSort() &&
                                  "flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground transition-colors"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {
                                {
                                  asc: <ChevronUpIcon size={13} />,
                                  desc: <ChevronDownIcon size={13} />,
                                }[header.column.getIsSorted() as string] ?? null
                              }
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-border/30">
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isPinned = cell.column.getIsPinned();
                        const pinOffset =
                          isPinned === "left"
                            ? cell.column.getStart("left")
                            : undefined;

                        return (
                          <td
                            key={cell.id}
                            style={{
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              left: isPinned === "left" ? pinOffset : undefined,
                            }}
                            className={cn(
                              "px-4 py-2.5 whitespace-nowrap text-sm",
                              isPinned === "left" && [
                                "sticky z-10 bg-background group-hover:bg-muted/20 transition-colors",
                                "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/40",
                              ]
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      No reconciliation records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/40 font-bold border-t border-border">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                    {fmtQty(stats.totalVolume)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                    {/* Total Delivery doesn't make sense to sum since it's already aggregated, but we'll leave it blank or sum it if they want. Let's leave blank for logic. */}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                     {/* Delivery Cost is per liter, summing it makes no sense */}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                    {fmtMoney(stats.totalStockValue)}
                  </td>
                  <td colSpan={1} className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                    {fmtMoney(
                      filteredRows.reduce((acc, row) => acc + (row.reconciledDeposit || 0), 0)
                    )}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right text-xs font-mono tabular-nums",
                    stats.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {stats.totalPnl >= 0 ? "+" : ""}
                    {fmtMoney(stats.totalPnl)}
                  </td>
                  <td colSpan={1} className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                    {fmtQty(
                      filteredRows.reduce((acc, row) => acc + (row.reconciledQty || 0), 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border/40 gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-transparent border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden sm:block">
                Showing{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{" "}
                –{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length}
              </div>
            </div>

            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent border-border/40"
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronFirstIcon size={15} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent border-border/40"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeftIcon size={15} />
                  </Button>
                </PaginationItem>
                <div className="text-xs px-2 text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {Math.max(1, table.getPageCount())}
                </div>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent border-border/40"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRightIcon size={15} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent border-border/40"
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronLastIcon size={15} />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

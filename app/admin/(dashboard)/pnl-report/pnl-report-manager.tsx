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
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatShortCurrency } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  Truck,
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  Filter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockReportRow {
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
  buyingPrice: number;
  approvedSalesLiters: number | null;
  sellingPrice: number | null;
  salesRevenue: number | null;
  remainingLiters: number | null;
  remainingStockValue: number | null;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

interface Props {
  initialRows: StockReportRow[];
  stations: Station[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy");
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PnlReportManager({ initialRows, stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftSelectedStationIds, setDraftSelectedStationIds] = useState<string[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  const applyFilters = useCallback(() => {
    setDateRange(draftDateRange);
    setSelectedStationIds(draftSelectedStationIds);
    setIsOpen(false);
  }, [draftDateRange, draftSelectedStationIds]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftSelectedStationIds([]);
    setDateRange(undefined);
    setSelectedStationIds([]);
    setIsOpen(false);
  }, []);

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
      })
      .map((row, i) => ({ ...row, sn: i + 1 })); // Re-number after filter
  }, [initialRows, selectedStationIds, dateRange]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalPnl = 0;
    let totalVariance = 0;
    let totalSalesRevenue = 0;

    filteredRows.forEach((r) => {
      totalVolume += r.deliveryQty;
      if (r.pnl !== null) totalPnl += r.pnl;
      if (r.reconciledQty !== null) {
        totalVariance += (r.reconciledQty - r.totalDelivery);
      }
      if (r.salesRevenue) totalSalesRevenue += r.salesRevenue;
    });
    return { count: filteredRows.length, totalVolume, totalPnl, totalVariance, totalSalesRevenue };
  }, [filteredRows]);

  // ── Column defs ───────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<StockReportRow>[]>(
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
      {
        id: "approvedSalesLiters",
        accessorKey: "approvedSalesLiters",
        header: () => <div className="text-right whitespace-nowrap">Sales Liters</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.approvedSalesLiters)}
          </div>
        ),
      },
      {
        id: "sellingPrice",
        accessorKey: "sellingPrice",
        header: () => <div className="text-right whitespace-nowrap">Selling Price</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtMoney(row.original.sellingPrice)}
          </div>
        ),
      },
      {
        id: "salesRevenue",
        accessorKey: "salesRevenue",
        header: () => <div className="text-right whitespace-nowrap">Sales Revenue</div>,
        size: 140,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold text-foreground tabular-nums">
            {fmtMoney(row.original.salesRevenue)}
          </div>
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
        id: "variance",
        accessorKey: "variance",
        header: () => <div className="text-right whitespace-nowrap">Variance</div>,
        size: 130,
        cell: ({ row }) => {
          const rq = row.original.reconciledQty;
          const td = row.original.totalDelivery;
          if (rq === null || td === null) return <div className="text-right text-xs text-muted-foreground">—</div>;
          const variance = rq - td;
          const isPos = variance > 0;
          const isNeg = variance < 0;
          return (
            <div
              className={cn(
                "text-right text-xs font-mono font-semibold tabular-nums",
                isPos ? "text-amber-500" : isNeg ? "text-rose-600" : "text-emerald-600"
              )}
            >
              {isPos ? "+" : ""}
              {fmtQty(variance)}
            </div>
          );
        },
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
    getSortedRowModel: getSortedRowModel(),
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
      title: "Sales Revenue",
      value: formatShortCurrency(stats.totalSalesRevenue),
      icon: TrendingUp,
      valueColor: "text-emerald-600",
      iconColor: "text-emerald-600",
      badge: "Filtered",
      badgeColor: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      title: "Profit & Loss",
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
        "space-y-6 transition-all print:m-0 print:p-0 print:bg-white print:text-black print:space-y-3",
        isFullscreen && "bg-background p-6 overflow-auto h-full"
      )}
    >
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>
      {/* ── Header + Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
            Profit & Loss Report
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            Stations: {selectedStationIds.length === 0 ? "All Stations" : stations.filter(s => selectedStationIds.includes(s.id)).map(s => s.name).join(", ")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto print:hidden">
          <div className="space-y-1 shrink-0 flex gap-2">
            {/* Filter Sheet */}
            <div>
              <Label className="text-xs text-muted-foreground opacity-0 select-none hidden md:block">Filter</Label>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {(draftSelectedStationIds.length > 0 || draftDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          draftSelectedStationIds.length > 0,
                          !!draftDateRange
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Filter Records</SheetTitle>
                    <SheetDescription>
                      Apply filters to narrow down the table results.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
                    {/* Station filter */}
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
                              <label
                                htmlFor="station-all"
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
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
                                <label
                                  htmlFor={`station-${s.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {s.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-3 w-full">
                      <Label className="text-sm font-semibold">Date Range</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">From</Label>
                          <Input
                            type="date"
                            value={draftDateRange?.from ? format(draftDateRange.from, "yyyy-MM-dd") : ""}
                            onChange={(e) => setDraftDateRange(prev => ({ from: e.target.value ? new Date(e.target.value) : undefined, to: prev?.to }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">To</Label>
                          <Input
                            type="date"
                            value={draftDateRange?.to ? format(draftDateRange.to, "yyyy-MM-dd") : ""}
                            onChange={(e) => setDraftDateRange(prev => ({ from: prev?.from, to: e.target.value ? new Date(e.target.value) : undefined }))}
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
            </div>

            {/* Print button */}
            <div>
              <Label className="text-xs text-muted-foreground opacity-0 select-none hidden md:block">Print</Label>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.print()}
                title="Print report"
                className="h-10 w-10"
              >
                <Printer className="size-4" />
              </Button>
            </div>

            {/* Fullscreen toggle */}
            <div>
              <Label className="text-xs text-muted-foreground opacity-0 select-none hidden md:block">View</Label>
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
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
          {statCards.map((item, index) => (
            <div
              key={index}
              className="lg:w-1/6 md:w-1/3 w-full border-border border-b last:border-b-0 md:border-e md:nth-[3n]:border-e-0 md:nth-[n+4]:border-b-0 lg:border-b-0 lg:border-e lg:last:border-e-0 print:border-none print:w-auto"
            >
              <div className="p-4 flex items-start justify-between print:p-0">
                <div className="flex flex-col gap-2 print:gap-0.5">
                  <p className="text-sm font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                  <div>
                    <p className={cn("text-xl font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>
                      {item.value}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                  <item.icon
                    size={14}
                    className={cn("text-muted-foreground", item.iconColor)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="w-full py-0 overflow-hidden print:shadow-none print:border-none print:bg-transparent">
        <CardContent className="px-0">
          {/* Scrollable table container */}
          <div className="overflow-x-auto border-t border-border/40 relative print:overflow-visible print:border-none print:w-full print:max-w-none">
            <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:border-black/30 print:text-[10px] print:w-full">
              <thead className="bg-muted/50 border-b border-border/50 print:border-black/30 print:bg-transparent">
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
                            "h-9 px-2 py-1.5 text-[11px] font-bold text-foreground bg-muted/50 border border-border/50 print:border-black/30 uppercase tracking-wider whitespace-nowrap text-left print:text-[9px] print:text-black print:bg-transparent",
                            isPinned === "left" && "sticky z-20"
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

              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors group",
                        index % 2 === 0 ? "bg-background" : "bg-muted/5 print:bg-transparent"
                      )}
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
                              "px-2 py-1.5 whitespace-nowrap text-[13px] print:text-[10px] print:py-1 border border-border/50 print:border-black/30 print:text-black",
                              isPinned === "left" && "sticky z-10 bg-inherit"
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
                      No stock report records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/50 font-bold border border-border/50 print:border-black/30 print:bg-transparent">
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-right text-sm border border-border/50 print:border-black/30 print:text-black">
                    Total:
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtQty(stats.totalVolume)}
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtQty(
                      filteredRows.reduce((acc, row) => acc + (row.reconciledQty || 0), 0)
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtQty(
                      filteredRows.reduce((acc, row) => acc + (row.approvedSalesLiters || 0), 0)
                    )}
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(stats.totalSalesRevenue)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(
                      filteredRows.reduce((acc, row) => acc + (row.reconciledDeposit || 0), 0)
                    )}
                  </td>
                  <td className={cn(
                    "px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black",
                    stats.totalPnl >= 0 ? "text-emerald-600 print:text-black" : "text-rose-600 print:text-black"
                  )}>
                    {stats.totalPnl >= 0 ? "+" : ""}
                    {fmtMoney(stats.totalPnl)}
                  </td>
                  <td className={cn(
                    "px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black",
                    stats.totalVariance > 0 ? "text-amber-500 print:text-black" : stats.totalVariance < 0 ? "text-rose-600 print:text-black" : "text-emerald-600 print:text-black"
                  )}>
                    {stats.totalVariance > 0 ? "+" : ""}
                    {fmtQty(stats.totalVariance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

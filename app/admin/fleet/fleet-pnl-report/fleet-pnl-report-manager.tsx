"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, Fragment } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Receipt,
  Wallet,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FleetPnlRow {
  id: string;
  sn: number;
  saleDate: string;
  orderReference: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  loadingCost: number;
  priceBought: number;
  transporterName: string;
  truckNo: string;
  transportRate: number;
  transportCost: number;
  fleetExpenses: number;
  lossDeduction: number;
  totalCost: number;
  soldTo: string;
  litersSold: number;
  sellingPrice: number;
  salesRevenue: number;
  paymentReceived: number;
  balance: number;
  paymentStatus: string;
  pnl: number;
}

interface Props {
  initialRows: FleetPnlRow[];
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

export function FleetPnlReportManager({ initialRows }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  // Custom Filters
  const [draftOrderRef, setDraftOrderRef] = useState("");
  const [draftTransporter, setDraftTransporter] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [orderRefFilter, setOrderRefFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("");

  const applyFilters = useCallback(() => {
    setDateRange(draftDateRange);
    setOrderRefFilter(draftOrderRef);
    setTransporterFilter(draftTransporter);
    setIsOpen(false);
  }, [draftDateRange, draftOrderRef, draftTransporter]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftOrderRef("");
    setDraftTransporter("");
    setDateRange(undefined);
    setOrderRefFilter("");
    setTransporterFilter("");
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
        if (orderRefFilter && !row.orderReference.toLowerCase().includes(orderRefFilter.toLowerCase())) return false;
        if (transporterFilter && !row.transporterName.toLowerCase().includes(transporterFilter.toLowerCase())) return false;
        const d = new Date(row.saleDate);
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
  }, [initialRows, orderRefFilter, transporterFilter, dateRange]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalPnl = 0;
    let totalSalesRevenue = 0;
    let totalOrderCost = 0;
    let totalTransportCost = 0;
    let totalVolume = 0;
    let totalBalance = 0;
    let totalLoadingCost = 0;
    let totalFleetExpenses = 0;
    let totalLossDeduction = 0;
    let totalTotalCost = 0;

    filteredRows.forEach((r) => {
      totalPnl += r.pnl;
      totalSalesRevenue += r.salesRevenue;
      totalOrderCost += r.orderCost;
      totalTransportCost += r.transportCost;
      totalVolume += r.litersSold;
      totalBalance += r.balance;
      totalLoadingCost += r.loadingCost;
      totalFleetExpenses += r.fleetExpenses;
      totalLossDeduction += r.lossDeduction;
      totalTotalCost += r.totalCost;
    });
    
    return { count: filteredRows.length, totalPnl, totalSalesRevenue, totalOrderCost, totalTransportCost, totalVolume, totalBalance, totalLoadingCost, totalFleetExpenses, totalLossDeduction, totalTotalCost };
  }, [filteredRows]);

  // ── Column defs ───────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<FleetPnlRow>[]>(
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
        id: "saleDate",
        accessorKey: "saleDate",
        header: "Sale Date",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {fmtDate(row.original.saleDate)}
          </span>
        ),
      },
      {
        id: "orderReference",
        accessorKey: "orderReference",
        header: "Order Ref",
        size: 110,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground uppercase whitespace-nowrap">
            {row.original.orderReference}
          </span>
        ),
      },
      {
        id: "transporterName",
        accessorKey: "transporterName",
        header: "Transporter",
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {row.original.transporterName}
          </span>
        ),
      },
      {
        id: "truckNo",
        accessorKey: "truckNo",
        header: "Truck No",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {row.original.truckNo}
          </span>
        ),
      },
      {
        id: "priceBought",
        accessorKey: "priceBought",
        header: () => <div className="text-right whitespace-nowrap">Price Bought</div>,
        size: 110,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.priceBought)}
          </div>
        ),
      },
      {
        id: "loadingCost",
        accessorKey: "loadingCost",
        header: () => <div className="text-right whitespace-nowrap">Loading Cost</div>,
        size: 110,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.loadingCost)}
          </div>
        ),
      },
      {
        id: "orderCost",
        accessorKey: "orderCost",
        header: () => <div className="text-right whitespace-nowrap">Order Cost</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.orderCost)}
          </div>
        ),
      },
      {
        id: "transportCost",
        accessorKey: "transportCost",
        header: () => <div className="text-right whitespace-nowrap">Transport Cost</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.transportCost)}
          </div>
        ),
      },
      {
        id: "fleetExpenses",
        accessorKey: "fleetExpenses",
        header: () => <div className="text-right whitespace-nowrap">Fleet Expenses</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.fleetExpenses)}
          </div>
        ),
      },
      {
        id: "lossDeduction",
        accessorKey: "lossDeduction",
        header: () => <div className="text-right whitespace-nowrap">Loss Deduction</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-rose-500">
            {fmtMoney(row.original.lossDeduction)}
          </div>
        ),
      },
      {
        id: "totalCost",
        accessorKey: "totalCost",
        header: () => <div className="text-right whitespace-nowrap font-bold">Total Cost</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-bold tabular-nums h-full w-full flex items-center justify-end px-2 bg-slate-100 dark:bg-slate-800/50 -my-2 py-2">
            {fmtMoney(row.original.totalCost)}
          </div>
        ),
      },
      {
        id: "soldTo",
        accessorKey: "soldTo",
        header: "Sold To",
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {row.original.soldTo}
          </span>
        ),
      },
      {
        id: "litersSold",
        accessorKey: "litersSold",
        header: () => <div className="text-right whitespace-nowrap">Liters Sold</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.litersSold)} L
          </div>
        ),
      },
      {
        id: "sellingPrice",
        accessorKey: "sellingPrice",
        header: () => <div className="text-right whitespace-nowrap">Sold Price</div>,
        size: 110,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtMoney(row.original.sellingPrice)}
          </div>
        ),
      },
      {
        id: "salesRevenue",
        accessorKey: "salesRevenue",
        header: () => <div className="text-right whitespace-nowrap">Sales Rev</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums">
            {fmtMoney(row.original.salesRevenue)}
          </div>
        ),
      },
      {
        id: "balance",
        accessorKey: "balance",
        header: () => <div className="text-right whitespace-nowrap">Balance</div>,
        size: 120,
        cell: ({ row }) => {
          const v = row.original.balance;
          return (
            <div className={cn("text-right text-xs font-mono font-semibold tabular-nums", v > 0 ? "text-amber-600" : "text-emerald-600")}>
              {fmtMoney(v)}
            </div>
          );
        },
      },
      {
        id: "pnl",
        accessorKey: "pnl",
        header: () => <div className="text-right">Profit/Loss</div>,
        size: 130,
        cell: ({ row }) => {
          const v = row.original.pnl;
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
      title: "Sales Count",
      value: stats.count.toLocaleString(),
      fullValue: null,
      icon: Truck,
      badge: "Filtered",
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
    },
    {
      title: "Total Volume",
      value: `${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalVolume)} L`,
      fullValue: `${fmtQty(stats.totalVolume)} L`,
      icon: Layers,
      badge: "Filtered",
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
    },
    {
      title: "Total Order Cost",
      value: formatShortCurrency(stats.totalOrderCost),
      fullValue: fmtMoney(stats.totalOrderCost),
      icon: Wallet,
      valueColor: "text-amber-600",
      iconColor: "text-amber-600",
      badge: "Filtered",
      badgeColor: "bg-amber-400/10 text-amber-700 dark:text-amber-400",
    },
    {
      title: "Transport Cost",
      value: formatShortCurrency(stats.totalTransportCost),
      fullValue: fmtMoney(stats.totalTransportCost),
      icon: Truck,
      valueColor: "text-slate-600",
      iconColor: "text-slate-600",
      badge: "Filtered",
      badgeColor: "bg-slate-400/10 text-slate-700 dark:text-slate-400",
    },
    {
      title: "Sales Revenue",
      value: formatShortCurrency(stats.totalSalesRevenue),
      fullValue: fmtMoney(stats.totalSalesRevenue),
      icon: Receipt,
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
      badge: "Filtered",
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
    },
    {
      title: "Profit & Loss",
      value: formatShortCurrency(Math.abs(stats.totalPnl)),
      fullValue: fmtMoney(Math.abs(stats.totalPnl)),
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
          .hide-on-print { display: none; }
        }
      `}</style>
      {/* ── Header + Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
            Fleet Profit & Loss
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            {orderRefFilter ? `Order Ref: ${orderRefFilter}` : ""} {transporterFilter ? `Transporter: ${transporterFilter}` : ""}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto print:hidden">
          <div className="shrink-0 flex gap-2">
            {/* Filter Sheet */}
            <div>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {(!!draftOrderRef || !!draftTransporter || !!draftDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          !!draftOrderRef,
                          !!draftTransporter,
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

                    {/* Order Filter */}
                    <div className="space-y-3 w-full pt-2">
                      <Label className="text-sm font-semibold">Order Reference</Label>
                      <Input 
                        placeholder="e.g. ORD-1001" 
                        value={draftOrderRef}
                        onChange={(e) => setDraftOrderRef(e.target.value)}
                      />
                    </div>

                    {/* Transporter Filter */}
                    <div className="space-y-3 w-full pt-2">
                      <Label className="text-sm font-semibold">Transporter Name</Label>
                      <Input 
                        placeholder="Search transporter..." 
                        value={draftTransporter}
                        onChange={(e) => setDraftTransporter(e.target.value)}
                      />
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
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
            {statCards.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "w-full lg:w-1/6 md:w-1/3 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  (index + 1) % 3 === 0 ? "md:border-e-0" : "md:border-e",
                  index >= 3 ? "md:border-b-0" : "md:border-b",
                  "lg:border-b-0",
                  index === statCards.length - 1 ? "lg:border-e-0" : "lg:border-e"
                )}
              >
                {item.fullValue ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 flex items-start justify-between print:p-0 cursor-default hover:bg-muted/30 transition-colors h-full">
                        <div className="flex flex-col gap-2 print:gap-0.5">
                          <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                          <div>
                            <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", (item as any).valueColor)}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                          <item.icon
                            size={14}
                            className={cn("text-muted-foreground", (item as any).iconColor)}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                      {item.fullValue}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="p-4 flex items-start justify-between print:p-0 h-full">
                    <div className="flex flex-col gap-2 print:gap-0.5">
                      <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                      <div>
                        <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", (item as any).valueColor)}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                      <item.icon
                        size={14}
                        className={cn("text-muted-foreground", (item as any).iconColor)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

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
                    <Fragment key={row.id}>
                      <tr
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
                                "h-11 px-2 py-1.5 border border-border/50 print:border-black/30",
                                isPinned === "left" &&
                                  "sticky z-10 bg-inherit group-hover:bg-muted/20"
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      No fleet PnL records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/50 font-bold border border-border/50 print:border-black/30 print:bg-transparent">
                <tr>
                  <td colSpan={5} className="px-2 py-2 text-right text-sm border border-border/50 print:border-black/30 print:text-black">
                    Total:
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black text-slate-500">
                    {fmtMoney(stats.totalLoadingCost)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black text-slate-500">
                    {fmtMoney(stats.totalOrderCost)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black text-slate-500">
                    {fmtMoney(stats.totalTransportCost)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black text-slate-500">
                    {fmtMoney(stats.totalFleetExpenses)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black text-rose-500">
                    {fmtMoney(stats.totalLossDeduction)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono font-bold tabular-nums bg-slate-100 dark:bg-slate-800/50 border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(stats.totalTotalCost)}
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtQty(stats.totalVolume)} L
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(stats.totalSalesRevenue)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(stats.totalBalance)}
                  </td>
                  <td className={cn(
                    "px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black",
                    stats.totalPnl >= 0 ? "text-emerald-600 print:text-black" : "text-rose-600 print:text-black"
                  )}>
                    {stats.totalPnl >= 0 ? "+" : ""}
                    {fmtMoney(stats.totalPnl)}
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

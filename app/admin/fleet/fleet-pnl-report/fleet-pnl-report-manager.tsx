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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  ArrowRight,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FleetPnlTransportRow {
  id: string;
  truckNumber: string;
  driverName: string;
  transporterName: string;
  ratePerLiter: number;
  maintenanceCost: number;
  totalDeduction: number;
  litersCarried: number;
  litersDelivered: number;
  salesCount: number;
  totalTransportCost: number;
  amountSoldRev: number;
  amountPaid: number;
}

interface FleetPnlRow {
  id: string; // The order ID
  sn: number;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  loadingCost: number;
  priceBought: number;
  totalTransportCost: number;
  totalFleetExpenses: number;
  totalLossDeduction: number;
  totalCost: number;
  totalAmountSoldQty: number;
  qtyBalance: number;
  amountSoldRev: number;
  amountPaid: number;
  debtRemaining: number;
  pnl: number;
  transports?: FleetPnlTransportRow[];
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

function SearchSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          {value ? <span className="truncate">{value}</span> : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="--clear--"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-muted-foreground italic justify-center text-xs"
              >
                Clear selection
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(currentValue) => {
                    // CommandItem lowercases the value by default, use original option
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
  const [draftDepot, setDraftDepot] = useState("");
  const [draftProduct, setDraftProduct] = useState("");
  const [draftTransport, setDraftTransport] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [orderRefFilter, setOrderRefFilter] = useState("");
  const [depotFilter, setDepotFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [transportFilter, setTransportFilter] = useState("");

  const applyFilters = useCallback(() => {
    setDateRange(draftDateRange);
    setOrderRefFilter(draftOrderRef);
    setDepotFilter(draftDepot);
    setProductFilter(draftProduct);
    setTransportFilter(draftTransport);
    setIsOpen(false);
  }, [draftDateRange, draftOrderRef, draftDepot, draftProduct, draftTransport]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftOrderRef("");
    setDraftDepot("");
    setDraftProduct("");
    setDraftTransport("");
    setDateRange(undefined);
    setOrderRefFilter("");
    setDepotFilter("");
    setProductFilter("");
    setTransportFilter("");
    setIsOpen(false);
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Pre-calculate unique values for comboboxes
  const uniqueOrderRefs = useMemo(() => Array.from(new Set(initialRows.map(r => r.orderReference).filter(Boolean))), [initialRows]);
  const uniqueDepots = useMemo(() => Array.from(new Set(initialRows.map(r => r.depot).filter(Boolean))), [initialRows]);
  const uniqueProducts = useMemo(() => Array.from(new Set(initialRows.map(r => r.productType).filter(Boolean))), [initialRows]);
  const uniqueTransporters = useMemo(() => {
    const transporters = new Set<string>();
    initialRows.forEach(r => {
      r.transports?.forEach(t => {
        if (t.transporterName) transporters.add(t.transporterName);
      });
    });
    return Array.from(transporters);
  }, [initialRows]);

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
        if (orderRefFilter && row.orderReference !== orderRefFilter) return false;
        if (depotFilter && row.depot !== depotFilter) return false;
        if (productFilter && row.productType !== productFilter) return false;
        if (transportFilter) {
          const match = row.transports?.some(t => 
            t.transporterName === transportFilter
          );
          if (!match) return false;
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
      })
      .map((row, i) => ({ ...row, sn: i + 1 })); // Re-number after filter
  }, [initialRows, orderRefFilter, dateRange]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalPnl = 0;
    let totalSalesRevenue = 0;
    let totalOrderCost = 0;
    let totalTransportCost = 0;
    let totalVolume = 0;
    let totalBalance = 0; // mapping to debtRemaining
    let totalLoadingCost = 0;
    let totalFleetExpenses = 0;
    let totalLossDeduction = 0;
    let totalTotalCost = 0;

    filteredRows.forEach((r) => {
      totalPnl += r.pnl;
      totalSalesRevenue += r.amountSoldRev;
      totalOrderCost += r.orderCost;
      totalTransportCost += r.totalTransportCost;
      totalVolume += r.litersOrdered;
      totalBalance += r.debtRemaining;
      totalLoadingCost += r.loadingCost;
      totalFleetExpenses += r.totalFleetExpenses;
      totalLossDeduction += r.totalLossDeduction;
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
        id: "orderDate",
        accessorKey: "orderDate",
        header: "Date",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {fmtDate(row.original.orderDate)}
          </span>
        ),
      },
      {
        id: "depot",
        accessorKey: "depot",
        header: "Depot",
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {row.original.depot}
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
        id: "productType",
        accessorKey: "productType",
        header: "Product",
        size: 90,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {row.original.productType}
          </span>
        ),
      },
      {
        id: "litersOrdered",
        accessorKey: "litersOrdered",
        header: () => <div className="text-right whitespace-nowrap">Liters Ordered</div>,
        size: 110,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-foreground font-bold">
            {fmtQty(row.original.litersOrdered)}
          </div>
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
        id: "totalTransportCost",
        accessorKey: "totalTransportCost",
        header: () => <div className="text-right whitespace-nowrap">Transport Cost</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.totalTransportCost)}
          </div>
        ),
      },
      {
        id: "totalFleetExpenses",
        accessorKey: "totalFleetExpenses",
        header: () => <div className="text-right whitespace-nowrap">Fleet Expenses</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-slate-500">
            {fmtMoney(row.original.totalFleetExpenses)}
          </div>
        ),
      },
      {
        id: "totalLossDeduction",
        accessorKey: "totalLossDeduction",
        header: () => <div className="text-right whitespace-nowrap">Loss Deduction</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums text-rose-500">
            {fmtMoney(row.original.totalLossDeduction)}
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
        id: "totalAmountSoldQty",
        accessorKey: "totalAmountSoldQty",
        header: () => <div className="text-right whitespace-nowrap">Qty Sold</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.totalAmountSoldQty)} L
          </div>
        ),
      },
      {
        id: "qtyBalance",
        accessorKey: "qtyBalance",
        header: () => <div className="text-right whitespace-nowrap">Qty Balance</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono tabular-nums">
            {fmtQty(row.original.qtyBalance)} L
          </div>
        ),
      },
      {
        id: "amountSoldRev",
        accessorKey: "amountSoldRev",
        header: () => <div className="text-right whitespace-nowrap">Amount Sold Rev</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums">
            {fmtMoney(row.original.amountSoldRev)}
          </div>
        ),
      },
      {
        id: "amountPaid",
        accessorKey: "amountPaid",
        header: () => <div className="text-right whitespace-nowrap">Amount Paid</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold tabular-nums text-emerald-600">
            {fmtMoney(row.original.amountPaid)}
          </div>
        ),
      },
      {
        id: "debtRemaining",
        accessorKey: "debtRemaining",
        header: () => <div className="text-right whitespace-nowrap">Debt Remaining</div>,
        size: 120,
        cell: ({ row }) => {
          const v = row.original.debtRemaining;
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
      {
        id: "actions",
        accessorKey: "actions",
        header: () => <div className="text-right">Actions</div>,
        size: 140,
        cell: ({ row }) => {
          return (
            <div className="flex justify-end gap-2">
              {row.original.transports && row.original.transports.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleExpanded(row.id)}
                  className="h-8 px-2"
                >
                  {expanded[row.id] ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild className="h-8 px-2 print:hidden">
                <Link href={`/admin/fleet/fleet-pnl-report/${row.original.id}`}>
                  Details <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          );
        }
      }
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
      title: "Order Count",
      value: stats.count.toLocaleString(),
      fullValue: null,
      icon: Truck,
      badge: "Filtered",
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
    },
    {
      title: "Liters Ordered",
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
            Sales Report
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            {orderRefFilter ? `Order Ref: ${orderRefFilter}` : ""}
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
                    {(!!draftOrderRef || !!draftDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          !!draftOrderRef,
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
                      <SearchSelect 
                        value={draftOrderRef} 
                        onChange={setDraftOrderRef} 
                        options={uniqueOrderRefs} 
                        placeholder="Select order..." 
                      />
                    </div>

                    <div className="space-y-3 w-full pt-2">
                      <Label className="text-sm font-semibold">Depot</Label>
                      <SearchSelect 
                        value={draftDepot} 
                        onChange={setDraftDepot} 
                        options={uniqueDepots} 
                        placeholder="Select depot..." 
                      />
                    </div>

                    <div className="space-y-3 w-full pt-2">
                      <Label className="text-sm font-semibold">Product Type</Label>
                      <SearchSelect 
                        value={draftProduct} 
                        onChange={setDraftProduct} 
                        options={uniqueProducts} 
                        placeholder="Select product..." 
                      />
                    </div>

                    <div className="space-y-3 w-full pt-2">
                      <Label className="text-sm font-semibold">Transporter</Label>
                      <SearchSelect 
                        value={draftTransport} 
                        onChange={setDraftTransport} 
                        options={uniqueTransporters} 
                        placeholder="Select transporter..." 
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
                      {expanded[row.id] && row.original.transports && row.original.transports.length > 0 && (
                        <tr>
                          <td colSpan={columns.length} className="p-0 border border-border/50 bg-muted/10 print:border-black/30">
                            <div className="p-4 pl-12 overflow-x-auto w-full">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Truck className="size-4" /> Transports for {row.original.orderReference}
                              </h4>
                              <table className="w-full min-w-max text-[11px] border-collapse border border-border/50">
                                <thead className="bg-muted/50 border-b border-border/50">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-semibold">Truck</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Driver</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Transporter</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Rate/L</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Trans. Cost</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Maintenance</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Deduction</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Rev. Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.original.transports.map((t, idx) => (
                                    <tr key={t.id || idx} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                      <td className="px-2 py-1.5">{t.truckNumber}</td>
                                      <td className="px-2 py-1.5">{t.driverName}</td>
                                      <td className="px-2 py-1.5">{t.transporterName}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMoney(t.ratePerLiter)}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{fmtMoney(t.totalTransportCost)}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtMoney(t.maintenanceCost)}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-rose-500">{fmtMoney(t.totalDeduction)}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{fmtMoney(t.amountSoldRev)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
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
                  {/* SN(1) + orderDate(2) + depot(3) + orderReference(4) + productType(5) + litersOrdered(6) */}
                  <td colSpan={6} className="px-2 py-2 text-right text-sm border border-border/50 print:border-black/30 print:text-black">
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
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {fmtMoney(stats.totalSalesRevenue)}
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
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
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

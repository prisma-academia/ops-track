"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { addDays, format, parseISO } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  TrendingUp,
  TrendingDown,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  Filter,
  Wallet,
  Receipt,
  HandCoins,
} from "lucide-react";
import { StatSparkline } from "@/components/charts/stat-sparkline";

interface OrderPnlRow {
  id: string;
  orderDate: string;
  orderReference: string;
  depot: string;
  productType: string;
  litersOrdered: number;
  orderCost: number;
  totalLoadingCost: number;
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
  truckIds: string[];
  truckLabels: string[];
}

interface Truck {
  id: string;
  name: string | null;
  plateNumber: string;
}

interface Props {
  initialOrders: OrderPnlRow[];
  trucks: Truck[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy");
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FleetPnlReportManager({ initialOrders, trucks }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftSelectedTruckIds, setDraftSelectedTruckIds] = useState<string[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);

  const applyFilters = useCallback(() => {
    setDateRange(draftDateRange);
    setSelectedTruckIds(draftSelectedTruckIds);
    setIsOpen(false);
  }, [draftDateRange, draftSelectedTruckIds]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftSelectedTruckIds([]);
    setDateRange(undefined);
    setSelectedTruckIds([]);
    setIsOpen(false);
  }, []);

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
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const filteredRows = useMemo(() => {
    return initialOrders
      .filter((row) => {
        if (selectedTruckIds.length > 0 && !row.truckIds.some((id) => selectedTruckIds.includes(id))) return false;
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
      .map((row, i) => ({ ...row, sn: i + 1 }));
  }, [initialOrders, selectedTruckIds, dateRange]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;
    let debtOutstanding = 0;

    filteredRows.forEach((r) => {
      totalRevenue += r.amountSoldRev;
      totalExpense += r.totalCost;
      debtOutstanding += r.debtRemaining;
    });

    const netProfit = totalRevenue - totalExpense;

    return { totalRevenue, totalExpense, netProfit, debtOutstanding };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const grouped = filteredRows.reduce((acc, curr) => {
      const date = format(parseISO(curr.orderDate), "MMM dd");
      if (!acc[date]) {
        acc[date] = { date, Revenue: 0, Expenses: 0, Profit: 0 };
      }
      acc[date].Revenue += curr.amountSoldRev;
      acc[date].Expenses += curr.totalCost;
      acc[date].Profit += curr.pnl;
      return acc;
    }, {} as Record<string, { date: string; Revenue: number; Expenses: number; Profit: number }>);

    return Object.values(grouped).reverse();
  }, [filteredRows]);

  const columns = useMemo<ColumnDef<OrderPnlRow & { sn: number }>[]>(
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
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {fmtDate(row.original.orderDate)}
          </span>
        ),
      },
      {
        id: "orderReference",
        accessorKey: "orderReference",
        header: "Order",
        size: 170,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
              {row.original.orderReference}
            </span>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono uppercase">
                {row.original.productType}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{row.original.depot}</span>
            </div>
          </div>
        ),
      },
      {
        id: "trucks",
        accessorKey: "truckLabels",
        header: "Truck(s)",
        size: 150,
        cell: ({ row }) => {
          const labels = row.original.truckLabels;
          if (!labels.length) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1 max-w-[140px]">
              {labels.slice(0, 2).map((label) => (
                <Badge key={label} variant="outline" className="text-[10px] font-mono">
                  {label}
                </Badge>
              ))}
              {labels.length > 2 && (
                <Badge variant="outline" className="text-[10px]">
                  +{labels.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "volume",
        accessorKey: "litersOrdered",
        header: () => <div className="text-right whitespace-nowrap">Volume (Ordered / Sold)</div>,
        size: 160,
        cell: ({ row }) => (
          <div className="flex flex-col items-end gap-0.5 font-mono">
            <span className="text-xs font-medium text-foreground">{fmtQty(row.original.litersOrdered)} L</span>
            <span className="text-[10px] text-muted-foreground">{fmtQty(row.original.totalAmountSoldQty)} L sold</span>
          </div>
        ),
      },
      {
        id: "totalCost",
        accessorKey: "totalCost",
        header: () => <div className="text-right whitespace-nowrap">Cost Breakdown</div>,
        size: 190,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-col items-end gap-0.5 font-mono">
              <span className="text-xs font-semibold text-foreground">{fmtMoney(r.totalCost)}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                Cogs: {fmtMoney(r.orderCost)} · Trans: {fmtMoney(r.totalTransportCost)} · Exp: {fmtMoney(r.totalFleetExpenses)}
              </span>
            </div>
          );
        },
      },
      {
        id: "amountSoldRev",
        accessorKey: "amountSoldRev",
        header: () => <div className="text-right whitespace-nowrap">Revenue</div>,
        size: 130,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
            {fmtMoney(row.original.amountSoldRev)}
          </div>
        ),
      },
      {
        id: "pnl",
        accessorKey: "pnl",
        header: () => <div className="text-right whitespace-nowrap">Profit / Loss</div>,
        size: 130,
        cell: ({ row }) => {
          const isProfit = row.original.pnl >= 0;
          return (
            <div className="text-right">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-mono font-bold",
                  isProfit ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
                )}
              >
                {isProfit ? "+" : ""}
                {fmtMoney(row.original.pnl)}
              </span>
            </div>
          );
        },
      },
      {
        id: "debtRemaining",
        accessorKey: "debtRemaining",
        header: () => <div className="text-right whitespace-nowrap">Debt Remaining</div>,
        size: 130,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right text-xs font-mono font-semibold",
              row.original.debtRemaining > 0 ? "text-amber-600" : "text-muted-foreground/60"
            )}
          >
            {fmtMoney(row.original.debtRemaining)}
          </div>
        ),
      },
    ],
    []
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
      <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
            Fleet Profit & Loss
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            Trucks: {selectedTruckIds.length === 0 ? "All Trucks" : trucks.filter(t => selectedTruckIds.includes(t.id)).map(t => t.plateNumber).join(", ")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto print:hidden">
          <div className="shrink-0 flex gap-2">
            <div>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {(draftSelectedTruckIds.length > 0 || draftDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          draftSelectedTruckIds.length > 0,
                          !!draftDateRange
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Filter Records</SheetTitle>
                    <SheetDescription>Apply filters to narrow down results.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground">Truck(s)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", draftSelectedTruckIds.length === 0 && "text-muted-foreground")}>
                            {draftSelectedTruckIds.length === 0 ? "All Trucks" : `${draftSelectedTruckIds.length} truck(s) selected`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id="truck-all"
                                checked={draftSelectedTruckIds.length === 0}
                                onCheckedChange={(checked) => { if (checked) setDraftSelectedTruckIds([]); }}
                              />
                              <label htmlFor="truck-all" className="text-sm font-medium leading-none cursor-pointer">All Trucks</label>
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
                                      setDraftSelectedTruckIds(draftSelectedTruckIds.filter((id) => id !== t.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`truck-${t.id}`} className="text-sm font-medium leading-none cursor-pointer">{t.plateNumber}</label>
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
                    <Button variant="outline" onClick={clearFilters} className="w-full">Reset Filters</Button>
                    <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Print report" className="h-10 w-10">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen view"} className="h-10 w-10">
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 hide-on-print">
        {[
          {
            title: "Total Revenue",
            value: formatShortCurrency(stats.totalRevenue),
            fullValue: fmtMoney(stats.totalRevenue),
            icon: Wallet,
            iconColor: "text-emerald-600",
            valueColor: "text-emerald-600",
            sparkColor: "#10b981",
            sparkKey: "Revenue",
            sparkType: "line" as const,
          },
          {
            title: "Total Expenses",
            value: formatShortCurrency(stats.totalExpense),
            fullValue: fmtMoney(stats.totalExpense),
            icon: Receipt,
            iconColor: "text-rose-600",
            valueColor: "text-rose-600",
            sparkColor: "#f43f5e",
            sparkKey: "Expenses",
            sparkType: "bar" as const,
          },
          {
            title: "Net Profit",
            value: formatShortCurrency(stats.netProfit),
            fullValue: fmtMoney(stats.netProfit),
            icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
            iconColor: stats.netProfit >= 0 ? "text-indigo-600" : "text-rose-600",
            valueColor: stats.netProfit >= 0 ? "text-indigo-600" : "text-rose-600",
            sparkColor: stats.netProfit >= 0 ? "#6366f1" : "#f43f5e",
            sparkKey: "Profit",
            sparkType: "line" as const,
          },
          {
            title: "Debt Outstanding",
            value: formatShortCurrency(stats.debtOutstanding),
            fullValue: fmtMoney(stats.debtOutstanding),
            icon: HandCoins,
            iconColor: "text-amber-600",
            valueColor: "text-amber-600",
            sparkColor: "#f59e0b",
            sparkKey: "Revenue",
            sparkType: "bar" as const,
          },
        ].map((item, index) => (
          <TooltipProvider key={index} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border/40 shadow-xs cursor-default hover:bg-muted/30 transition-colors print:shadow-none print:border-none">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-lg font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                    <StatSparkline
                      data={chartData}
                      dataKey={item.sparkKey}
                      type={item.sparkType}
                      color={item.sparkColor}
                      height={40}
                    />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                {item.fullValue}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Print-friendly compact stat cards (no charts) */}
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 hidden print:flex print:border-none print:shadow-none print:bg-transparent">
          <CardContent className="flex items-center w-full print:gap-4 print:justify-between px-0">
            {[
              { title: "Total Revenue", value: fmtMoney(stats.totalRevenue), valueColor: "text-emerald-600" },
              { title: "Total Expenses", value: fmtMoney(stats.totalExpense), valueColor: "text-rose-600" },
              { title: "Net Profit", value: fmtMoney(stats.netProfit), valueColor: stats.netProfit >= 0 ? "text-indigo-600" : "text-rose-600" },
              { title: "Debt Outstanding", value: fmtMoney(stats.debtOutstanding), valueColor: "text-amber-600" },
            ].map((item, index) => (
              <div key={index} className="flex flex-col gap-0.5">
                <p className="text-[10px] text-black/60 uppercase tracking-wider font-medium">{item.title}</p>
                <p className={cn("text-[13px] font-semibold text-black")}>{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      <Card className="w-full py-0 overflow-hidden print:shadow-none print:border-none print:bg-transparent">
        <CardContent className="px-0">
          <div className="overflow-x-auto border-t border-border/40 relative print:overflow-visible print:border-none print:w-full print:max-w-none">
            <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:border-black/30 print:text-[10px] print:w-full">
              <thead className="bg-muted/50 border-b border-border/50 print:border-black/30 print:bg-transparent">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-none">
                    {headerGroup.headers.map((header) => {
                      return (
                        <th
                          key={header.id}
                          style={{
                            width: header.column.getSize(),
                            minWidth: header.column.getSize(),
                          }}
                          className={cn(
                            "h-9 px-2 py-1.5 text-[11px] font-bold text-foreground bg-muted/50 border border-border/50 print:border-black/30 uppercase tracking-wider whitespace-nowrap text-left print:text-[9px] print:text-black print:bg-transparent"
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
                      onClick={() => router.push(`/admin/fleet-pnl-report/${row.original.id}`)}
                      className={cn(
                        "group border-b border-border/50 hover:bg-muted/30 transition-colors print:border-black/30 cursor-pointer print:cursor-auto",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/10 print:bg-transparent"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-2 py-1.5 align-middle border-x border-border/50 print:border-black/30"
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground border-x border-b border-border/50"
                    >
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn, formatShortCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  Truck,
  TrendingUp,
  TrendingDown,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  Filter,
  BarChart3,
  Wallet
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DeliveryPnlRow {
  sn: number;
  id: string;
  stationId: string;
  stationName: string;
  deliveryDate: string;
  cycleEndDate: string;
  truckPlate: string;
  productType: string;
  deliveryQty: number;
  deliveryCost: number;
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

interface Props {
  initialRows: DeliveryPnlRow[];
  stations: Station[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy");
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L`;
}

export function DeliveryPnlManager({ initialRows, stations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(undefined);
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
      .map((row, i) => ({ ...row, sn: i + 1 }));
  }, [initialRows, selectedStationIds, dateRange]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalProfit = 0;

    filteredRows.forEach((r) => {
      totalRevenue += r.cycleRevenue;
      totalExpenses += r.cycleExpenses;
      totalProfit += r.netProfit;
    });

    return { totalRevenue, totalExpenses, totalProfit };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const grouped = filteredRows.reduce((acc, curr) => {
      const dateStr = format(parseISO(curr.deliveryDate), "MMM dd");
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, Profit: 0 };
      }
      acc[dateStr].Profit += curr.netProfit;
      return acc;
    }, {} as Record<string, { date: string, Profit: number }>);
    return Object.values(grouped).reverse().slice(-14); // Last 14 deliveries
  }, [filteredRows]);

  const columns = useMemo<ColumnDef<DeliveryPnlRow>[]>(
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
        id: "stationName",
        accessorKey: "stationName",
        header: "Station",
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs font-semibold whitespace-nowrap">
            {row.original.stationName}
          </span>
        ),
      },
      {
        id: "deliveryDate",
        accessorKey: "deliveryDate",
        header: "Cycle Start (Delivery)",
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-foreground font-mono">
            {fmtDate(row.original.deliveryDate)}
          </span>
        ),
      },
      {
        id: "cycleEndDate",
        accessorKey: "cycleEndDate",
        header: "Cycle End",
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {fmtDate(row.original.cycleEndDate)}
          </span>
        ),
      },
      {
        id: "deliveryQty",
        accessorKey: "deliveryQty",
        header: () => <div className="text-right whitespace-nowrap">Volume</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold text-blue-600 tabular-nums">
            {fmtQty(row.original.deliveryQty)}
          </div>
        ),
      },
      {
        id: "cycleRevenue",
        accessorKey: "cycleRevenue",
        header: () => <div className="text-right whitespace-nowrap">Cycle Revenue</div>,
        size: 140,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-bold tabular-nums">
            {fmtMoney(row.original.cycleRevenue)}
          </div>
        ),
      },
      {
        id: "cycleExpenses",
        accessorKey: "cycleExpenses",
        header: () => <div className="text-right whitespace-nowrap">Cycle Expenses</div>,
        size: 140,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-bold text-rose-600 tabular-nums">
            {fmtMoney(row.original.cycleExpenses)}
          </div>
        ),
      },
      {
        id: "netProfit",
        accessorKey: "netProfit",
        header: () => <div className="text-right whitespace-nowrap">Net Profit</div>,
        size: 140,
        cell: ({ row }) => {
          const val = row.original.netProfit;
          return (
            <div className={cn("text-right text-xs font-mono font-bold tabular-nums", val >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {fmtMoney(val)}
            </div>
          );
        },
      },
      {
        id: "margin",
        accessorKey: "margin",
        header: () => <div className="text-right whitespace-nowrap">Margin</div>,
        size: 100,
        cell: ({ row }) => {
          const val = row.original.margin;
          return (
            <div className={cn("text-right text-[11px] font-bold", val >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {val.toFixed(2)}%
            </div>
          );
        },
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
            Per-Delivery Profitability
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
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
                    <SheetDescription>Apply filters to narrow down results.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground">Station(s)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", draftSelectedStationIds.length === 0 && "text-muted-foreground")}>
                            {draftSelectedStationIds.length === 0 ? "All Stations" : `${draftSelectedStationIds.length} station(s) selected`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id="station-all"
                                checked={draftSelectedStationIds.length === 0}
                                onCheckedChange={(checked) => { if (checked) setDraftSelectedStationIds([]); }}
                              />
                              <label htmlFor="station-all" className="text-sm font-medium leading-none cursor-pointer">All Stations</label>
                            </div>
                            {stations.map((t) => (
                              <div key={t.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                  id={`station-${t.id}`}
                                  checked={draftSelectedStationIds.includes(t.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDraftSelectedStationIds([...draftSelectedStationIds, t.id]);
                                    } else {
                                      setDraftSelectedStationIds(draftSelectedStationIds.filter((id) => id !== t.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`station-${t.id}`} className="text-sm font-medium leading-none cursor-pointer">{t.name}</label>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                 <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Cycle Revenue</p>
             </div>
             <p className="text-3xl font-bold text-emerald-600">{formatShortCurrency(stats.totalRevenue)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-full">
                 <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Cycle Expenses</p>
             </div>
             <p className="text-3xl font-bold text-rose-600">{formatShortCurrency(stats.totalExpenses)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className={cn("p-2 rounded-full", stats.totalProfit >= 0 ? "bg-indigo-100 dark:bg-indigo-900" : "bg-red-100 dark:bg-red-900")}>
                 {stats.totalProfit >= 0 ? <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Profit</p>
             </div>
             <p className={cn("text-3xl font-bold", stats.totalProfit >= 0 ? "text-indigo-600" : "text-red-600")}>{formatShortCurrency(stats.totalProfit)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalProfit)}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-border/40 shadow-xs hide-on-print">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Per-Delivery Net Profit Trend
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₦${(value / 1000).toFixed(1)}k`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [fmtMoney(Number(value)), undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Profit" name="Net Profit" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
                      className={cn(
                        "group border-b border-border/50 hover:bg-muted/30 transition-colors print:border-black/30",
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
                      No delivery records found.
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

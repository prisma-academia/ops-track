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
  PieChart as PieChartIcon
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

interface TransactionRow {
  id: string;
  createdAt: string;
  type: "INFLOW" | "OUTFLOW";
  category: string;
  amount: number;
  paymentPurpose: string | null;
  description: string | null;
  stationId: string | null;
  station?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Station {
  id: string;
  name: string;
  code: string;
}

interface Props {
  initialTransactions: TransactionRow[];
  stations: Station[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PnlReportManager({ initialTransactions, stations }: Props) {
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
    return initialTransactions
      .filter((row) => {
        if (selectedStationIds.length > 0 && (!row.stationId || !selectedStationIds.includes(row.stationId))) return false;
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
      })
      .map((row, i) => ({ ...row, sn: i + 1 }));
  }, [initialTransactions, selectedStationIds, dateRange]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;

    filteredRows.forEach((r) => {
      const amt = Number(r.amount);
      if (r.type === "INFLOW" && r.category === "STATION_SALE") totalRevenue += amt;
      if (r.type === "OUTFLOW" && r.category === "STATION_EXPENSE") totalExpense += amt;
    });

    const netProfit = totalRevenue - totalExpense;

    return { totalRevenue, totalExpense, netProfit };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const grouped = filteredRows.reduce((acc, curr) => {
      const date = format(parseISO(curr.createdAt), "MMM dd");
      if (!acc[date]) {
        acc[date] = { date, Revenue: 0, Expenses: 0, Profit: 0 };
      }
      const amt = Number(curr.amount);
      if (curr.type === "INFLOW" && curr.category === "STATION_SALE") {
        acc[date].Revenue += amt;
      }
      if (curr.type === "OUTFLOW" && curr.category === "STATION_EXPENSE") {
        acc[date].Expenses += amt;
      }
      acc[date].Profit = acc[date].Revenue - acc[date].Expenses;
      return acc;
    }, {} as Record<string, { date: string, Revenue: number, Expenses: number, Profit: number }>);
    
    // Sort chronologically
    return Object.values(grouped).reverse();
  }, [filteredRows]);

  const columns = useMemo<ColumnDef<TransactionRow & { sn: number }>[]>(
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
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Date",
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs font-medium whitespace-nowrap">
            {fmtDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "stationName",
        accessorKey: "station.name",
        header: "Station",
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {row.original.station?.name || "—"}
          </span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Category",
        size: 140,
        cell: ({ row }) => (
          <Badge variant="outline" className={cn(
            "text-[10px]",
            row.original.category === "STATION_SALE" ? "text-emerald-600 border-emerald-600" : "text-rose-600 border-rose-600"
          )}>
            {row.original.category.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        size: 250,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: () => <div className="text-right whitespace-nowrap">Amount</div>,
        size: 130,
        cell: ({ row }) => {
          const isPos = row.original.type === "INFLOW";
          return (
            <div
              className={cn(
                "text-right text-xs font-mono font-semibold tabular-nums",
                isPos ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPos ? "+" : "-"}
              {fmtMoney(row.original.amount)}
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
            Station Profit & Loss
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            Stations: {selectedStationIds.length === 0 ? "All Stations" : stations.filter(s => selectedStationIds.includes(s.id)).map(s => s.name).join(", ")}
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
                            {stations.map((s) => (
                              <div key={s.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                  id={`station-${s.id}`}
                                  checked={draftSelectedStationIds.includes(s.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDraftSelectedStationIds([...draftSelectedStationIds, s.id]);
                                    } else {
                                      setDraftSelectedStationIds(draftSelectedStationIds.filter((id) => id !== s.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`station-${s.id}`} className="text-sm font-medium leading-none cursor-pointer">{s.name}</label>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                 <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Revenue</p>
             </div>
             <p className="text-3xl font-bold text-emerald-600">{formatShortCurrency(stats.totalRevenue)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-full">
                 <Receipt className="h-5 w-5 text-rose-600 dark:text-rose-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Expenses</p>
             </div>
             <p className="text-3xl font-bold text-rose-600">{formatShortCurrency(stats.totalExpense)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.totalExpense)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className={cn("p-2 rounded-full", stats.netProfit >= 0 ? "bg-indigo-100 dark:bg-indigo-900" : "bg-red-100 dark:bg-red-900")}>
                 {stats.netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Net Profit</p>
             </div>
             <p className={cn("text-3xl font-bold", stats.netProfit >= 0 ? "text-indigo-600" : "text-red-600")}>{formatShortCurrency(stats.netProfit)}</p>
             <p className="text-xs text-muted-foreground mt-2">{fmtMoney(stats.netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-border/40 shadow-xs hide-on-print">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
              Revenue vs Expenses (Daily Trend)
            </h3>
            <div className="h-[400px] w-full">
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
                    tickFormatter={(value) => `₦${(value / 1000000).toFixed(1)}M`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [fmtMoney(Number(value)), undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                      No transactions found.
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

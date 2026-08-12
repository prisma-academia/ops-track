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
  PieChart as PieChartIcon
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface TransactionRow {
  id: string;
  createdAt: string;
  type: "INFLOW" | "OUTFLOW";
  category: string;
  amount: number;
  paymentPurpose: string | null;
  description: string | null;
  truckId: string | null;
  truck?: {
    id: string;
    plateNumber: string;
    name: string | null;
  };
}

interface Truck {
  id: string;
  name: string | null;
  plateNumber: string;
}

interface Props {
  initialTransactions: TransactionRow[];
  trucks: Truck[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

function fmtMoney(n: number | null) {
  if (n === null || isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FleetPnlReportManager({ initialTransactions, trucks }: Props) {
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
    return initialTransactions
      .filter((row) => {
        if (selectedTruckIds.length > 0 && (!row.truckId || !selectedTruckIds.includes(row.truckId))) return false;
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
  }, [initialTransactions, selectedTruckIds, dateRange]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;

    filteredRows.forEach((r) => {
      const amt = Number(r.amount);
      if (r.type === "INFLOW" && r.category === "TRANSPORT_PAYMENT") totalRevenue += amt;
      if (r.type === "OUTFLOW" && r.category === "FLEET_EXPENSE") totalExpense += amt;
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
      if (curr.type === "INFLOW" && curr.category === "TRANSPORT_PAYMENT") {
        acc[date].Revenue += amt;
      }
      if (curr.type === "OUTFLOW" && curr.category === "FLEET_EXPENSE") {
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
        id: "truckPlate",
        accessorKey: "truck.plateNumber",
        header: "Truck",
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            {row.original.truck?.plateNumber || "—"}
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
            row.original.category === "TRANSPORT_PAYMENT" ? "text-emerald-600 border-emerald-600" : "text-rose-600 border-rose-600"
          )}>
            {row.original.category.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "paymentPurpose",
        accessorKey: "paymentPurpose",
        header: "Purpose",
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.paymentPurpose ? row.original.paymentPurpose.replace(/_/g, " ") : "—"}
          </span>
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
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
            {[
              {
                title: "Transport Revenue",
                value: formatShortCurrency(stats.totalRevenue),
                fullValue: fmtMoney(stats.totalRevenue),
                icon: Wallet,
                iconColor: "text-emerald-600",
                valueColor: "text-emerald-600",
              },
              {
                title: "Fleet Expenses",
                value: formatShortCurrency(stats.totalExpense),
                fullValue: fmtMoney(stats.totalExpense),
                icon: Receipt,
                iconColor: "text-rose-600",
                valueColor: "text-rose-600",
              },
              {
                title: "Net Profit",
                value: formatShortCurrency(stats.netProfit),
                fullValue: fmtMoney(stats.netProfit),
                icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
                iconColor: stats.netProfit >= 0 ? "text-indigo-600" : "text-rose-600",
                valueColor: stats.netProfit >= 0 ? "text-indigo-600" : "text-rose-600",
              },
            ].map((item, index, arr) => (
              <div
                key={index}
                className={cn(
                  "w-full md:flex-1 min-w-[150px] border-border print:border-none print:w-auto",
                  index === arr.length - 1 ? "border-b-0" : "border-b",
                  "md:border-b-0",
                  index === arr.length - 1 ? "md:border-e-0" : "md:border-e"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full print:p-0">
                      <div className="flex flex-col gap-2 print:gap-0.5">
                        <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                        <div>
                          <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>
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
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                    {item.fullValue}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      {chartData.length > 0 && (() => {
        const pnlChartConfig = {
          Revenue: {
            label: "Revenue",
            color: "#10b981",
          },
          Expenses: {
            label: "Expenses",
            color: "#f43f5e",
          },
        } satisfies ChartConfig;

        return (
          <Card className="border-border/40 shadow-xs hide-on-print">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                Revenue vs Expenses (Daily Trend)
              </h3>
              <ChartContainer config={pnlChartConfig} className="h-[400px] w-full">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(144, 164, 174, 0.3)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    fontSize={12}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    fontSize={12}
                    tickFormatter={(value) => `₦${(value / 1000000).toFixed(1)}M`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="Revenue" fill="var(--color-Revenue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Expenses" fill="var(--color-Expenses)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        );
      })()}

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

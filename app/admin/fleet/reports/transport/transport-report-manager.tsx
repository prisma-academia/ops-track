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
import { cn, formatShortCurrency } from "@/lib/utils";
import { addDays, format, parseISO } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  Truck,
  Droplets,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  Filter,
  BarChart3,
  ListOrdered
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

interface TransportRow {
  id: string;
  createdAt: string;
  status: string;
  litersCarried: number;
  litersDelivered: number;
  truckId: string | null;
  truck?: {
    id: string;
    plateNumber: string;
  };
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  order?: {
    id: string;
    reference: string;
  };
  deliveries: Array<{
    id: string;
    litersDespatched: number | null;
    litersReceived: number | null;
  }>;
}

interface Props {
  initialTransports: TransportRow[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

function fmtQty(n: number | null) {
  if (n === null || isNaN(n)) return "0 L";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L`;
}

export function TransportReportManager({ initialTransports }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(draftDateRange);

  const applyFilters = useCallback(() => {
    setDateRange(draftDateRange);
    setIsOpen(false);
  }, [draftDateRange]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDateRange(undefined);
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
    return initialTransports
      .filter((row) => {
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
  }, [initialTransports, dateRange]);

  const stats = useMemo(() => {
    let totalTrips = filteredRows.length;
    let totalCarried = 0;
    let totalDelivered = 0;
    let totalShortage = 0;

    filteredRows.forEach((r) => {
      totalCarried += Number(r.litersCarried || 0);
      let tDel = 0;
      let tShort = 0;
      r.deliveries.forEach((d) => {
        const des = Number(d.litersDespatched || 0);
        const rec = d.litersReceived !== null ? Number(d.litersReceived) : des;
        tDel += rec;
        tShort += (des - rec);
      });
      totalDelivered += tDel;
      totalShortage += tShort;
    });

    return { totalTrips, totalCarried, totalDelivered, totalShortage };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const grouped = filteredRows.reduce((acc, curr) => {
      const date = format(parseISO(curr.createdAt), "MMM dd");
      if (!acc[date]) {
        acc[date] = { date, Carried: 0, Delivered: 0 };
      }
      acc[date].Carried += Number(curr.litersCarried || 0);
      
      let tDel = 0;
      curr.deliveries.forEach(d => {
        const des = Number(d.litersDespatched || 0);
        const rec = d.litersReceived !== null ? Number(d.litersReceived) : des;
        tDel += rec;
      });
      
      acc[date].Delivered += tDel;
      return acc;
    }, {} as Record<string, { date: string, Carried: number, Delivered: number }>);
    
    return Object.values(grouped).reverse();
  }, [filteredRows]);

  const columns = useMemo<ColumnDef<TransportRow & { sn: number }>[]>(
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
        id: "orderRef",
        accessorKey: "order.reference",
        header: "Order Ref",
        size: 130,
        cell: ({ row }) => (
          <span className="text-xs font-mono font-semibold text-foreground whitespace-nowrap">
            {row.original.order?.reference || "—"}
          </span>
        ),
      },
      {
        id: "truckPlate",
        accessorKey: "truck.plateNumber",
        header: "Truck",
        size: 130,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground whitespace-nowrap uppercase">
            {row.original.truck?.plateNumber || "—"}
          </span>
        ),
      },
      {
        id: "driver",
        accessorFn: (row) => row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "—",
        header: "Driver",
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs text-foreground whitespace-nowrap">
            {row.original.driver ? `${row.original.driver.firstName} ${row.original.driver.lastName}` : "—"}
          </span>
        ),
      },
      {
        id: "litersCarried",
        accessorKey: "litersCarried",
        header: () => <div className="text-right whitespace-nowrap">Loaded</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono font-semibold text-blue-600 tabular-nums">
            {fmtQty(row.original.litersCarried)}
          </div>
        ),
      },
      {
        id: "litersDelivered",
        header: () => <div className="text-right whitespace-nowrap">Delivered</div>,
        size: 120,
        cell: ({ row }) => {
          let tDel = 0;
          row.original.deliveries.forEach(d => {
            const des = Number(d.litersDespatched || 0);
            tDel += d.litersReceived !== null ? Number(d.litersReceived) : des;
          });
          return (
            <div className="text-right text-xs font-mono font-semibold text-emerald-600 tabular-nums">
              {fmtQty(tDel)}
            </div>
          );
        },
      },
      {
        id: "shortage",
        header: () => <div className="text-right whitespace-nowrap">Shortage</div>,
        size: 120,
        cell: ({ row }) => {
          let tShort = 0;
          row.original.deliveries.forEach(d => {
            const des = Number(d.litersDespatched || 0);
            const rec = d.litersReceived !== null ? Number(d.litersReceived) : des;
            tShort += (des - rec);
          });
          return (
            <div className={cn("text-right text-xs font-mono font-bold tabular-nums", tShort > 0 ? "text-rose-600" : "text-muted-foreground")}>
              {fmtQty(tShort)}
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => <div className="text-center whitespace-nowrap">Status</div>,
        size: 120,
        cell: ({ row }) => (
          <div className="text-center">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {row.original.status.replace(/_/g, " ")}
            </Badge>
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
            Transport & Allocation Report
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
                    {(!!draftDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        1
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full">
                 <Truck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Trips</p>
             </div>
             <p className="text-3xl font-bold text-slate-600">{stats.totalTrips}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                 <ListOrdered className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Allocated</p>
             </div>
             <p className="text-3xl font-bold text-blue-600">{stats.totalCarried.toLocaleString()} L</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                 <Droplets className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Delivered</p>
             </div>
             <p className="text-3xl font-bold text-emerald-600">{stats.totalDelivered.toLocaleString()} L</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-xs">
          <CardContent className="p-6 flex flex-col justify-center items-start h-full">
             <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-full">
                 <Droplets className="h-5 w-5 text-rose-600 dark:text-rose-400" />
               </div>
               <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Shortage</p>
             </div>
             <p className="text-3xl font-bold text-rose-600">{stats.totalShortage.toLocaleString()} L</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="border-border/40 shadow-xs hide-on-print">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Volume Allocated vs Delivered (Daily Trend)
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
                    tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Carried" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                      No transport records found.
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

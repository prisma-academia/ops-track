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
  Truck,
  Droplets,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  Printer,
  Filter,
  ListOrdered
} from "lucide-react";
import { StatSparkline } from "@/components/charts/stat-sparkline";

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
        acc[date] = { date, Trips: 0, Carried: 0, Delivered: 0, Shortage: 0 };
      }
      acc[date].Trips += 1;
      acc[date].Carried += Number(curr.litersCarried || 0);

      let tDel = 0;
      let tShort = 0;
      curr.deliveries.forEach(d => {
        const des = Number(d.litersDespatched || 0);
        const rec = d.litersReceived !== null ? Number(d.litersReceived) : des;
        tDel += rec;
        tShort += (des - rec);
      });

      acc[date].Delivered += tDel;
      acc[date].Shortage += tShort;
      return acc;
    }, {} as Record<string, { date: string, Trips: number, Carried: number, Delivered: number, Shortage: number }>);

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

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 hide-on-print">
        {[
          {
            title: "Total Trips",
            value: stats.totalTrips.toString(),
            fullValue: null as string | null,
            icon: Truck,
            iconColor: "text-slate-600",
            sparkKey: "Trips",
            sparkColor: "#475569",
            sparkType: "bar" as const,
          },
          {
            title: "Total Allocated",
            value: `${stats.totalCarried.toLocaleString()} L`,
            fullValue: `${stats.totalCarried.toLocaleString()} Liters`,
            icon: ListOrdered,
            iconColor: "text-blue-600",
            valueColor: "text-blue-600",
            sparkKey: "Carried",
            sparkColor: "#3b82f6",
            sparkType: "line" as const,
          },
          {
            title: "Total Delivered",
            value: `${stats.totalDelivered.toLocaleString()} L`,
            fullValue: `${stats.totalDelivered.toLocaleString()} Liters`,
            icon: Droplets,
            iconColor: "text-emerald-600",
            valueColor: "text-emerald-600",
            sparkKey: "Delivered",
            sparkColor: "#10b981",
            sparkType: "line" as const,
          },
          {
            title: "Total Shortage",
            value: `${stats.totalShortage.toLocaleString()} L`,
            fullValue: `${stats.totalShortage.toLocaleString()} Liters`,
            icon: Droplets,
            iconColor: "text-rose-600",
            valueColor: "text-rose-600",
            sparkKey: "Shortage",
            sparkColor: "#f43f5e",
            sparkType: "bar" as const,
          },
        ].map((item, index) => (
          <TooltipProvider key={index} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border/40 shadow-xs cursor-default hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-lg font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
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
              {item.fullValue && (
                <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                  {item.fullValue}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Print-friendly compact stat cards (no charts) */}
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 hidden print:flex print:border-none print:shadow-none print:bg-transparent">
          <CardContent className="flex items-center w-full print:gap-4 print:justify-between px-0">
            {[
              { title: "Total Trips", value: stats.totalTrips.toString() },
              { title: "Total Allocated", value: `${stats.totalCarried.toLocaleString()} Liters` },
              { title: "Total Delivered", value: `${stats.totalDelivered.toLocaleString()} Liters` },
              { title: "Total Shortage", value: `${stats.totalShortage.toLocaleString()} Liters` },
            ].map((item, index) => (
              <div key={index} className="flex flex-col gap-0.5">
                <p className="text-[10px] text-black/60 uppercase tracking-wider font-medium">{item.title}</p>
                <p className="text-[13px] font-semibold text-black">{item.value}</p>
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

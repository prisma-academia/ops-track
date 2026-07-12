"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { User, Droplets, Banknote, ChartColumnIncreasing, Handbag, CalendarIcon, Eye, CheckCircle2, AlertCircle, ChevronUpIcon, ChevronDownIcon, Maximize2, Minimize2, Printer } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate, formatShortCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SalesReportStation {
  id: string;
  name: string;
  code: string;
}

interface SalesReportUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface SalesReportRow {
  id: string;
  tenantId: string;
  stationId: string;
  productType: string;
  openingDip: number;
  closingDip: number;
  litersSold: number;
  amountCash: number;
  amountPos: number;
  amountTransfer: number;
  cashReceiptUrl: string | null;
  posReceiptUrl: string | null;
  logDate: string | Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  flaggedAmount: boolean;
  flaggedLiters: boolean;
  flaggedReceipt: boolean;
  reason: string | null;
  approvedById: string | null;
  approvedAt: string | Date | null;
  station: SalesReportStation;
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
}

export function SalesReportsManager({
  initialReports,
  stations,
}: {
  initialReports: SalesReportRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err.message);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useMemo(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }
  }, [handleFullscreenChange]);

  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      if (selectedStationIds.length > 0 && !selectedStationIds.includes(report.stationId)) {
        return false;
      }
      const logDate = new Date(report.logDate);
      if (dateRange?.from) {
        const sDate = new Date(dateRange.from);
        sDate.setHours(0, 0, 0, 0);
        if (logDate < sDate) return false;
      }
      if (dateRange?.to) {
        const eDate = new Date(dateRange.to);
        eDate.setHours(23, 59, 59, 999);
        if (logDate > eDate) return false;
      }
      return true;
    });
  }, [initialReports, dateRange, selectedStationIds]);

  const stats = useMemo(() => {
    let totalLiters = 0;
    let cash = 0;
    let digital = 0;

    filteredReports.forEach((r) => {
      totalLiters += Number(r.litersSold);
      cash += Number(r.amountCash);
      digital += Number(r.amountPos) + Number(r.amountTransfer);
    });

    return { totalLiters, cash, digital };
  }, [filteredReports]);

  const statCards = [
    {
      title: "Transactions",
      value: filteredReports.length.toString(),
      icon: Handbag,
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
      badge: "Period",
      valueColor: "",
      iconColor: "text-teal-600",
    },
    {
      title: "Volume Sold",
      value: `${stats.totalLiters.toLocaleString()} L`,
      icon: Droplets,
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
      badge: "Period",
      valueColor: "text-blue-600",
      iconColor: "text-blue-600",
    },
    {
      title: "Cash Revenue",
      value: formatShortCurrency(stats.cash),
      icon: Banknote,
      badgeColor: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
      badge: "Period",
      valueColor: "text-emerald-600",
      iconColor: "text-emerald-600",
    },
    {
      title: "Digital Revenue",
      value: formatShortCurrency(stats.digital),
      icon: ChartColumnIncreasing,
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
      badge: "Period",
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
  ];

  const columns: ColumnDef<SalesReportRow>[] = useMemo(() => [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-medium">{formatHumanReadableDate(row.original.logDate)}</span>
      ),
    },
    {
      id: "station_name",
      accessorFn: (row) => row.station?.name,
      header: "Station",
      cell: ({ row }) => {
        const station = row.original.station;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground whitespace-nowrap">{station?.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "productType",
      header: "Product",
      cell: ({ row }) => (
        <span className="font-mono text-[10px] uppercase tracking-wider">{row.original.productType}</span>
      ),
    },
    {
      accessorKey: "openingDip",
      header: () => <div className="text-right whitespace-nowrap">Opening Dip</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {Number(row.original.openingDip || 0).toLocaleString()} L
        </div>
      ),
    },
    {
      accessorKey: "closingDip",
      header: () => <div className="text-right whitespace-nowrap">Closing Dip</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {Number(row.original.closingDip || 0).toLocaleString()} L
        </div>
      ),
    },
    {
      accessorKey: "litersSold",
      header: () => <div className="text-right whitespace-nowrap">Volume Sold</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs font-mono tabular-nums text-foreground font-semibold whitespace-nowrap">
          {Number(row.original.litersSold).toLocaleString()} L
        </div>
      ),
    },
    {
      id: "revenue",
      header: () => <div className="text-right whitespace-nowrap">Total Revenue</div>,
      cell: ({ row }) => {
        const total = Number(row.original.amountCash) + Number(row.original.amountPos) + Number(row.original.amountTransfer);
        return (
          <div className="text-right text-xs font-mono tabular-nums font-bold text-foreground whitespace-nowrap">
            {formatShortCurrency(total)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const report = row.original;
        const status = report.status;
        const flags = [];
        if (report.flaggedAmount) flags.push("Amount");
        if (report.flaggedLiters) flags.push("Liters");
        if (report.flaggedReceipt) flags.push("Receipt");

        return (
          <div className="flex flex-col gap-1">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap print:text-black",
              status === "APPROVED" ? "text-emerald-600" : status === "REJECTED" ? "text-rose-600" : "text-amber-600"
            )}>
              {status}
            </span>
            {flags.length > 0 && (
              <span className="text-[9px] text-rose-500 font-bold leading-none mt-0.5 print:text-black">
                Flags: {flags.join(", ")}
              </span>
            )}
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: filteredReports,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
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
        }
      `}</style>
      
      {/* ── Header + Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
            Sales Reports
          </h1>
          <p className="hidden print:block text-[11px] text-black/80 font-medium mt-1">
            Date: {dateRange?.from ? format(dateRange.from, "d MMMM yyyy") : "All Time"} {dateRange?.to ? ` to ${format(dateRange.to, "d MMMM yyyy")}` : ""}
            <br />
            Stations: {selectedStationIds.length === 0 ? "All Stations" : stations.filter(s => selectedStationIds.includes(s.id)).map(s => s.name).join(", ")}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto print:hidden">
          {/* Station filter */}
          <div className="space-y-1 w-full sm:w-48 print:hidden">
            <Label className="text-xs text-muted-foreground">Station(s)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    selectedStationIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {selectedStationIds.length === 0
                    ? "All Stations"
                    : `${selectedStationIds.length} station(s) selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id="station-all"
                      checked={selectedStationIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedStationIds([]);
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
                        checked={selectedStationIds.includes(s.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStationIds([...selectedStationIds, s.id]);
                          } else {
                            setSelectedStationIds(
                              selectedStationIds.filter((id) => id !== s.id)
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

          {/* Date Picker Range */}
          <div className="space-y-1 w-full sm:w-auto">
            <Label htmlFor="date-picker-range" className="text-xs text-muted-foreground">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date-picker-range"
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
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

          {/* Print button */}
          <div className="space-y-1 shrink-0">
            <Label className="text-xs text-muted-foreground opacity-0 select-none">
              Print
            </Label>
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

      {/* Analytics Cards */}
      <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
          {statCards.map((item, index) => (
            <div
              key={index}
              className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0 print:border-none print:w-auto"
            >
              <div className="p-4 flex items-start justify-between print:p-0">
                <div className="flex flex-col gap-2 print:gap-0.5">
                  <p className="text-sm font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                  <div>
                    <p className={cn("text-xl font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>
                      {item.value}
                    </p>
                    <div className="flex items-center gap-2 mt-1 print:hidden">
                      <Badge
                        className={cn(
                          "font-medium text-[9px] uppercase tracking-wider px-1.5 py-0",
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </Badge>
                    </div>
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
          <div className="overflow-x-auto border-t border-border/40 relative print:overflow-visible print:border-none print:w-full print:max-w-none">
            <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:border-black/30 print:text-[10px] print:w-full">
              <thead className="bg-muted/50 border-b border-border/50 print:border-black/30 print:bg-transparent">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-none">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="h-9 px-2 py-1.5 text-[11px] font-bold text-foreground bg-muted/50 border border-border/50 print:border-black/30 uppercase tracking-wider whitespace-nowrap text-left print:text-[9px] print:text-black print:bg-transparent"
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
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors group cursor-pointer",
                        index % 2 === 0 ? "bg-background" : "bg-muted/5 print:bg-transparent"
                      )}
                      onClick={() => router.push(`/admin/sales-reports/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-2 py-1.5 whitespace-nowrap text-[13px] print:text-[10px] print:py-1 border border-border/50 print:border-black/30 print:text-black"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-32 text-center text-sm text-muted-foreground border border-border/50 print:border-black/30"
                    >
                      No sales reports found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/50 font-bold border border-border/50 print:border-black/30 print:bg-transparent">
                <tr>
                  <td colSpan={5} className="px-2 py-2 text-right text-sm border border-border/50 print:border-black/30 print:text-black">
                    Total:
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {stats.totalLiters.toLocaleString()} L
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-mono tabular-nums border border-border/50 print:border-black/30 print:text-black">
                    {formatShortCurrency(stats.cash + stats.digital)}
                  </td>
                  <td className="px-2 py-2 border border-border/50 print:border-black/30 print:text-black">
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

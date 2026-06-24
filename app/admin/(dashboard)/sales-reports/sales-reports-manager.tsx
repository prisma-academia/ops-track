"use client";

import { useState, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Droplets, Banknote, ChartColumnIncreasing, Handbag, CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

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
  litersSold: number;
  amountCash: number;
  amountPos: number;
  amountTransfer: number;
  logDate: string | Date;
  station: SalesReportStation;
  recordedBy: SalesReportUser | null;
}

function formatHumanReadableDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

export function SalesReportsManager({
  initialReports,
  stations,
}: {
  initialReports: SalesReportRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedStationId, setSelectedStationId] = useState<string>("ALL");

  // Filtering logic
  const filteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      // Filter by station
      if (selectedStationId !== "ALL" && report.stationId !== selectedStationId) {
        return false;
      }

      // Filter by date
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
  }, [initialReports, dateRange, selectedStationId]);

  // Analytics computation
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

  const EcommerceActions = [
    {
      title: "Transactions",
      subtitle: filteredReports.length.toString(),
      cardIcon: Handbag,
      badgeColor: "bg-teal-400/10 text-teal-700",
      statusValue: "Period",
    },
    {
      title: "Volume Sold",
      subtitle: `${stats.totalLiters.toLocaleString()} L`,
      cardIcon: Droplets,
      badgeColor: "bg-blue-400/10 text-blue-700",
      statusValue: "Period",
    },
    {
      title: "Cash Revenue",
      subtitle: `₦${stats.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cardIcon: Banknote,
      badgeColor: "bg-emerald-400/10 text-emerald-700",
      statusValue: "Period",
    },
    {
      title: "Digital Revenue",
      subtitle: `₦${stats.digital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cardIcon: ChartColumnIncreasing,
      badgeColor: "bg-indigo-400/10 text-indigo-700",
      statusValue: "Period",
    },
  ];

  const columns: ColumnDef<SalesReportRow>[] = [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ row }) => {
        return <span className="font-medium">{formatHumanReadableDate(row.original.logDate)}</span>;
      },
    },
    {
      id: "station_name",
      accessorFn: (row) => row.station?.name,
      header: "Station",
      cell: ({ row }) => {
        const station = row.original.station;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{station?.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{station?.code}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "productType",
      header: "Product",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      accessorKey: "litersSold",
      header: () => <div className="text-right">Volume Sold</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground">
          {Number(row.original.litersSold).toLocaleString()} L
        </div>
      ),
    },
    {
      id: "revenue",
      header: () => <div className="text-right">Total Revenue</div>,
      cell: ({ row }) => {
        const total = Number(row.original.amountCash) + Number(row.original.amountPos) + Number(row.original.amountTransfer);
        return (
          <div className="text-right font-bold text-foreground">
            ₦{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      id: "recordedBy",
      header: "Recorded By",
      cell: ({ row }) => {
        const user = row.original.recordedBy;
        const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown";
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3" />
            <span>{name}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Filters and Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card p-6 rounded-xl border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-muted-foreground text-sm">Monitor daily sales logs across all your stations.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          {/* Station Dropdown */}
          <div className="space-y-1 w-full sm:w-48">
            <Label className="text-xs text-muted-foreground">Station</Label>
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stations</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="w-full">
        <Card className="p-0 shadow-xs border-border/40">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {EcommerceActions.map((item, index) => {
              return (
                <div
                  className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0"
                  key={index}
                >
                  <div className="p-6 flex items-start justify-between">
                    <div className="flex flex-col gap-4">
                      <p className="text-base font-medium text-card-foreground">
                        {item.title}
                      </p>
                      <div>
                        <p className="text-2xl font-medium text-card-foreground">
                          {item.subtitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Filtered
                          </p>
                          <Badge
                            className={cn(
                              "font-medium text-[10px] uppercase tracking-wider",
                              item.badgeColor,
                            )}
                          >
                            {item.statusValue}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {/* icon */}
                    <div className="p-3 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                      <item.cardIcon size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filteredReports}
        title=""
        description=""
        filterColumnId="station_name"
        searchPlaceholder="Search by station name…"
      />
    </div>
  );
}

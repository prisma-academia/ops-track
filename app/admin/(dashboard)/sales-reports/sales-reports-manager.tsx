"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { Droplets, ChartColumnIncreasing, Handbag, CheckCircle2, Maximize2, Minimize2, Printer, LayoutGrid, TableProperties, Filter } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate, formatShortCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Types
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
  pricePerLiter: number;
  openingDip: number;
  closingDip: number;
  litersSold: number;
  amountPos: number;
  amountTransfer: number;
  posReceiptUrl: string | null;
  logDate: string | Date;
  status: "PENDING" | "APPROVED" | "REJECTED";

  reason: string | null;
  approvedById: string | null;
  approvedAt: string | Date | null;
  station: SalesReportStation;
  recordedBy: SalesReportUser | null;
  approvedBy: SalesReportUser | null;
  isDebtRepayment?: boolean;
  parentSaleId?: string | null;
}
type GroupedSale = SalesReportRow & { childRepayments: SalesReportRow[], overallBalance: number };

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
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [isOpen, setIsOpen] = useState(false);

  // Draft States (Bound to UI inputs)
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string>("ALL");
  const [draftProduct, setDraftProduct] = useState<string>("ALL");
  const [draftDebtOperator, setDraftDebtOperator] = useState<string>("ALL");
  const [draftDebtAmount, setDraftDebtAmount] = useState<string>("");

  // Applied States (Used for filtering logic)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = useState<string[]>(draftStationIds);
  const [appliedStatus, setAppliedStatus] = useState<string>(draftStatus);
  const [appliedProduct, setAppliedProduct] = useState<string>(draftProduct);
  const [appliedDebtOperator, setAppliedDebtOperator] = useState<string>(draftDebtOperator);
  const [appliedDebtAmount, setAppliedDebtAmount] = useState<string>(draftDebtAmount);

  const applyFilters = useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedStatus(draftStatus);
    setAppliedProduct(draftProduct);
    setAppliedDebtOperator(draftDebtOperator);
    setAppliedDebtAmount(draftDebtAmount);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftStatus, draftProduct, draftDebtOperator, draftDebtAmount]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftStatus("ALL");
    setDraftProduct("ALL");
    setDraftDebtOperator("ALL");
    setDraftDebtAmount("");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedStatus("ALL");
    setAppliedProduct("ALL");
    setAppliedDebtOperator("ALL");
    setAppliedDebtAmount("");
    setIsOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
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

  // Step 1: Filter raw reports by Date, Station, Status, Product
  const baseFilteredReports = useMemo(() => {
    return initialReports.filter((report) => {
      if (report.isDebtRepayment) return true;

      if (appliedStationIds.length > 0 && !appliedStationIds.includes(report.stationId)) {
        return false;
      }
      if (appliedStatus !== "ALL" && report.status !== appliedStatus) {
        return false;
      }
      if (appliedProduct !== "ALL" && report.productType !== appliedProduct) {
        return false;
      }
      
      const logDate = new Date(report.logDate);
      if (appliedDateRange?.from) {
        const sDate = new Date(appliedDateRange.from);
        sDate.setHours(0, 0, 0, 0);
        if (logDate < sDate) return false;
      }
      if (appliedDateRange?.to) {
        const eDate = new Date(appliedDateRange.to);
        eDate.setHours(23, 59, 59, 999);
        if (logDate > eDate) return false;
      }
      return true;
    });
  }, [initialReports, appliedDateRange, appliedStationIds, appliedStatus, appliedProduct]);

  // Step 2 & 3: Group children under parents, calculate overall balance, and then filter by Debt
  const finalGroupedSales = useMemo<GroupedSale[]>(() => {
    const parents = baseFilteredReports.filter(r => !r.isDebtRepayment && !r.parentSaleId);
    const children = initialReports.filter(r => r.isDebtRepayment && r.parentSaleId);

    const grouped = parents.map(p => {
      const childRepayments = children.filter(c => c.parentSaleId === p.id).sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
      
      const expectedTotal = Number(p.litersSold) * Number(p.pricePerLiter);
      const parentReceived = Number(p.amountPos) + Number(p.amountTransfer);
      const childRepaidTotal = childRepayments.reduce((sum, c) => sum + Number(c.amountPos) + Number(c.amountTransfer), 0);
      
      const overallBalance = (parentReceived + childRepaidTotal) - expectedTotal;
      
      return {
        ...p,
        childRepayments,
        overallBalance
      };
    });
    
    const sorted = grouped.sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());

    if (appliedDebtOperator === "ALL" || appliedDebtAmount === "") {
      return sorted;
    }

    const targetAmount = Number(appliedDebtAmount);
    if (isNaN(targetAmount)) return sorted;

    return sorted.filter(g => {
      if (appliedDebtOperator === "LESS_THAN_OR_EQUAL") return g.overallBalance <= targetAmount;
      if (appliedDebtOperator === "GREATER_THAN_OR_EQUAL") return g.overallBalance >= targetAmount;
      if (appliedDebtOperator === "EXACT") return g.overallBalance === targetAmount;
      return true;
    });
  }, [baseFilteredReports, initialReports, appliedDebtOperator, appliedDebtAmount]);

  // Step 4: Calculate stats based on final visible grouped results
  const stats = useMemo(() => {
    let totalLiters = 0;
    let expectedRevenue = 0;
    let digital = 0;

    finalGroupedSales.forEach((g) => {
      totalLiters += Number(g.litersSold);
      expectedRevenue += Number(g.litersSold) * Number(g.pricePerLiter);
      digital += Number(g.amountPos) + Number(g.amountTransfer);
      
      g.childRepayments.forEach(c => {
        digital += Number(c.amountPos) + Number(c.amountTransfer);
      });
    });

    const totalReceived = digital;
    const totalBalance = totalReceived - expectedRevenue;

    return { totalLiters, expectedRevenue, digital, totalReceived, totalBalance };
  }, [finalGroupedSales]);

  const statCards = [
    {
      title: "Transactions",
      value: finalGroupedSales.length.toString(),
      fullValue: null,
      icon: Handbag,
      badgeColor: "bg-teal-400/10 text-teal-700 dark:text-teal-400",
      badge: "Period",
      valueColor: "",
      iconColor: "text-teal-600",
    },
    {
      title: "Volume Sold",
      value: `${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalLiters)} L`,
      fullValue: `${stats.totalLiters.toLocaleString()} L`,
      icon: Droplets,
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
      badge: "Period",
      valueColor: "text-blue-600",
      iconColor: "text-blue-600",
    },
    {
      title: "Digital Revenue",
      value: formatShortCurrency(stats.digital),
      fullValue: `₦${stats.digital.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ChartColumnIncreasing,
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
      badge: "Period",
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
  ];

  const getStatusBadge = (status: string, flags: string[]) => {
    const isApproved = status === "APPROVED";
    const isRejected = status === "REJECTED";
    return (
      <div className="flex flex-col gap-1 items-end sm:items-start">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap print:text-black",
          isApproved ? "text-emerald-600" : isRejected ? "text-rose-600" : "text-amber-600",
          "px-2 py-1 rounded bg-muted/50 print:bg-transparent print:p-0"
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
  };

  const getFlags = (_r: SalesReportRow) => {
    const f: string[] = [];

    return f;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-6 transition-all print:m-0 print:p-0 print:bg-white print:text-black print:space-y-3",
        isFullscreen && "fixed inset-0 z-40 bg-background p-6 overflow-auto w-full h-screen"
      )}
    >
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          .hide-on-print { display: none !important; }
          .force-show-print { display: block !important; }
          .force-table-print { display: table !important; }
        }
      `}</style>
      
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
            Sales Reports
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-muted p-1 rounded-md">
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("card")}
              title="Card View"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <TableProperties className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto print:hidden">
            <div className="shrink-0 flex gap-2">
              {/* Filter Sheet */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {(appliedStationIds.length > 0 || appliedStatus !== "ALL" || appliedProduct !== "ALL" || appliedDateRange || appliedDebtOperator !== "ALL") && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          appliedStationIds.length > 0,
                          appliedStatus !== "ALL",
                          appliedProduct !== "ALL",
                          !!appliedDateRange,
                          appliedDebtOperator !== "ALL"
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
                    {/* Station filter */}
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Station</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9",
                              draftStationIds.length === 0 && "text-muted-foreground"
                            )}
                          >
                            {draftStationIds.length === 0
                              ? "All Stations"
                              : `${draftStationIds.length} station(s)`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id="station-all"
                                checked={draftStationIds.length === 0}
                                onCheckedChange={(checked) => {
                                  if (checked) setDraftStationIds([]);
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
                                  checked={draftStationIds.includes(s.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDraftStationIds([...draftStationIds, s.id]);
                                    } else {
                                      setDraftStationIds(
                                        draftStationIds.filter((id) => id !== s.id)
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

                    {/* Status Filter */}
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                      <Select value={draftStatus} onValueChange={setDraftStatus}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Product Filter */}
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Product</Label>
                      <Select value={draftProduct} onValueChange={setDraftProduct}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All Products" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Products</SelectItem>
                          <SelectItem value="PMS">PMS</SelectItem>
                          <SelectItem value="AGO">AGO</SelectItem>
                          <SelectItem value="DPK">DPK</SelectItem>
                          <SelectItem value="LPG">LPG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Debt Balance Filter */}
                    <div className="space-y-3 w-full">
                      <Label className="text-sm font-semibold">Balance</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Condition</Label>
                          <Select value={draftDebtOperator} onValueChange={setDraftDebtOperator}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All</SelectItem>
                              <SelectItem value="LESS_THAN_OR_EQUAL">Less than or equal (&lt;=)</SelectItem>
                              <SelectItem value="GREATER_THAN_OR_EQUAL">Greater than or equal (&gt;=)</SelectItem>
                              <SelectItem value="EXACT">Exact match (==)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Amount</Label>
                          <FormattedNumberInput
                            placeholder="e.g. 0"
                            value={draftDebtAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftDebtAmount(e.target.value)}
                            disabled={draftDebtOperator === "ALL"}
                            prefixText="₦"
                          />
                        </div>
                      </div>
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
              
              {/* Print button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.print()}
                title="Print report"
                className="h-10 w-10"
              >
                <Printer className="size-4" />
              </Button>

              {/* Fullscreen toggle */}
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
      
      {/* Print-only Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-black">Sales Reports</h1>
        <p className="text-[11px] text-black/80 font-medium mt-1">
          Date: {appliedDateRange?.from ? format(appliedDateRange.from, "d MMMM yyyy") : "All Time"} {appliedDateRange?.to ? ` to ${format(appliedDateRange.to, "d MMMM yyyy")}` : ""}
          <br />
          Stations: {appliedStationIds.length === 0 ? "All Stations" : stations.filter(s => appliedStationIds.includes(s.id)).map(s => s.name).join(", ")}
        </p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
            {statCards.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "w-full md:w-1/3 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  "md:border-b-0",
                  index === statCards.length - 1 ? "md:border-e-0" : "md:border-e"
                )}
              >
                {item.fullValue ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 flex items-start justify-between print:p-0 cursor-default hover:bg-muted/30 transition-colors h-full">
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
                ) : (
                  <div className="p-4 flex items-start justify-between print:p-0 h-full">
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
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      {finalGroupedSales.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed bg-card">
          No sales reports found for the selected filters.
        </div>
      ) : (
        <>
          {/* ── CARD VIEW ─────────────────────────────────────────────────── */}
          <div className={cn("space-y-4 hide-on-print", viewMode === "card" ? "block" : "hidden")}>
            {finalGroupedSales.map((parent) => {
              const expectedTotal = Number(parent.litersSold) * Number(parent.pricePerLiter);
              const parentReceived = Number(parent.amountPos) + Number(parent.amountTransfer);
              
              const overallBalance = parent.overallBalance;

              return (
                <Card 
                  key={parent.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/admin/sales-reports/${parent.id}`)}
                >
                  <CardHeader className="bg-muted/30 p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                      <CardTitle className="text-base flex items-center gap-2">
                        {parent.station?.name}
                        <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold">
                          {parent.productType}
                        </Badge>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground mt-1 font-medium">
                        {formatHumanReadableDate(parent.logDate)}
                      </span>
                    </div>
                    {getStatusBadge(parent.status, getFlags(parent))}
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Parent Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-b group-hover:bg-muted/10 transition-colors">
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Volume Sold</span>
                        <span className="text-sm font-semibold font-mono tabular-nums">{Number(parent.litersSold).toLocaleString()} L <span className="text-muted-foreground text-[10px] ml-1 font-normal">@ ₦{Number(parent.pricePerLiter).toLocaleString()}/L</span></span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Expected</span>
                        <span className="text-sm font-semibold font-mono tabular-nums text-slate-600">₦{expectedTotal.toLocaleString()}</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Initial Received</span>
                        <span className="text-sm font-bold font-mono tabular-nums">₦{parentReceived.toLocaleString()}</span>
                      </div>
                      <div className="p-4 flex flex-col justify-center">
                        <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Balance</span>
                        <span className={cn(
                          "text-sm font-bold font-mono tabular-nums px-2 py-0.5 rounded w-max",
                          overallBalance > 0 ? "bg-emerald-50 text-emerald-700" : overallBalance < 0 ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground"
                        )}>
                          {overallBalance === 0 ? "Settled" : `${overallBalance > 0 ? "+" : "-"}₦${Math.abs(overallBalance).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Child Repayments Section */}
                    {parent.childRepayments.length > 0 && (
                      <div className="bg-slate-50/50 p-4 pl-6 md:pl-10 relative">
                        <div className="absolute left-[19px] md:left-[35px] top-4 bottom-4 w-px bg-border/80"></div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 ml-2 flex items-center gap-2">
                          <CheckCircle2 className="size-3" /> Repayment History
                        </h4>
                        <div className="space-y-3 relative z-10">
                          {parent.childRepayments.map((child) => {
                            const cReceived = Number(child.amountPos) + Number(child.amountTransfer);
                            return (
                              <div key={child.id} className="flex items-center justify-between bg-white border shadow-xs rounded-lg p-3 ml-2 hover:border-slate-300 transition-colors">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Debt Repayment</span>
                                    <span className="text-[10px] text-muted-foreground">{formatHumanReadableDate(child.logDate)}</span>
                                  </div>
                                  {getStatusBadge(child.status, getFlags(child))}
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+₦{cReceived.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── TABLE VIEW / PRINT VIEW ────────────────────────────────────── */}
          <div className={cn(
            "w-full overflow-hidden force-table-print", 
            viewMode === "table" ? "block hide-on-print" : "hidden print:block",
            "print:shadow-none print:border-none print:bg-transparent"
          )}>
            <div className="overflow-x-auto border rounded-xl print:rounded-none print:border-none print:w-full print:max-w-none">
              <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:border-black/30 print:text-[10px] print:w-full bg-card">
                <thead className="bg-muted/50 border-b border-border/50 print:border-black/30 print:bg-transparent text-left">
                  <tr>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Date</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Station</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Product</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-right text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Price/L</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Dipping Interval</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-right text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Volume</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-right text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Expected Rev</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-right text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Total Received</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-right text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Balance</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Status</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-center text-muted-foreground print:text-black hide-on-print border-l">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 print:divide-black/20">
                  {finalGroupedSales.map((parent) => {
                    const expectedTotal = Number(parent.litersSold) * Number(parent.pricePerLiter);
                    const parentReceived = Number(parent.amountPos) + Number(parent.amountTransfer);
                    
                    const overallBalance = parent.overallBalance;

                    return (
                      <React.Fragment key={parent.id}>
                        {/* Parent Row */}
                        <tr 
                          className="hover:bg-muted/20 bg-background print:bg-transparent group"
                        >
                          <td className="px-3 py-2 whitespace-nowrap font-medium print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            {formatHumanReadableDate(parent.logDate)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            {parent.station?.name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap border-r border-border/50 print:border-black/30">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded print:bg-transparent print:border print:border-black/30 print:text-[9px] print:text-black">
                              {parent.productType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            ₦{Number(parent.pricePerLiter || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 font-mono tabular-nums whitespace-nowrap text-muted-foreground print:text-[10px] print:text-black/70 border-r border-border/50 print:border-black/30">
                            {Number(parent.openingDip || 0).toLocaleString()} <span className="text-border">→</span> {Number(parent.closingDip || 0).toLocaleString()} L
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            {Number(parent.litersSold).toLocaleString()} L
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-slate-600 tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            ₦{expectedTotal.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            ₦{parentReceived.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                            <span className={cn(
                              overallBalance === 0 ? "text-muted-foreground" : overallBalance > 0 ? "text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded print:bg-transparent print:text-black" : "text-rose-600 bg-rose-50 px-1 py-0.5 rounded print:bg-transparent print:text-black"
                            )}>
                              {overallBalance === 0 ? "—" : `${overallBalance > 0 ? "+" : "-"}₦${Math.abs(overallBalance).toLocaleString()}`}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap print:text-black border-r border-border/50 print:border-black/30">
                            {getStatusBadge(parent.status, getFlags(parent))}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center hide-on-print border-l">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] px-2 hide-on-print"
                              onClick={() => router.push(`/admin/sales-reports/${parent.id}`)}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>

                        {/* Child Rows */}
                        {parent.childRepayments.map(child => {
                          const childReceived = Number(child.amountPos) + Number(child.amountTransfer);
                          return (
                            <tr 
                              key={child.id}
                              className="bg-blue-50/20 hover:bg-blue-50/40 print:bg-transparent relative"
                            >
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground pl-8 relative print:text-[10px] print:text-black/80 border-r border-border/50 print:border-black/30">
                                <div className="absolute left-4 top-0 bottom-1/2 border-l border-b border-border/80 w-3 rounded-bl"></div>
                                {formatHumanReadableDate(child.logDate)}
                              </td>
                              <td colSpan={6} className="px-3 py-2 text-center text-xs italic text-muted-foreground/50 print:text-[9px] print:text-black/50 border-r border-border/50 print:border-black/30">
                                — Debt Repayment —
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                                +₦{childReceived.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums whitespace-nowrap print:text-[10px] print:text-black border-r border-border/50 print:border-black/30">
                                —
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap print:text-black border-r border-border/50 print:border-black/30">
                                {getStatusBadge(child.status, getFlags(child))}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center hide-on-print border-l">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] px-2 hide-on-print"
                                  onClick={() => router.push(`/admin/sales-reports/${parent.id}`)}
                                >
                                  Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/80 font-bold border-t-2 border-border/60 print:border-black/50 print:bg-transparent">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right text-sm print:text-black border-r border-border/50 print:border-black/30">
                      Total:
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono tabular-nums print:text-black border-r border-border/50 print:border-black/30">
                      {stats.totalLiters.toLocaleString()} L
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono tabular-nums text-slate-600 print:text-black border-r border-border/50 print:border-black/30">
                      ₦{stats.expectedRevenue.toLocaleString()}
                    </td>
                    <td className={cn(
                      "px-3 py-3 text-right text-xs font-mono tabular-nums print:text-black border-r border-border/50 print:border-black/30",
                      stats.totalReceived > stats.expectedRevenue ? "text-emerald-600" : stats.totalReceived < stats.expectedRevenue ? "text-rose-600" : "text-foreground"
                    )}>
                      ₦{stats.totalReceived.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-[11px] font-mono tabular-nums print:text-black border-r border-border/50 print:border-black/30">
                      <span className={cn(
                        stats.totalBalance > 0 ? "text-emerald-600" : stats.totalBalance < 0 ? "text-rose-600" : "text-muted-foreground"
                      )}>
                        {stats.totalBalance === 0 ? "—" : `${stats.totalBalance > 0 ? "+" : "-"}₦${Math.abs(stats.totalBalance).toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 print:text-black border-r border-border/50 print:border-black/30"></td>
                    <td className="px-3 py-3 print:text-black hide-on-print border-l"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

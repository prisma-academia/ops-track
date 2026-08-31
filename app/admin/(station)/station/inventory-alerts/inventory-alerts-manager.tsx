"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CheckCircle2, Maximize2, Minimize2, Printer, LayoutGrid, TableProperties, Filter, AlertTriangle, Calendar, Gauge, Droplets, TrendingDown, TrendingUp, MapPin, ClipboardList } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

function VarianceBadge({ varianceVolume }: { varianceVolume: number }) {
  const isShortage = varianceVolume < 0;
  const isNeutral = varianceVolume === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-bold whitespace-nowrap",
        isNeutral
          ? "bg-slate-100 text-slate-600"
          : isShortage
          ? "bg-rose-50 text-rose-600"
          : "bg-emerald-50 text-emerald-600"
      )}
    >
      {!isNeutral && (isShortage ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />)}
      {isShortage ? "-" : isNeutral ? "" : "+"}
      {Math.abs(varianceVolume).toLocaleString()} L
    </span>
  );
}

function VarianceMeter({ expected, actual }: { expected: number; actual: number }) {
  const max = Math.max(expected, actual, 1);
  const expectedPct = Math.min(100, (expected / max) * 100);
  const actualPct = Math.min(100, (actual / max) * 100);
  const variance = actual - expected;
  const isShortage = variance < 0;
  const isNeutral = variance === 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Expected Volume</span>
          <span className="font-mono font-semibold">{expected.toLocaleString()} L</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-slate-400" style={{ width: `${expectedPct}%` }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Actual Volume</span>
          <span className="font-mono font-semibold">{actual.toLocaleString()} L</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", isShortage ? "bg-rose-500" : "bg-emerald-500")}
            style={{ width: `${actualPct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {isNeutral ? null : isShortage ? (
            <TrendingDown className="size-3.5 text-rose-600" />
          ) : (
            <TrendingUp className="size-3.5 text-emerald-600" />
          )}
          {isNeutral ? "No Variance" : isShortage ? "Shortage" : "Surplus"}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold",
            isNeutral ? "text-muted-foreground" : isShortage ? "text-rose-600" : "text-emerald-600"
          )}
        >
          {isNeutral ? "0 L" : `${isShortage ? "-" : "+"}${Math.abs(variance).toLocaleString()} L`}
        </span>
      </div>
    </div>
  );
}

export function InventoryAlertsManager({
  initialAlerts,
  stations,
}: {
  initialAlerts: any[];
  stations: { id: string; name: string; code: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [isOpen, setIsOpen] = useState(false);

  const [alertList, setAlertList] = useState(initialAlerts);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Draft States (Bound to UI inputs)
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string>("ALL");
  const [draftVarianceType, setDraftVarianceType] = useState<string>("ALL");

  // Applied States (Used for filtering logic)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = useState<string[]>(draftStationIds);
  const [appliedStatus, setAppliedStatus] = useState<string>(draftStatus);
  const [appliedVarianceType, setAppliedVarianceType] = useState<string>(draftVarianceType);

  const applyFilters = useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedStatus(draftStatus);
    setAppliedVarianceType(draftVarianceType);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftStatus, draftVarianceType]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftStatus("ALL");
    setDraftVarianceType("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedStatus("ALL");
    setAppliedVarianceType("ALL");
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

  const filteredAlerts = useMemo(() => {
    return alertList.filter((alert) => {
      if (appliedStationIds.length > 0 && (!alert.stationId || !appliedStationIds.includes(alert.stationId))) {
        return false;
      }
      if (appliedStatus !== "ALL" && alert.status !== appliedStatus) {
        return false;
      }
      if (appliedVarianceType !== "ALL" && alert.varianceLog?.varianceType !== appliedVarianceType) {
        return false;
      }

      const logDate = new Date(alert.createdAt);
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
  }, [alertList, appliedDateRange, appliedStationIds, appliedStatus, appliedVarianceType]);

  const stats = useMemo(() => {
    let openCount = 0;
    let resolvedCount = 0;
    let totalVarianceVolume = 0;

    filteredAlerts.forEach((a) => {
      if (a.status === "OPEN" || a.status === "PENDING_APPROVAL") openCount++;
      if (a.status === "RESOLVED" || a.status === "CLOSED") resolvedCount++;
      if (a.varianceLog?.varianceVolume) totalVarianceVolume += Number(a.varianceLog.varianceVolume);
    });

    return { total: filteredAlerts.length, openCount, resolvedCount, totalVarianceVolume };
  }, [filteredAlerts]);

  const statCards = [
    {
      title: "Total Alerts",
      value: stats.total.toString(),
      icon: AlertTriangle,
      valueColor: "",
      iconColor: "text-slate-600",
    },
    {
      title: "Needs Review",
      value: stats.openCount.toString(),
      icon: Gauge,
      valueColor: "text-rose-600",
      iconColor: "text-rose-600",
    },
    {
      title: "Total Variance Volume",
      value: `${stats.totalVarianceVolume.toLocaleString()} L`,
      icon: Droplets,
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
    {
      title: "Resolved",
      value: stats.resolvedCount.toString(),
      icon: CheckCircle2,
      valueColor: "text-emerald-600",
      iconColor: "text-emerald-600",
    }
  ];

  const getStatusBadge = (status: string) => {
    const isResolved = status === "RESOLVED" || status === "CLOSED";
    const isPending = status === "PENDING_APPROVAL" || status === "OPEN";
    const isRejected = status === "REJECTED";
    return (
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap print:text-black",
        isResolved ? "text-emerald-600 bg-emerald-50" : isPending ? "text-amber-600 bg-amber-50" : isRejected ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-50",
        "px-2 py-1 rounded print:bg-transparent print:p-0"
      )}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const activeAlert = useMemo(
    () => alertList.find((a) => a.id === activeAlertId) ?? null,
    [alertList, activeAlertId]
  );
  const isActiveResolved = activeAlert?.status === "RESOLVED" || activeAlert?.status === "CLOSED";

  async function resolveAlert(id: string, action: "APPROVE" | "REJECT") {
    const remark = remarks[id] || "";
    if (!remark && action === "APPROVE") {
      toast.error("Please provide a remark/reason before acknowledging.");
      return;
    }

    setProcessing(id);
    const res = await apiPost<{ ticket: any }>(`/api/tenant/tickets/${id}/resolve`, {
      action,
      remark,
    });
    setProcessing(null);

    if (res.error) {
      toast.error(res.error.message || "Failed to update alert.");
      return;
    }

    toast.success(`Alert ${action.toLowerCase()}d successfully.`);
    if (res.data) {
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, ...res.data!.ticket, status: res.data!.ticket.status } : a));
      setRemarks(prev => ({ ...prev, [id]: "" }));
      setActiveAlertId(null);
    }
  }

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
            Inventory Alerts
          </h1>
          <p className="text-xs text-muted-foreground print:hidden">
            System-detected stock variances from dipping and waybill deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {(appliedStationIds.length > 0 || appliedStatus !== "ALL" || appliedVarianceType !== "ALL" || appliedDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          appliedStationIds.length > 0,
                          appliedStatus !== "ALL",
                          appliedVarianceType !== "ALL",
                          !!appliedDateRange,
                        ].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Filter Records</SheetTitle>
                    <SheetDescription>
                      Apply filters to narrow down the inventory alert list.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
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

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                      <Select value={draftStatus} onValueChange={setDraftStatus}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Variance Source</Label>
                      <Select value={draftVarianceType} onValueChange={setDraftVarianceType}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Sources</SelectItem>
                          <SelectItem value="TANK_DIPPING">Tank Dipping</SelectItem>
                          <SelectItem value="WAYBILL_DELIVERY">Waybill Delivery</SelectItem>
                        </SelectContent>
                      </Select>
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

              <Button
                variant="outline"
                size="icon"
                onClick={() => window.print()}
                title="Print report"
                className="h-10 w-10"
              >
                <Printer className="size-4" />
              </Button>

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

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-black">Inventory Alerts</h1>
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
                  "w-full md:w-1/4 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  "md:border-b-0",
                  index === statCards.length - 1 ? "md:border-e-0" : "md:border-e"
                )}
              >
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
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      {filteredAlerts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed bg-card">
          No inventory alerts found for the selected filters.
        </div>
      ) : (
        <>
          {/* ── CARD VIEW ─────────────────────────────────────────────────── */}
          <div className={cn("space-y-4 hide-on-print", viewMode === "card" ? "block" : "hidden")}>
            {filteredAlerts.map((a) => {
              const variance = a.varianceLog;
              return (
                <Card
                  key={a.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardHeader className="bg-muted/30 p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                      <CardTitle className="text-base flex items-center gap-2">
                        {a.station?.name || "Global"}
                        {variance && (
                          <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold">
                            {variance.varianceType.replace("_", " ")}
                          </Badge>
                        )}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatHumanReadableDate(a.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(a.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm">{a.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    </div>

                    {variance && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Variance:</span>
                        <VarianceBadge varianceVolume={Number(variance.varianceVolume)} />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      {a.status === "RESOLVED" || a.status === "CLOSED" ? (
                        <span className="text-[11px] text-muted-foreground truncate">
                          Ack. by <span className="font-semibold text-emerald-700">{a.approvedBy?.firstName || a.approvedBy?.email || "Admin"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Awaiting review</span>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setActiveAlertId(a.id)}>
                        {a.status === "RESOLVED" || a.status === "CLOSED" ? "View Details" : "Resolve"}
                      </Button>
                    </div>
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
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Source</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Details</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Status</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-center text-muted-foreground print:text-black hide-on-print border-l">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 print:divide-black/20">
                  {filteredAlerts.map((a) => {
                    const variance = a.varianceLog;
                    const isResolved = a.status === "RESOLVED" || a.status === "CLOSED";
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-muted/20 bg-background print:bg-transparent group"
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-medium print:text-[10px] print:text-black border-r border-border/50 print:border-black/30 align-top">
                          {formatHumanReadableDate(a.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold print:text-[10px] print:text-black border-r border-border/50 print:border-black/30 align-top">
                          {a.station?.name || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-border/50 print:border-black/30 align-top">
                          {variance && (
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded print:bg-transparent print:border print:border-black/30 print:text-[9px] print:text-black">
                              {variance.varianceType.replace("_", " ")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-border/50 print:border-black/30 align-top max-w-xs">
                          <div className="font-medium text-sm print:text-xs truncate" title={a.title}>{a.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 print:text-[10px] truncate" title={a.description}>
                            {a.description}
                          </div>
                          {variance && (
                            <div className="mt-1.5">
                              <VarianceBadge varianceVolume={Number(variance.varianceVolume)} />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-border/50 print:border-black/30 align-top">
                          {getStatusBadge(a.status)}
                        </td>
                        <td className="px-3 py-2 text-center border-l hide-on-print align-top">
                          {isResolved ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-[11px] font-semibold text-emerald-700 truncate max-w-[160px]">
                                Ack. by {a.approvedBy?.firstName || a.approvedBy?.email || "Admin"}
                              </span>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setActiveAlertId(a.id)}>
                                View Details
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => setActiveAlertId(a.id)}>
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Resolve / Details Modal ───────────────────────────────────── */}
      <Dialog open={!!activeAlertId} onOpenChange={(open) => !open && setActiveAlertId(null)}>
        <DialogContent className="sm:max-w-lg">
          {activeAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                  {activeAlert.title}
                </DialogTitle>
                <DialogDescription>{activeAlert.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Station</p>
                      <p className="truncate font-medium">{activeAlert.station?.name || "Global"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Date Raised</p>
                      <p className="truncate font-medium">{formatHumanReadableDate(activeAlert.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Source</p>
                      <p className="truncate font-medium">
                        {activeAlert.varianceLog?.varianceType?.replace("_", " ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Gauge className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                      <div className="mt-0.5">{getStatusBadge(activeAlert.status)}</div>
                    </div>
                  </div>
                </div>

                {activeAlert.varianceLog && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Volume Variance
                    </p>
                    <VarianceMeter
                      expected={Number(activeAlert.varianceLog.expectedVolume)}
                      actual={Number(activeAlert.varianceLog.actualVolume)}
                    />
                  </div>
                )}

                {isActiveResolved ? (
                  <div className="space-y-1 rounded-lg border bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-700">
                      Acknowledged by {activeAlert.approvedBy?.firstName || activeAlert.approvedBy?.email || "Admin"}
                    </p>
                    {activeAlert.remark && (
                      <p className="text-sm italic text-muted-foreground">&ldquo;{activeAlert.remark}&rdquo;</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Remark / Reason</Label>
                    <Textarea
                      placeholder="Explain the cause or the action taken to resolve this alert..."
                      value={remarks[activeAlert.id] || ""}
                      onChange={(e) =>
                        setRemarks((prev) => ({ ...prev, [activeAlert.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {!isActiveResolved && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => resolveAlert(activeAlert.id, "REJECT")}
                    disabled={processing === activeAlert.id}
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => resolveAlert(activeAlert.id, "APPROVE")}
                    disabled={processing === activeAlert.id}
                  >
                    Acknowledge
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

import { Ticket, CheckCircle2, Maximize2, Minimize2, Printer, LayoutGrid, TableProperties, Filter, AlertCircle, Calendar, Wrench } from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";

export function TicketsManager({
  initialTickets,
  stations,
}: {
  initialTickets: any[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [isOpen, setIsOpen] = useState(false);

  const [ticketList, setTicketList] = useState(initialTickets);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  // Draft States (Bound to UI inputs)
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string>("ALL");
  const [draftCategory, setDraftCategory] = useState<string>("ALL");

  // Applied States (Used for filtering logic)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = useState<string[]>(draftStationIds);
  const [appliedStatus, setAppliedStatus] = useState<string>(draftStatus);
  const [appliedCategory, setAppliedCategory] = useState<string>(draftCategory);

  const applyFilters = useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedStatus(draftStatus);
    setAppliedCategory(draftCategory);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftStatus, draftCategory]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftStatus("ALL");
    setDraftCategory("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedStatus("ALL");
    setAppliedCategory("ALL");
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

  const filteredTickets = useMemo(() => {
    return ticketList.filter((ticket) => {
      if (appliedStationIds.length > 0 && (!ticket.stationId || !appliedStationIds.includes(ticket.stationId))) {
        return false;
      }
      if (appliedStatus !== "ALL" && ticket.status !== appliedStatus) {
        return false;
      }
      if (appliedCategory !== "ALL" && ticket.category !== appliedCategory) {
        return false;
      }
      
      const logDate = new Date(ticket.createdAt);
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
  }, [ticketList, appliedDateRange, appliedStationIds, appliedStatus, appliedCategory]);

  const stats = useMemo(() => {
    let openCount = 0;
    let resolvedCount = 0;
    let maintenanceCount = 0;

    filteredTickets.forEach((t) => {
      if (t.status === "OPEN" || t.status === "PENDING_APPROVAL") openCount++;
      if (t.status === "RESOLVED" || t.status === "CLOSED") resolvedCount++;
      if (t.category === "EQUIPMENT_FAULT" || t.category === "MAINTENANCE") maintenanceCount++;
    });

    return { total: filteredTickets.length, openCount, resolvedCount, maintenanceCount };
  }, [filteredTickets]);

  const statCards = [
    {
      title: "Total Tickets",
      value: stats.total.toString(),
      fullValue: null,
      icon: Ticket,
      valueColor: "",
      iconColor: "text-slate-600",
    },
    {
      title: "Action Required",
      value: stats.openCount.toString(),
      fullValue: null,
      icon: AlertCircle,
      valueColor: "text-rose-600",
      iconColor: "text-rose-600",
    },
    {
      title: "Maintenance / Equipment",
      value: stats.maintenanceCount.toString(),
      fullValue: null,
      icon: Wrench,
      valueColor: "text-indigo-600",
      iconColor: "text-indigo-600",
    },
    {
      title: "Resolved",
      value: stats.resolvedCount.toString(),
      fullValue: null,
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

  async function resolveTicket(id: string, action: "APPROVE" | "REJECT") {
    const remark = remarks[id] || "";
    if (!remark && action === "APPROVE") {
      alert("Please provide a remark/reason before approving.");
      return;
    }

    setProcessing(id);
    const res = await apiPost<{ ticket: any }>(`/api/tenant/tickets/${id}/resolve`, {
      action,
      remark,
    });
    setProcessing(null);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    if (res.data) {
      setTicketList(prev => prev.map(t => t.id === id ? { ...t, ...res.data!.ticket, status: res.data!.ticket.status } : t));
      setRemarks(prev => ({ ...prev, [id]: "" }));
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
            Tickets Management
          </h1>
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
                    {(appliedStationIds.length > 0 || appliedStatus !== "ALL" || appliedCategory !== "ALL" || appliedDateRange) && (
                      <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
                        {[
                          appliedStationIds.length > 0,
                          appliedStatus !== "ALL",
                          appliedCategory !== "ALL",
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
                      Apply filters to narrow down the ticket list.
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
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Category</Label>
                      <Select value={draftCategory} onValueChange={setDraftCategory}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Categories</SelectItem>
                          <SelectItem value="EQUIPMENT_FAULT">Equipment Fault</SelectItem>
                          <SelectItem value="CASH_DISCREPANCY">Cash Discrepancy</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
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
        <h1 className="text-2xl font-bold tracking-tight text-black">Tickets Management</h1>
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

      {filteredTickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed bg-card">
          No tickets found for the selected filters.
        </div>
      ) : (
        <>
          {/* ── CARD VIEW ─────────────────────────────────────────────────── */}
          <div className={cn("space-y-4 hide-on-print", viewMode === "card" ? "block" : "hidden")}>
            {filteredTickets.map((t) => {
              const variance = t.varianceLog;
              return (
                <Card 
                  key={t.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardHeader className="bg-muted/30 p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                      <CardTitle className="text-base flex items-center gap-2">
                        {t.station?.name || "Global"}
                        <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold">
                          {t.category.replace("_", " ")}
                        </Badge>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatHumanReadableDate(t.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(t.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm">{t.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                    </div>

                    {variance && (
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Variance Log Details</h4>
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Expected</span>
                            <span className="text-xs font-mono">{Number(variance.expectedVolume).toLocaleString()} L</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Actual</span>
                            <span className="text-xs font-mono">{Number(variance.actualVolume).toLocaleString()} L</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Variance</span>
                            <span className="text-xs font-mono font-bold text-rose-600">{Number(variance.varianceVolume).toLocaleString()} L</span>
                          </div>
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
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Category</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Title / Details</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/50 print:border-black/30 print:text-black">Status</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-center text-muted-foreground print:text-black hide-on-print border-l">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 print:divide-black/20">
                  {filteredTickets.map((t) => {
                    const variance = t.varianceLog;
                    const isResolved = t.status === "RESOLVED" || t.status === "CLOSED";
                    return (
                      <tr 
                        key={t.id}
                        className="hover:bg-muted/20 bg-background print:bg-transparent group"
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-medium print:text-[10px] print:text-black border-r border-border/50 print:border-black/30 align-top">
                          {formatHumanReadableDate(t.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold print:text-[10px] print:text-black border-r border-border/50 print:border-black/30 align-top">
                          {t.station?.name || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-border/50 print:border-black/30 align-top">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded print:bg-transparent print:border print:border-black/30 print:text-[9px] print:text-black">
                            {t.category.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r border-border/50 print:border-black/30 align-top max-w-sm">
                          <div className="font-medium text-sm print:text-xs">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 print:text-[10px]">{t.description}</div>
                          {variance && (
                            <div className="mt-2 flex gap-2 text-[10px] font-mono p-2 bg-slate-50 border rounded print:bg-transparent print:p-0 print:border-none">
                              <span>Exp: {Number(variance.expectedVolume).toLocaleString()}L</span>
                              <span className="text-border">|</span>
                              <span>Act: {Number(variance.actualVolume).toLocaleString()}L</span>
                              <span className="text-border">|</span>
                              <span className="text-rose-600 font-bold">Var: {Number(variance.varianceVolume).toLocaleString()}L</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-border/50 print:border-black/30 align-top">
                          {getStatusBadge(t.status)}
                        </td>
                        <td className="px-3 py-2 text-center border-l hide-on-print align-top">
                          {isResolved ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[11px] font-semibold text-emerald-700">Resolved by {t.approvedBy?.firstName || t.approvedBy?.email || "Admin"}</span>
                              <span className="text-xs text-muted-foreground text-left max-w-[200px] truncate" title={t.remark}>"{t.remark}"</span>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-start justify-end flex-wrap w-full max-w-[220px]">
                              <Input
                                placeholder="Reason / Remark"
                                value={remarks[t.id] || ""}
                                onChange={(e) => setRemarks(prev => ({ ...prev, [t.id]: e.target.value }))}
                                className="h-8 w-full text-xs"
                              />
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => resolveTicket(t.id, "APPROVE")}
                                disabled={processing === t.id}
                                className="h-8 flex-1"
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => resolveTicket(t.id, "REJECT")}
                                disabled={processing === t.id}
                                className="h-8"
                              >
                                Reject
                              </Button>
                            </div>
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
    </div>
  );
}

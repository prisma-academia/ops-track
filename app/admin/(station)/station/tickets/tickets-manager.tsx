"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Ticket,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Printer,
  LayoutGrid,
  TableProperties,
  Filter,
  AlertCircle,
  Calendar,
  Wrench,
  Plus,
  MapPin,
  Smartphone,
  Monitor,
  Cpu,
  Receipt,
  AlertTriangle,
  Droplets,
  Banknote,
  HandCoins,
  Wallet,
  User,
  Image as ImageIcon,
  Link2,
  CircleDot,
  Clock,
  BadgeCheck,
  XCircle,
  Lock,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/client/api";

function OriginBadge({ origin }: { origin: string }) {
  const Icon = origin === "SYSTEM" ? Cpu : origin === "MOBILE" ? Smartphone : Monitor;
  const label = origin === "SYSTEM" ? "System" : origin === "MOBILE" ? "Mobile" : "Admin";
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function personName(person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

function categoryMeta(category: string) {
  if (category === "EQUIPMENT_FAULT") return { icon: Wrench, className: "text-orange-600 bg-orange-50" };
  if (category === "INCIDENT_REPORT" || category === "CASH_DISCREPANCY") {
    return { icon: AlertTriangle, className: "text-rose-600 bg-rose-50" };
  }
  if (category === "INVENTORY_VARIANCE") return { icon: Droplets, className: "text-indigo-600 bg-indigo-50" };
  if (category === "EXPENSE_REQUEST" || category === "EXPENSE_VERIFY") {
    return { icon: Receipt, className: "text-emerald-700 bg-emerald-50" };
  }
  return { icon: CircleDot, className: "text-slate-600 bg-slate-50" };
}

function statusMeta(status: string) {
  if (status === "CLOSED") return { icon: Lock, className: "text-emerald-700 bg-emerald-50" };
  if (status === "RESOLVED") return { icon: BadgeCheck, className: "text-emerald-600 bg-emerald-50" };
  if (status === "REJECTED") return { icon: XCircle, className: "text-rose-600 bg-rose-50" };
  if (status === "APPROVED") return { icon: Banknote, className: "text-indigo-600 bg-indigo-50" };
  if (status === "PENDING_APPROVAL") return { icon: Clock, className: "text-amber-600 bg-amber-50" };
  return { icon: AlertCircle, className: "text-amber-700 bg-amber-50" };
}

function formatNaira(value: unknown) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return `₦${amount.toLocaleString()}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  INVENTORY_VARIANCE: "Inventory variance",
  EQUIPMENT_FAULT: "Equipment fault",
  CASH_DISCREPANCY: "Cash discrepancy",
  EXPENSE_REQUEST: "Spend request",
  EXPENSE_VERIFY: "Expense verify",
  INCIDENT_REPORT: "Incident report",
  OTHER: "Other",
};

export function TicketsManager({
  initialTickets,
  stations,
  bankAccounts = [],
  canCreate = false,
}: {
  initialTickets: any[];
  stations: { id: string; name: string; code: string }[];
  bankAccounts?: { id: string; bankName: string; accountName: string; accountNumber: string }[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "ALL";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [isOpen, setIsOpen] = useState(false);

  const [ticketList, setTicketList] = useState(initialTickets);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    stationId: stations[0]?.id ?? "",
    type: "EXPENSE" as "EXPENSE" | "EQUIPMENT_FAULT" | "INCIDENT_REPORT",
    title: "",
    description: "",
    spendIntent: "REQUEST" as "REQUEST" | "ALREADY_PAID",
    requestedAmount: "",
    requestedCategory: "OTHER",
    paymentMethod: "CASH",
    bankAccountId: "",
  });

  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [draftStationIds, setDraftStationIds] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string>("ALL");
  const [draftCategory, setDraftCategory] = useState<string>(initialCategory);
  const [draftOrigin, setDraftOrigin] = useState<string>("ALL");

  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(draftDateRange);
  const [appliedStationIds, setAppliedStationIds] = useState<string[]>(draftStationIds);
  const [appliedStatus, setAppliedStatus] = useState<string>(draftStatus);
  const [appliedCategory, setAppliedCategory] = useState<string>(draftCategory);
  const [appliedOrigin, setAppliedOrigin] = useState<string>(draftOrigin);

  const applyFilters = useCallback(() => {
    setAppliedDateRange(draftDateRange);
    setAppliedStationIds(draftStationIds);
    setAppliedStatus(draftStatus);
    setAppliedCategory(draftCategory);
    setAppliedOrigin(draftOrigin);
    setIsOpen(false);
  }, [draftDateRange, draftStationIds, draftStatus, draftCategory, draftOrigin]);

  const clearFilters = useCallback(() => {
    setDraftDateRange(undefined);
    setDraftStationIds([]);
    setDraftStatus("ALL");
    setDraftCategory("ALL");
    setDraftOrigin("ALL");
    setAppliedDateRange(undefined);
    setAppliedStationIds([]);
    setAppliedStatus("ALL");
    setAppliedCategory("ALL");
    setAppliedOrigin("ALL");
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
      if (appliedStatus !== "ALL" && ticket.status !== appliedStatus) return false;
      if (appliedCategory !== "ALL" && ticket.category !== appliedCategory) return false;
      if (appliedOrigin !== "ALL" && ticket.origin !== appliedOrigin) return false;

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
  }, [ticketList, appliedDateRange, appliedStationIds, appliedStatus, appliedCategory, appliedOrigin]);

  const stats = useMemo(() => {
    let openCount = 0;
    let resolvedCount = 0;
    let inventoryCount = 0;

    filteredTickets.forEach((t) => {
      if (t.status === "OPEN" || t.status === "PENDING_APPROVAL" || t.status === "APPROVED") openCount++;
      if (t.status === "RESOLVED" || t.status === "CLOSED") resolvedCount++;
      if (t.category === "INVENTORY_VARIANCE") inventoryCount++;
    });

    return { total: filteredTickets.length, openCount, resolvedCount, inventoryCount };
  }, [filteredTickets]);

  const statCards = [
    { title: "Total Tickets", value: stats.total.toString(), icon: Ticket, valueColor: "", iconColor: "text-slate-600" },
    { title: "Action Required", value: stats.openCount.toString(), icon: AlertCircle, valueColor: "text-rose-600", iconColor: "text-rose-600" },
    { title: "Inventory", value: stats.inventoryCount.toString(), icon: Wrench, valueColor: "text-indigo-600", iconColor: "text-indigo-600" },
    { title: "Resolved", value: stats.resolvedCount.toString(), icon: CheckCircle2, valueColor: "text-emerald-600", iconColor: "text-emerald-600" },
  ];

  const getStatusBadge = (status: string) => {
    const meta = statusMeta(status);
    const Icon = meta.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap print:text-black px-2 py-1 rounded print:bg-transparent print:p-0",
          meta.className,
        )}
      >
        <Icon className="size-3 print:hidden" />
        {status.replaceAll("_", " ")}
      </span>
    );
  };

  const openTicket = (id: string) => router.push(`/admin/station/tickets/${id}`);

  async function handleCreateTicket() {
    if (!createForm.stationId || !createForm.description.trim()) {
      alert("Station and description are required.");
      return;
    }
    if (
      createForm.type === "EXPENSE" &&
      (!createForm.requestedAmount || Number(createForm.requestedAmount) <= 0 || !createForm.requestedCategory)
    ) {
      alert("Expense tickets need a positive amount and expense category.");
      return;
    }
    setCreating(true);
    try {
      const category =
        createForm.type === "EXPENSE"
          ? createForm.spendIntent === "ALREADY_PAID"
            ? "EXPENSE_VERIFY"
            : "EXPENSE_REQUEST"
          : createForm.type;
      const res = await apiPost<{ ticket: any }>("/api/tenant/tickets", {
        stationId: createForm.stationId,
        category,
        title: createForm.title.trim() || undefined,
        description: createForm.description.trim(),
        spendIntent: createForm.type === "EXPENSE" ? createForm.spendIntent : "NONE",
        requestedAmount: createForm.type === "EXPENSE" ? Number(createForm.requestedAmount) : undefined,
        requestedCategory: createForm.type === "EXPENSE" ? createForm.requestedCategory : undefined,
        alreadyPaid:
          createForm.type === "EXPENSE" && createForm.spendIntent === "ALREADY_PAID"
            ? {
                paymentMethod: createForm.paymentMethod,
                bankAccountId: createForm.paymentMethod === "CASH" ? null : createForm.bankAccountId || null,
              }
            : undefined,
      });
      if (res.error) {
        alert(res.error.message);
        return;
      }
      if (res.data?.ticket) {
        setTicketList((prev) => [res.data!.ticket, ...prev]);
      }
      setCreateOpen(false);
      setCreateForm({
        stationId: stations[0]?.id ?? "",
        type: "EXPENSE",
        title: "",
        description: "",
        spendIntent: "REQUEST",
        requestedAmount: "",
        requestedCategory: "OTHER",
        paymentMethod: "CASH",
        bankAccountId: "",
      });
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-6 transition-all print:m-0 print:p-0 print:bg-white print:text-black print:space-y-3",
        isFullscreen && "fixed inset-0 z-40 bg-background p-6 overflow-auto w-full h-screen",
      )}
    >
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          .hide-on-print { display: none !important; }
          .force-table-print { display: table !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-card text-card-foreground p-3 rounded-xl border print:border-none print:shadow-none print:p-0 print:gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">Tickets</h1>
          <p className="text-xs text-muted-foreground print:hidden">
            Inventory alerts, operator tickets, and expense approvals in one inbox.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-md">
            <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setViewMode("card")}>
              <LayoutGrid className="size-4" />
            </Button>
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setViewMode("table")}>
              <TableProperties className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto print:hidden">
            <div className="shrink-0 flex gap-2">
              {canCreate && (
                <Button className="h-10 gap-2 hide-on-print" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create ticket
                </Button>
              )}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-sm relative h-10">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Filter Records</SheetTitle>
                    <SheetDescription>Narrow the unified ticket inbox.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Station</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", draftStationIds.length === 0 && "text-muted-foreground")}>
                            {draftStationIds.length === 0 ? "All Stations" : `${draftStationIds.length} station(s)`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 p-1">
                              <Checkbox id="station-all" checked={draftStationIds.length === 0} onCheckedChange={(checked) => { if (checked) setDraftStationIds([]); }} />
                              <label htmlFor="station-all" className="text-sm font-medium leading-none cursor-pointer">All Stations</label>
                            </div>
                            {stations.map((s) => (
                              <div key={s.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                  id={`station-${s.id}`}
                                  checked={draftStationIds.includes(s.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) setDraftStationIds([...draftStationIds, s.id]);
                                    else setDraftStationIds(draftStationIds.filter((id) => id !== s.id));
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
                          <Input type="date" value={draftDateRange?.from ? format(draftDateRange.from, "yyyy-MM-dd") : ""} onChange={(e) => setDraftDateRange((prev) => ({ from: e.target.value ? new Date(e.target.value) : undefined, to: prev?.to }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">To</Label>
                          <Input type="date" value={draftDateRange?.to ? format(draftDateRange.to, "yyyy-MM-dd") : ""} onChange={(e) => setDraftDateRange((prev) => ({ from: prev?.from, to: e.target.value ? new Date(e.target.value) : undefined }))} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">How it was made</Label>
                      <Select value={draftOrigin} onValueChange={setDraftOrigin}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All origins</SelectItem>
                          <SelectItem value="SYSTEM">System</SelectItem>
                          <SelectItem value="MOBILE">Mobile</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                      <Select value={draftStatus} onValueChange={setDraftStatus}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                          <SelectItem value="APPROVED">Approved (awaiting payout)</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 w-full">
                      <Label className="text-xs text-muted-foreground font-medium">Category</Label>
                      <Select value={draftCategory} onValueChange={setDraftCategory}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Categories</SelectItem>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SheetFooter className="border-t pt-4">
                    <Button variant="outline" onClick={clearFilters} className="w-full">Reset Filters</Button>
                    <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="icon" onClick={() => window.print()} className="h-10 w-10">
                <Printer className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-10 w-10">
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 print:shadow-none print:border-none print:bg-transparent">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 print:gap-4 print:justify-between">
            {statCards.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  "w-full md:w-1/4 border-border print:border-none print:w-auto",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  "md:border-b-0",
                  index === statCards.length - 1 ? "md:border-e-0" : "md:border-e",
                )}
              >
                <div className="p-4 flex items-start justify-between print:p-0 h-full">
                  <div className="flex flex-col gap-2 print:gap-0.5">
                    <p className="text-xs font-medium text-muted-foreground print:text-[10px] print:text-black/60 uppercase tracking-wider">{item.title}</p>
                    <p className={cn("text-md font-semibold text-card-foreground print:text-[13px] print:text-black", item.valueColor)}>{item.value}</p>
                  </div>
                  <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50 print:hidden">
                    <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
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
          <div className={cn("space-y-4 hide-on-print", viewMode === "card" ? "block" : "hidden")}>
            {filteredTickets.map((t) => (
              <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 p-4 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex flex-col">
                    <CardTitle className="text-base flex items-center gap-2">
                      {t.station?.name || "Global"}
                      <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold gap-1">
                        {(() => {
                          const TypeIcon = categoryMeta(t.category).icon;
                          return <TypeIcon className="size-3" />;
                        })()}
                        {CATEGORY_LABELS[t.category] || t.category}
                      </Badge>
                      <OriginBadge origin={t.origin} />
                    </CardTitle>
                    <span className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatHumanReadableDate(t.createdAt)}
                    </span>
                  </div>
                  {getStatusBadge(t.status)}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm">{t.title}</h4>
                  <p className="text-xs text-muted-foreground">{t.originStory || t.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User className="size-3" />{personName(t.raisedBy)}</span>
                    {formatNaira(t.requestedAmount) && (
                      <span className="inline-flex items-center gap-1"><Banknote className="size-3" />{formatNaira(t.requestedAmount)}</span>
                    )}
                    {t.children?.length > 0 && (
                      <span className="inline-flex items-center gap-1"><Link2 className="size-3" />{t.children.length} linked spend</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openTicket(t.id)}>
                    {t.status === "RESOLVED" || t.status === "CLOSED" || t.status === "REJECTED" ? "View details" : "Review"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className={cn("w-full overflow-hidden force-table-print", viewMode === "table" ? "block hide-on-print" : "hidden print:block")}>
            <div className="overflow-x-auto border rounded-xl print:rounded-none print:border-none">
              <table className="min-w-max w-full text-sm border-collapse border border-border/50 print:text-[10px] bg-card">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Date</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Station</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Type</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Ticket</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Raised by</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Origin</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Spend</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Linked</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Evidence</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r">Status</th>
                    <th className="h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-center text-muted-foreground hide-on-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const isResolved = t.status === "RESOLVED" || t.status === "CLOSED" || t.status === "REJECTED";
                    const type = categoryMeta(t.category);
                    const TypeIcon = type.icon;
                    const requested = formatNaira(t.requestedAmount);
                    const approved = formatNaira(t.approvedAmount);
                    const paid = formatNaira(t.paidAmount);
                    const childCount = Array.isArray(t.children) ? t.children.length : 0;
                    const evidenceCount = Array.isArray(t.evidenceUrls) ? t.evidenceUrls.length : 0;
                    const intent = t.spendIntent === "ALREADY_PAID" ? "Already paid" : t.spendIntent === "REQUEST" ? "Request" : null;
                    const IntentIcon = t.spendIntent === "ALREADY_PAID" ? Wallet : HandCoins;
                    return (
                      <tr key={t.id} className="hover:bg-muted/20 bg-background">
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            {formatHumanReadableDate(t.createdAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <MapPin className="size-3.5 text-muted-foreground" />
                            {t.station?.name || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          <span className={cn("inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", type.className)}>
                            <TypeIcon className="size-3" />
                            {CATEGORY_LABELS[t.category] || t.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r align-top max-w-xs">
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.originStory || t.description}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            {personName(t.raisedBy)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top"><OriginBadge origin={t.origin} /></td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          {requested ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Banknote className="size-3.5 text-muted-foreground" />
                                {requested}
                              </span>
                              {intent && (
                                <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  <IntentIcon className="size-3" />
                                  {intent}
                                </div>
                              )}
                              {approved && <div className="text-[11px] text-indigo-700">Cap {approved}</div>}
                              {paid && <div className="text-[11px] text-emerald-700">Paid {paid}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          {t.parent || childCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Link2 className="size-3.5 text-muted-foreground" />
                              {t.parent ? "Child spend" : `${childCount} spend`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <ImageIcon className="size-3.5 text-muted-foreground" />
                            {evidenceCount > 0 ? evidenceCount : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r align-top">{getStatusBadge(t.status)}</td>
                        <td className="px-3 py-2 text-center hide-on-print align-top">
                          {isResolved ? (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openTicket(t.id)}>View</Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openTicket(t.id)}>Review</Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl overflow-visible">
          <DialogHeader>
            <DialogTitle>Create ticket</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <div className="space-y-1.5">
              <Label>Station</Label>
              <Select
                value={createForm.stationId}
                onValueChange={(stationId) => setCreateForm((prev) => ({ ...prev, stationId }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={createForm.type}
                onValueChange={(type) =>
                  setCreateForm((prev) => ({ ...prev, type: type as typeof prev.type }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="EQUIPMENT_FAULT">Equipment fault</SelectItem>
                  <SelectItem value="INCIDENT_REPORT">Report incident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title (optional)</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short summary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what happened"
                rows={2}
              />
            </div>

            {createForm.type === "EXPENSE" && (
              <>
                <div className="space-y-1.5">
                  <Label>Intent</Label>
                  <Select
                    value={createForm.spendIntent}
                    onValueChange={(spendIntent) =>
                      setCreateForm((prev) => ({ ...prev, spendIntent: spendIntent as typeof prev.spendIntent }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="REQUEST">Request money</SelectItem>
                      <SelectItem value="ALREADY_PAID">Already paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <NumberInput
                    value={createForm.requestedAmount}
                    onChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, requestedAmount: value === "" ? "" : String(value) }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expense category</Label>
                  <Select
                    value={createForm.requestedCategory}
                    onValueChange={(requestedCategory) =>
                      setCreateForm((prev) => ({ ...prev, requestedCategory }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="FUEL_FOR_GEN">Generator fuel</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="UTILITIES">Utilities</SelectItem>
                      <SelectItem value="STATIONERY">Stationery</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createForm.spendIntent === "ALREADY_PAID" ? (
                  <div className="space-y-1.5">
                    <Label>How it was paid</Label>
                    <Select
                      value={createForm.paymentMethod}
                      onValueChange={(paymentMethod) => setCreateForm((prev) => ({ ...prev, paymentMethod }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="POS">POS</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {createForm.spendIntent === "ALREADY_PAID" && createForm.paymentMethod !== "CASH" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Account used</Label>
                    <Select
                      value={createForm.bankAccountId}
                      onValueChange={(bankAccountId) => setCreateForm((prev) => ({ ...prev, bankAccountId }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {bankAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.bankName} · {a.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={creating}>
              {creating ? "Creating..." : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

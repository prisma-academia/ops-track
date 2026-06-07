"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField, TextInput } from "@/components/form-field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Truck,
  Coins,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MapPin,
  Flame,
  Gauge,
  User,
  ClipboardList,
  X
} from "lucide-react";

// ==========================================
// FORM SCHEMAS
// ==========================================

const AddTankSchema = z.object({
  name: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive(),
});

const AddPumpSchema = z.object({
  name: z.string().min(1).max(50),
  tankId: z.string().min(1),
  nozzles: z.array(z.object({ name: z.string().min(1) })).min(1),
});

const StartShiftSchema = z.object({
  nozzleId: z.string().min(1),
  attendantId: z.string().min(1),
  openingMeter: z.coerce.number().nonnegative(),
  shiftDate: z.string().min(1),
});

const CloseShiftSchema = z.object({
  closingMeter: z.coerce.number().nonnegative(),
  declaredCash: z.coerce.number().nonnegative(),
  declaredPos: z.coerce.number().nonnegative(),
  declaredTransfer: z.coerce.number().nonnegative(),
});

const RecordExpenseSchema = z.object({
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]),
  paymentMethod: z.enum(["CASH", "POS"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(2).max(500),
  receiptUrl: z.string().optional().or(z.literal("")),
});

const RaiseTicketSchema = z.object({
  category: z.enum(["INVENTORY_VARIANCE", "EQUIPMENT_FAULT", "CASH_DISCREPANCY", "OTHER"]),
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
});

const DeliverWaybillSchema = z.object({
  litersReceived: z.coerce.number().positive(),
  gpsLatitude: z.coerce.number().optional().nullable(),
  gpsLongitude: z.coerce.number().optional().nullable(),
  pictures: z.array(z.string()).default([]),
});

const SetPriceSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  pricePerLiter: z.coerce.number().positive(),
  effectiveFrom: z.string().optional().or(z.literal("")),
});

const RecordDippingSchema = z.object({
  tankId: z.string().min(1),
  dippingLiters: z.coerce.number().nonnegative(),
  reason: z.enum(["ROUTINE", "WAYBILL_DELIVERY", "PRICE_CHANGE"]),
  pricePerLiter: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  recordedAt: z.string().min(1),
});

// ==========================================
// HELPER FUNCTIONS FOR DATE FORMATTING
// ==========================================

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
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
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

// ==========================================
// COMPONENT DEFINITION
// ==========================================

export function StationDetailsManager({
  station,
  tenantUsers,
  currentUserId,
}: {
  station: any;
  tenantUsers: { id: string; email: string; firstName: string | null; lastName: string | null }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<any | null>(null);
  const [selectedCloseShift, setSelectedCloseShift] = useState<any | null>(null);
  const [selectedStartPumpId, setSelectedStartPumpId] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Forms
  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
  });

  const pumpForm = useForm({
    resolver: zodResolver(AddPumpSchema),
    defaultValues: { nozzles: [{ name: "Nozzle A" }] },
  });

  const { fields: nozzleFields, append: appendNozzle, remove: removeNozzle } = useFieldArray({
    control: pumpForm.control,
    name: "nozzles",
  });

  const startShiftForm = useForm({
    resolver: zodResolver(StartShiftSchema),
    defaultValues: {
      shiftDate: new Date().toISOString().split("T")[0],
      nozzleId: "",
      attendantId: "",
      openingMeter: 0,
    },
  });

  const closeShiftForm = useForm({
    resolver: zodResolver(CloseShiftSchema),
    defaultValues: {
      closingMeter: 0,
      declaredCash: 0,
      declaredPos: 0,
      declaredTransfer: 0,
    },
  });

  const expenseForm = useForm({
    resolver: zodResolver(RecordExpenseSchema),
    defaultValues: { paymentMethod: "CASH" },
  });

  const ticketForm = useForm({
    resolver: zodResolver(RaiseTicketSchema),
  });

  const waybillForm = useForm({
    resolver: zodResolver(DeliverWaybillSchema),
  });

  const priceForm = useForm({
    resolver: zodResolver(SetPriceSchema),
  });

  const dippingForm = useForm({
    resolver: zodResolver(RecordDippingSchema),
    defaultValues: {
      tankId: "",
      dippingLiters: 0,
      reason: "ROUTINE",
      pricePerLiter: "",
      recordedAt: new Date().toISOString(),
    },
  });

  // Helper selectors
  const allNozzles = station.pumps.flatMap((p: any) =>
    p.nozzles.map((n: any) => ({
      id: n.id,
      name: `${p.name} - ${n.name} (${p.tank.productType})`,
    }))
  );

  const allDippings = station.tanks
    .flatMap((t: any) => t.dippings.map((d: any) => ({ ...d, tank: t })))
    .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  // Action Submissions
  const handleAddTank = tankForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/tanks`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleAddPump = pumpForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/pumps`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleStartShift = startShiftForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/shifts`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleCloseShift = closeShiftForm.handleSubmit(async (values) => {
    if (!selectedCloseShift) return;
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/shifts/${selectedCloseShift.id}/close`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleRecordExpense = expenseForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/expenses", {
      ...values,
      stationId: station.id,
    });
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleRaiseTicket = ticketForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/tickets", {
      ...values,
      stationId: station.id,
    });
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleDeliverWaybill = waybillForm.handleSubmit(async (values) => {
    if (!selectedWaybill) return;
    setApiError(null);
    const res = await apiPatch(`/api/tenant/waybills/${selectedWaybill.id}`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleSetPrice = priceForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/prices`, {
      ...values,
      effectiveFrom: values.effectiveFrom ? new Date(values.effectiveFrom).toISOString() : undefined,
    });
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleRecordDipping = dippingForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost(`/api/tenant/stations/${station.id}/dippings`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleReconcileShift = async (shiftId: string) => {
    const res = await apiPost(`/api/tenant/stations/${station.id}/shifts/${shiftId}/reconcile`, {});
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const handleApproveExpense = async (expenseId: string, approved: boolean) => {
    const res = await apiPost(`/api/tenant/expenses/${expenseId}/approve`, { approved });
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const handleApproveTicket = async (ticketId: string, approved: boolean) => {
    const res = await apiPost(`/api/tenant/tickets/${ticketId}/approve`, { approved });
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedWaybill(null);
    setSelectedCloseShift(null);
    setSelectedStartPumpId("");
    setApiError(null);
    tankForm.reset();
    pumpForm.reset({ nozzles: [{ name: "Nozzle A" }] });
    startShiftForm.reset({ shiftDate: new Date().toISOString().split("T")[0] });
    closeShiftForm.reset();
    expenseForm.reset();
    ticketForm.reset();
    waybillForm.reset();
    priceForm.reset();
    dippingForm.reset();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* ---------------- Header ---------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wider mb-1">
            <MapPin size={14} />
            <span>{station.region} Region</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{station.name}</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">Station Code: {station.code}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/stations")}>
            Back to Stations
          </Button>
          <Button onClick={() => setActiveDialog("setPrice")}>
            Set Fuel Price
          </Button>
        </div>
      </div>

      {/* ---------------- Stats Grid ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium text-muted-foreground">Tanks</CardDescription>
            <Flame className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{station.tanks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Underground reservoirs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium text-muted-foreground">Pumps</CardDescription>
            <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{station.pumps.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active dispensers</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium text-muted-foreground">Waybills</CardDescription>
            <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{station.waybills.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Supply tanker dispatches</p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium text-muted-foreground">Tickets</CardDescription>
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {station.tickets.filter((t: any) => t.status === "OPEN").length} Open
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending approval or resolve</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Tabs Navigation ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full ">
        <TabsList>
          <TabsTrigger value="overview">Overview & Staff</TabsTrigger>
          <TabsTrigger value="inventory">Tanks & Pumps</TabsTrigger>
          <TabsTrigger value="dippings">Dipping Records</TabsTrigger>
          <TabsTrigger value="shifts">Attendant Shifts</TabsTrigger>
          <TabsTrigger value="expenses">Local Expenses</TabsTrigger>
          <TabsTrigger value="tickets">Issues / Tickets</TabsTrigger>
        </TabsList>

        {/* ---------------- OVERVIEW TAB ---------------- */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Location Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Location Address</span>
                  <span className="font-semibold text-sm text-right">{station.location || "No address specified"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Station Region</span>
                  <span className="font-semibold text-sm">{station.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Date Added</span>
                  <span className="font-semibold text-sm">{formatHumanReadableDate(station.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assigned Staff</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y max-h-48 overflow-y-auto pr-1">
                  {station.staff.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-3">No staff members assigned to this station.</div>
                  ) : (
                    station.staff.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 py-2.5">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {s.firstName || s.lastName ? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() : "Un-named Staff"}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- INVENTORY TAB ---------------- */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Fuel Inventory Configurations</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveDialog("addTank")}>
                <Plus size={16} className="mr-1" /> Add Tank
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveDialog("addPump")}>
                <Plus size={16} className="mr-1" /> Add Pump
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tanks Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tanks Capacity Overview</h3>
              {station.tanks.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground text-sm">No underground fuel tanks defined yet.</Card>
              ) : (
                station.tanks.map((tank: any) => {
                  const lastDip = tank.dippings[0];
                  const dippedLiters = lastDip ? Number(lastDip.dippingLiters) : 0;
                  const capacity = Number(tank.capacity);
                  const fillPercentage = capacity > 0 ? Math.min(100, Math.round((dippedLiters / capacity) * 100)) : 0;

                  return (
                    <Card key={tank.id} className="relative overflow-hidden">
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div>
                          <CardTitle className="font-bold text-sm flex items-center gap-1.5">
                            <Flame size={16} className="text-rose-500 animate-pulse shrink-0" />
                            {tank.name}
                          </CardTitle>
                          <CardDescription>Product: <span className="font-semibold">{tank.productType}</span></CardDescription>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-muted-foreground">Capacity</span>
                          <div className="font-mono text-sm font-bold">{capacity.toLocaleString()} L</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Progress fill bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Dipped Level: {lastDip ? `${dippedLiters.toLocaleString()} L` : "No reading"}</span>
                            <span>{fillPercentage}% Full</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        </div>
                        {lastDip && (
                          <div className="text-[10px] text-muted-foreground mt-2 text-right">
                            Last dipped: {formatHumanReadableDate(lastDip.recordedAt)} ({lastDip.shift} shift)
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Pumps Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Dispensers / Pumps</h3>
              {station.pumps.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground text-sm">No dispensing pumps set up yet.</Card>
              ) : (
                station.pumps.map((pump: any) => (
                  <Card key={pump.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="font-bold text-sm flex items-center gap-1.5">
                        <Gauge size={16} className="text-muted-foreground shrink-0" />
                        {pump.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs font-mono">
                        Draws from: {pump.tank.name}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Nozzles</span>
                        <div className="flex flex-wrap gap-2">
                          {pump.nozzles.map((noz: any) => (
                            <span key={noz.id} className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                              {noz.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ---------------- DIPPING RECORDS TAB ---------------- */}
        <TabsContent value="dippings" className="mt-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Tank Dipping History</h2>
            <Button variant="default" size="sm" onClick={() => setActiveDialog("recordDipping")}>
              <ClipboardList size={16} className="mr-1" /> Record Dippings
            </Button>
          </div>

          <Card className="overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Date & Time</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Tank</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Product</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-center">Reason / Shift</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Dipped Volume</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Capacity</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allDippings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-stone-500">No dipping records found.</td>
                    </tr>
                  ) : (
                    allDippings.map((dip: any) => {
                      const capacity = Number(dip.tank.capacity);
                      const volume = Number(dip.dippingLiters);
                      const pct = capacity > 0 ? Math.min(100, Math.round((volume / capacity) * 100)) : 0;
                      return (
                        <tr key={dip.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 whitespace-nowrap">{formatHumanReadableDate(dip.recordedAt)}</td>
                          <td className="px-4 py-3 font-medium text-stone-800">{dip.tank.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-stone-600">{dip.tank.productType}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                              dip.reason === "WAYBILL_DELIVERY"
                                ? "bg-blue-100 text-blue-800"
                                : dip.reason === "PRICE_CHANGE"
                                ? "bg-purple-100 text-purple-800"
                                : dip.reason === "ROUTINE"
                                ? "bg-stone-100 text-stone-800"
                                : dip.shift === "MORNING"
                                ? "bg-amber-100 text-amber-800"
                                : dip.shift === "EVENING"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-stone-100 text-stone-800"
                            }`}>
                              {dip.reason || dip.shift || "ROUTINE"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-stone-800">{volume.toLocaleString()} L</td>
                          <td className="px-4 py-3 text-right font-mono text-stone-500">{capacity.toLocaleString()} L</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- SHIFT LOGS TAB ---------------- */}
        <TabsContent value="shifts" className="mt-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Attendant Shift Reports</h2>
            <Button variant="default" size="sm" onClick={() => setActiveDialog("startShift")}>
              <Plus size={16} className="mr-1" /> Start Shift
            </Button>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Date</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Attendant</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Nozzle / Pump</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Meters (Op / Cl)</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Liters Sold</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Declared (Cash/POS/Trans)</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-center">Status / Reconciled By</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Variance Cash</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {station.pumps.flatMap((p: any) => p.nozzles.flatMap((n: any) => n.shiftLogs)).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-stone-500">No shift logs found for this station.</td>
                    </tr>
                  ) : (
                    station.pumps
                      .flatMap((p: any) => p.nozzles.flatMap((n: any) => n.shiftLogs.map((log: any) => ({ ...log, nozzle: n, pump: p }))))
                      .sort((a: any, b: any) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime())
                      .map((log: any) => {
                        const reconciled = !!log.reconciledAt;
                        const active = log.closingMeter === null;
                        
                        return (
                           <tr key={log.id} className="hover:bg-stone-50/50">
                            <td className="px-4 py-3 whitespace-nowrap">{formatHumanReadableDate(log.shiftDate)}</td>
                            <td className="px-4 py-3 font-medium">
                              {log.attendant ? `${log.attendant.firstName ?? ""} ${log.attendant.lastName ?? ""}`.trim() : "Unknown"}
                            </td>
                            <td className="px-4 py-3">
                              {log.pump.name} - {log.nozzle.name} ({log.pump.tank.productType})
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                              {Number(log.openingMeter).toLocaleString()} / {active ? "—" : Number(log.closingMeter).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {active ? (
                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-normal">Active</span>
                              ) : (
                                `${Number(log.litersSold).toLocaleString()} L`
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                              {active ? (
                                "—"
                              ) : (
                                `${Number(log.declaredCash).toLocaleString()} / ${Number(log.declaredPos).toLocaleString()} / ${Number(log.declaredTransfer).toLocaleString()}`
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-stone-500">
                              {active ? (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">Ongoing</span>
                              ) : reconciled ? (
                                <span className="flex items-center justify-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 size={12} />
                                  {log.reconciledBy?.firstName ?? "Yes"}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-bold uppercase">Closed</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${reconciled ? (Number(log.varianceCash) < 0 ? "text-rose-600" : "text-emerald-600") : "text-stone-500"}`}>
                              {reconciled ? `${Number(log.varianceCash).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {active ? (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCloseShift(log);
                                    setActiveDialog("closeShift");
                                  }}
                                >
                                  Close Shift
                                </Button>
                              ) : !reconciled ? (
                                <Button size="xs" onClick={() => handleReconcileShift(log.id)}>
                                  Reconcile
                                </Button>
                              ) : (
                                <span className="text-xs text-stone-400">Locked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- EXPENSES TAB ---------------- */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Local petty cash expenses</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog("recordExpense")}>
              <Plus size={16} className="mr-1" /> Record Expense
            </Button>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Date</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Category</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Payment Method</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-right">Amount</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Description</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Recorded By</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase">Approved By</th>
                    <th className="px-4 py-3 font-bold text-stone-600 text-xs uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {station.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-stone-500">No local expenses recorded yet.</td>
                    </tr>
                  ) : (
                    station.expenses.map((exp: any) => {
                      const approved = !!exp.approvedById;
                      return (
                        <tr key={exp.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 whitespace-nowrap">{formatHumanReadableDate(exp.createdAt)}</td>
                          <td className="px-4 py-3 font-medium text-xs font-mono">{exp.category}</td>
                          <td className="px-4 py-3 text-xs">{exp.paymentMethod}</td>
                          <td className="px-4 py-3 text-right font-bold text-stone-800">{Number(exp.amount).toLocaleString()}</td>
                          <td className="px-4 py-3 max-w-xs truncate" title={exp.description}>{exp.description}</td>
                          <td className="px-4 py-3 text-xs">{exp.recordedBy ? `${exp.recordedBy.firstName ?? ""} ${exp.recordedBy.lastName ?? ""}`.trim() : "—"}</td>
                          <td className="px-4 py-3 text-xs">
                            {approved ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 size={12} />
                                {exp.approvedBy ? `${exp.approvedBy.firstName ?? ""} ${exp.approvedBy.lastName ?? ""}`.trim() : "Yes"}
                              </span>
                            ) : (
                              <span className="text-stone-400">Pending Approval</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!approved && (
                              <Button size="xs" onClick={() => handleApproveExpense(exp.id, true)}>
                                Approve
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- TICKETS TAB ---------------- */}
        <TabsContent value="tickets" className="mt-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Issues & Adjustment Tickets</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog("raiseTicket")}>
              <Plus size={16} className="mr-1" /> Raise Ticket
            </Button>
          </div>

          <div className="space-y-3">
            {station.tickets.length === 0 ? (
              <Card className="p-6 text-center text-stone-500 text-sm">No tickets raised for this station.</Card>
            ) : (
              station.tickets.map((t: any) => {
                const open = t.status === "OPEN";
                return (
                  <Card key={t.id} className="shadow-sm">
                    <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-800">{t.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${open ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">Category: <span className="font-mono">{t.category}</span></p>
                        <p className="text-sm text-stone-600 mt-1">{t.description}</p>
                        <div className="text-[10px] text-stone-400 pt-1">
                          Raised by: {t.raisedBy ? `${t.raisedBy.firstName ?? ""} ${t.raisedBy.lastName ?? ""}`.trim() : "Unknown"} on {formatHumanReadableDate(t.createdAt)}
                        </div>
                        {t.remark && (
                          <div className="text-xs bg-stone-50 border p-2 rounded text-stone-600 mt-2">
                            <strong>Remark:</strong> {t.remark}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {open && (
                          <Button size="xs" variant="outline" onClick={() => handleApproveTicket(t.id, true)}>
                            Approve/Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* 1. Add Tank Modal */}
      {activeDialog === "addTank" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Tank</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTank} className="space-y-4">
              <FormField label="Tank Name" htmlFor="t_name" error={tankForm.formState.errors.name?.message}>
                <TextInput id="t_name" placeholder="e.g. PMS Tank 1" {...tankForm.register("name")} />
              </FormField>
              
              <FormField label="Product Type" htmlFor="t_prod" error={tankForm.formState.errors.productType?.message}>
                <select id="t_prod" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...tankForm.register("productType")}>
                  <option value="">Select product...</option>
                  <option value="PMS">PMS (Petrol)</option>
                  <option value="AGO">AGO (Diesel)</option>
                  <option value="DPK">DPK (Kerosene)</option>
                  <option value="LPG">LPG (Gas)</option>
                </select>
              </FormField>

              <FormField label="Liters Capacity" htmlFor="t_cap" error={tankForm.formState.errors.capacity?.message}>
                <TextInput id="t_cap" type="number" placeholder="e.g. 45000" {...tankForm.register("capacity")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Create Tank</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Add Pump Modal */}
      {activeDialog === "addPump" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Pump / Dispenser</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPump} className="space-y-4">
              <FormField label="Pump Name" htmlFor="p_name" error={pumpForm.formState.errors.name?.message}>
                <TextInput id="p_name" placeholder="e.g. Pump 1" {...pumpForm.register("name")} />
              </FormField>

              <FormField label="Draws From Tank" htmlFor="p_tank" error={pumpForm.formState.errors.tankId?.message}>
                <select id="p_tank" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...pumpForm.register("tankId")}>
                  <option value="">Select tank...</option>
                  {station.tanks.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>
                  ))}
                </select>
              </FormField>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-stone-500 font-semibold block">Pump Nozzles</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => appendNozzle({ name: `Nozzle ${String.fromCharCode(65 + nozzleFields.length)}` })}
                    className="h-7 px-2 text-[10px]"
                  >
                    + Add Nozzle
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {nozzleFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <TextInput
                        placeholder="e.g. Nozzle A"
                        {...pumpForm.register(`nozzles.${index}.name` as const)}
                        className="text-xs py-1 h-8 flex-1"
                      />
                      {nozzleFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeNozzle(index)}
                          className="text-stone-400 hover:text-stone-600 h-8 w-8"
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Create Pump</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Start Shift Modal */}
      {activeDialog === "startShift" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start Attendant Shift</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleStartShift} className="space-y-4">
              <FormField label="Current Date & Time" htmlFor="s_datetime">
                <TextInput id="s_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Shift Date" htmlFor="s_date" error={startShiftForm.formState.errors.shiftDate?.message}>
                  <TextInput id="s_date" type="date" {...startShiftForm.register("shiftDate")} />
                </FormField>

                <FormField label="Attendant" htmlFor="s_att" error={startShiftForm.formState.errors.attendantId?.message}>
                  <select id="s_att" className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...startShiftForm.register("attendantId")}>
                    <option value="">Select...</option>
                    {tenantUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <FormField label="Dispensing Pump" htmlFor="s_pump">
                  <select
                    id="s_pump"
                    className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                    value={selectedStartPumpId}
                    onChange={(e) => {
                      setSelectedStartPumpId(e.target.value);
                      startShiftForm.setValue("nozzleId", "");
                    }}
                  >
                    <option value="">Select pump...</option>
                    {station.pumps.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.tank.productType})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Dispensing Nozzle" htmlFor="s_noz" error={startShiftForm.formState.errors.nozzleId?.message}>
                  <select
                    id="s_noz"
                    className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                    {...startShiftForm.register("nozzleId")}
                    disabled={!selectedStartPumpId}
                  >
                    <option value="">Select nozzle...</option>
                    {(selectedStartPumpId
                      ? station.pumps.find((p: any) => p.id === selectedStartPumpId)?.nozzles || []
                      : []
                    ).map((n: any) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Opening Meter Reading (L)" htmlFor="s_op" error={startShiftForm.formState.errors.openingMeter?.message}>
                <TextInput id="s_op" type="number" {...startShiftForm.register("openingMeter")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Open Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 3.1 Close Shift Modal */}
      {activeDialog === "closeShift" && selectedCloseShift && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Close Attendant Shift</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-stone-50 border p-3 rounded-lg text-xs space-y-1">
                <div><strong>Attendant:</strong> {selectedCloseShift.attendant ? `${selectedCloseShift.attendant.firstName ?? ""} ${selectedCloseShift.attendant.lastName ?? ""}`.trim() : "Unknown"}</div>
                <div><strong>Nozzle:</strong> {selectedCloseShift.pump.name} - {selectedCloseShift.nozzle.name} ({selectedCloseShift.pump.tank.productType})</div>
                <div><strong>Opening Meter:</strong> {Number(selectedCloseShift.openingMeter).toLocaleString()} L</div>
              </div>

              <FormField label="Current Date & Time" htmlFor="c_datetime">
                <TextInput id="c_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <FormField label="Closing Meter Reading (L)" htmlFor="c_cl" error={closeShiftForm.formState.errors.closingMeter?.message}>
                <TextInput id="c_cl" type="number" {...closeShiftForm.register("closingMeter")} />
              </FormField>

              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                <FormField label="Cash (₦)" htmlFor="c_cash" error={closeShiftForm.formState.errors.declaredCash?.message}>
                  <TextInput id="c_cash" type="number" {...closeShiftForm.register("declaredCash")} />
                </FormField>
                <FormField label="POS (₦)" htmlFor="c_pos" error={closeShiftForm.formState.errors.declaredPos?.message}>
                  <TextInput id="c_pos" type="number" {...closeShiftForm.register("declaredPos")} />
                </FormField>
                <FormField label="Bank Trans. (₦)" htmlFor="c_trans" error={closeShiftForm.formState.errors.declaredTransfer?.message}>
                  <TextInput id="c_trans" type="number" {...closeShiftForm.register("declaredTransfer")} />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Submit Close & Declarations</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. Record Expense Modal */}
      {activeDialog === "recordExpense" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Petty Cash Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Expense Category" htmlFor="e_cat" error={expenseForm.formState.errors.category?.message}>
                  <select id="e_cat" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...expenseForm.register("category")}>
                    <option value="">Select...</option>
                    <option value="FUEL_FOR_GEN">Generator Fuel</option>
                    <option value="MAINTENANCE">Equipment Maintenance</option>
                    <option value="UTILITIES">Utilities (Water, Power)</option>
                    <option value="STATIONERY">Stationery</option>
                    <option value="OTHER">Other Expenses</option>
                  </select>
                </FormField>

                <FormField label="Payment Method" htmlFor="e_pay" error={expenseForm.formState.errors.paymentMethod?.message}>
                  <select id="e_pay" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...expenseForm.register("paymentMethod")}>
                    <option value="CASH">Cash</option>
                    <option value="POS">POS Machine</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Amount" htmlFor="e_amt" error={expenseForm.formState.errors.amount?.message}>
                <TextInput id="e_amt" type="number" {...expenseForm.register("amount")} />
              </FormField>

              <FormField label="Description" htmlFor="e_desc" error={expenseForm.formState.errors.description?.message}>
                <TextInput id="e_desc" placeholder="e.g. Purchased 20L diesel for generator" {...expenseForm.register("description")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Record Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. Raise Ticket Modal */}
      {activeDialog === "raiseTicket" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise Issue / Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRaiseTicket} className="space-y-4">
              <FormField label="Category" htmlFor="t_cat" error={ticketForm.formState.errors.category?.message}>
                <select id="t_cat" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...ticketForm.register("category")}>
                  <option value="">Select...</option>
                  <option value="INVENTORY_VARIANCE">Inventory Variance</option>
                  <option value="EQUIPMENT_FAULT">Equipment Fault</option>
                  <option value="CASH_DISCREPANCY">Cash Discrepancy</option>
                  <option value="OTHER">Other Fault</option>
                </select>
              </FormField>

              <FormField label="Title" htmlFor="t_title" error={ticketForm.formState.errors.title?.message}>
                <TextInput id="t_title" placeholder="e.g. Pump 2 screen faulty" {...ticketForm.register("title")} />
              </FormField>

              <FormField label="Description Details" htmlFor="t_desc" error={ticketForm.formState.errors.description?.message}>
                <textarea
                  id="t_desc"
                  rows={3}
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-stone-500"
                  placeholder="Describe the issue in detail..."
                  {...ticketForm.register("description")}
                />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Raise Ticket</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. Deliver Waybill Modal */}
      {activeDialog === "deliverWaybill" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Waybill Delivery</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDeliverWaybill} className="space-y-4">
              <div className="bg-stone-50 border p-3 rounded-lg mb-2 text-xs">
                <strong>Waybill:</strong> {selectedWaybill?.number} <br />
                <strong>Dispatched Vol:</strong> {selectedWaybill ? Number(selectedWaybill.litersLoaded).toLocaleString() : 0} L
              </div>

              <FormField label="Actual Liters Received" htmlFor="w_rec" error={waybillForm.formState.errors.litersReceived?.message}>
                <TextInput id="w_rec" type="number" placeholder="e.g. 32950" {...waybillForm.register("litersReceived")} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Delivery GPS Latitude (Optional)" htmlFor="w_lat" error={waybillForm.formState.errors.gpsLatitude?.message}>
                  <TextInput id="w_lat" type="number" step="any" placeholder="e.g. 6.5244" {...waybillForm.register("gpsLatitude")} />
                </FormField>
                <FormField label="Delivery GPS Longitude (Optional)" htmlFor="w_lng" error={waybillForm.formState.errors.gpsLongitude?.message}>
                  <TextInput id="w_lng" type="number" step="any" placeholder="e.g. 3.3792" {...waybillForm.register("gpsLongitude")} />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Confirm Delivery</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. Set Pricing Modal */}
      {activeDialog === "setPrice" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Fuel Price Setup</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetPrice} className="space-y-4">
              <FormField label="Product Type" htmlFor="pr_prod" error={priceForm.formState.errors.productType?.message}>
                <select id="pr_prod" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm" {...priceForm.register("productType")}>
                  <option value="">Select product...</option>
                  <option value="PMS">PMS (Petrol)</option>
                  <option value="AGO">AGO (Diesel)</option>
                  <option value="DPK">DPK (Kerosene)</option>
                  <option value="LPG">LPG (Gas)</option>
                </select>
              </FormField>

              <FormField label="Price Per Liter" htmlFor="pr_val" error={priceForm.formState.errors.pricePerLiter?.message}>
                <TextInput id="pr_val" type="number" step="0.01" placeholder="e.g. 650.00" {...priceForm.register("pricePerLiter")} />
              </FormField>

              <FormField label="Effective From (Optional)" htmlFor="pr_eff" error={priceForm.formState.errors.effectiveFrom?.message}>
                <TextInput id="pr_eff" type="datetime-local" {...priceForm.register("effectiveFrom")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Apply Pricing</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 8. Record Dipping Modal */}
      {activeDialog === "recordDipping" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Tank Dipping</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordDipping} className="space-y-4">
              <FormField label="Current Date & Time" htmlFor="d_datetime">
                <TextInput id="d_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <FormField label="Tank to Dip" htmlFor="d_tank" error={dippingForm.formState.errors.tankId?.message}>
                <select
                  id="d_tank"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...dippingForm.register("tankId")}
                >
                  <option value="">Select tank...</option>
                  {station.tanks.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.productType} (Capacity: {Number(t.capacity).toLocaleString()} L)
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Dipped Liters Volume" htmlFor="d_vol" error={dippingForm.formState.errors.dippingLiters?.message}>
                <TextInput id="d_vol" type="number" step="any" placeholder="e.g. 15420.50" {...dippingForm.register("dippingLiters")} />
              </FormField>

              <FormField label="Dipping Reason / Cause" htmlFor="d_reason" error={dippingForm.formState.errors.reason?.message}>
                <select
                  id="d_reason"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...dippingForm.register("reason")}
                >
                  <option value="ROUTINE">Routine Operational Check</option>
                  <option value="WAYBILL_DELIVERY">Waybill / Fuel Delivery Arrival</option>
                  <option value="PRICE_CHANGE">Price Change Adjustment</option>
                </select>
              </FormField>

              {/* Show new price input if reason is WAYBILL_DELIVERY or PRICE_CHANGE */}
              {(dippingForm.watch("reason") === "WAYBILL_DELIVERY" || dippingForm.watch("reason") === "PRICE_CHANGE") && (
                <FormField
                  label="New Fuel Price Per Liter (Optional, ₦)"
                  htmlFor="d_price"
                  error={dippingForm.formState.errors.pricePerLiter?.message}
                >
                  <TextInput id="d_price" type="number" step="0.01" placeholder="e.g. 680.00" {...dippingForm.register("pricePerLiter")} />
                </FormField>
              )}

              {/* Active shift validation warning */}
              {(() => {
                const watchedTankId = dippingForm.watch("tankId");
                if (!watchedTankId) return null;
                const activeShifts = station.pumps.flatMap((p: any) =>
                  p.nozzles.flatMap((n: any) =>
                    n.shiftLogs
                      .filter((log: any) => log.closingMeter === null)
                      .map((log: any) => ({ ...log, nozzle: n, pump: p }))
                  )
                );
                const connectedNozzles = station.pumps
                  .filter((p: any) => p.tankId === watchedTankId)
                  .flatMap((p: any) => p.nozzles);
                const connectedActiveShifts = activeShifts.filter((s: any) =>
                  connectedNozzles.some((n: any) => n.id === s.nozzleId)
                );
                const hasOngoingShifts = connectedActiveShifts.length > 0;

                if (!hasOngoingShifts) return null;

                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex gap-2 items-start">
                    <div className="size-4 shrink-0 mt-0.5">⚠️</div>
                    <div>
                      <span className="font-bold">Ongoing shifts active on this tank:</span>
                      <ul className="list-disc list-inside mt-1 font-mono">
                        {connectedActiveShifts.map((s: any) => (
                          <li key={s.id}>
                            {s.pump.name} - {s.nozzle.name} ({s.attendant.firstName ?? ""} {s.attendant.lastName ?? ""})
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-[11px] font-sans">
                        All active shifts must be closed before recording dipping for this tank.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <input type="hidden" value={new Date().toISOString()} {...dippingForm.register("recordedAt")} />

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button
                  type="submit"
                  disabled={(() => {
                    const watchedTankId = dippingForm.watch("tankId");
                    if (!watchedTankId) return false;
                    const activeShifts = station.pumps.flatMap((p: any) =>
                      p.nozzles.flatMap((n: any) =>
                        n.shiftLogs.filter((log: any) => log.closingMeter === null)
                      )
                    );
                    const connectedNozzles = station.pumps
                      .filter((p: any) => p.tankId === watchedTankId)
                      .flatMap((p: any) => p.nozzles);
                    return activeShifts.some((s: any) =>
                      connectedNozzles.some((n: any) => n.id === s.nozzleId)
                    );
                  })()}
                >
                  Record Dipping
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

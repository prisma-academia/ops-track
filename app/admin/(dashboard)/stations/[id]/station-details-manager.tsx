"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin,
  Store,
  User,
  CheckCircle2,
  AlertCircle,
  Truck,
  Flame,
  Gauge,
  Wallet,
  Clock,
  Settings,
  Plus,
  Droplet,
  Cloud
} from "lucide-react";
import { AssetTank } from "@/app/admin/(dashboard)/dashboard/Tank";

const AddTankSchema = z.object({
  name: z.string().min(1, "Please enter a tank name").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive("Capacity must be positive"),
});

const AddPumpSchema = z.object({
  name: z.string().min(1, "Please enter a pump name").max(50),
  tankId: z.string().min(1, "Please select a tank"),
  nozzles: z.array(z.object({ name: z.string().min(1) })).min(1),
});

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

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  PMS: <Flame size={14} className="text-rose-500" />,
  AGO: <Droplet size={14} className="text-amber-500" />,
  DPK: <Droplet size={14} className="text-blue-500" />,
  LPG: <Cloud size={14} className="text-slate-500" />,
};

const PRODUCT_NAMES: Record<string, string> = {
  PMS: "PMS (Petrol)",
  AGO: "AGO (Diesel)",
  DPK: "DPK (Kerosene)",
  LPG: "LPG (Gas)",
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] ml-2">Active</Badge>;
    case "MAINTENANCE":
      return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-[10px] ml-2">Maintenance</Badge>;
    case "OFFLINE":
      return <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50 dark:bg-stone-900/30 text-[10px] ml-2">Offline</Badge>;
    case "ISSUE":
      return <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30 text-[10px] ml-2">Issue</Badge>;
    default:
      return null;
  }
};

export function StationDetailsManager({
  station,
}: {
  station: any;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [nozzleCount, setNozzleCount] = useState<number>(1);

  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
    defaultValues: { name: "", productType: "PMS" as any, capacity: 0 },
  });

  const pumpForm = useForm({
    resolver: zodResolver(AddPumpSchema),
    defaultValues: { name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] },
  });

  const handleNozzleCountChange = (count: number) => {
    setNozzleCount(count);
    const newNozzles = Array.from({ length: count }, (_, i) => ({
      name: `Nozzle ${String.fromCharCode(65 + i)}`,
    }));
    pumpForm.setValue("nozzles", newNozzles, { shouldValidate: true });
  };

  const handleAddTank = tankForm.handleSubmit(async (values) => {
    setApiError(null);
    const payload = { ...values, stationId: station.id };
    const res = await apiPost(`/api/tenant/stations/${station.id}/tanks`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleAddPump = pumpForm.handleSubmit(async (values) => {
    setApiError(null);
    const payload = { ...values, stationId: station.id };
    const res = await apiPost(`/api/tenant/stations/${station.id}/pumps`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    setNozzleCount(1);
    tankForm.reset({ name: "", productType: "PMS" as any, capacity: 0 });
    pumpForm.reset({ name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] });
    router.refresh();
  };

  // Flatten and sort data
  const allDippings = station.tanks
    .flatMap((t: any) => t.dippings.map((d: any) => ({ ...d, tank: t })))
    .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const allShiftLogs = station.pumps
    .flatMap((p: any) => p.nozzles.flatMap((n: any) => n.shiftLogs.map((log: any) => ({ ...log, nozzle: n, pump: p }))))
    .sort((a: any, b: any) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime());

  // Derive manager from staff (take first or show none)
  const manager = station.staff && station.staff.length > 0 ? station.staff[0] : null;
  const managerName = manager ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() : "Unassigned";

  // Derive latest prices per product type from priceControls
  const latestPrices: Record<string, number> = {};
  if (station.priceControls) {
    // Sort descending by effectiveFrom so newest is first
    const sortedPrices = [...station.priceControls].sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    sortedPrices.forEach(pc => {
      if (!latestPrices[pc.productType]) {
        latestPrices[pc.productType] = pc.pricePerLiter;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card className="border-border/50 shadow-sm bg-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
          <div className="flex items-center gap-5 flex-1">
            <div className="size-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
              <Store size={26} strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{station.name}</h1>
                  <Badge variant="outline" className="font-mono text-xs bg-muted/50 text-muted-foreground border-border/50">{station.code}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={2} />
                  <span>{station.location ? `${station.location}, ` : ""}{station.region} Region</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={14} strokeWidth={2} />
                  <span>Manager: <span className="font-medium text-foreground">{managerName}</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            {/* Prices Grid */}
            {Object.keys(latestPrices).length === 0 ? (
              <div className="text-sm text-muted-foreground italic px-4 py-2 border border-dashed rounded-xl flex items-center justify-center min-h-[60px]">
                No prices configured
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 w-full md:w-auto">
                {Object.entries(latestPrices).map(([product, price]) => (
                  <div key={product} className="flex items-center gap-3 px-3 py-2 bg-muted/20 border border-border/50 rounded-xl min-w-[140px]">
                    <div className="p-1.5 bg-background border border-border/50 rounded-md">
                      {PRODUCT_ICONS[product] || <Flame size={14} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground">{PRODUCT_NAMES[product] || product}</span>
                      <span className="text-sm font-bold text-foreground leading-tight">₦{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dippings">Dippings</TabsTrigger>
            <TabsTrigger value="shifts">Shift Logs</TabsTrigger>
            <TabsTrigger value="waybills">Waybills</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => setActiveDialog("config")} className="h-9 shrink-0 gap-2">
            <Settings size={14} />
            <span>Config</span>
          </Button>
        </div>

        {/* ---------------- OVERVIEW TAB ---------------- */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Storage Tanks</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {station.tanks.length === 0 ? (
              <div className="col-span-full py-8 text-center border rounded-xl border-dashed">
                <p className="text-muted-foreground text-sm">No storage tanks configured.</p>
              </div>
            ) : (
              station.tanks.map((tank: any) => {
                const lastDip = tank.dippings?.[0];
                const currentLitres = lastDip ? Number(lastDip.dippingLiters) : 0;
                const capacity = Number(tank.capacity);

                return (
                  <div key={tank.id}>
                    <div className="mb-2 flex items-center justify-between">
                       <div className="flex items-center">
                         <span className="text-sm font-medium">{tank.name}</span>
                         <StatusBadge status={tank.status || "ACTIVE"} />
                       </div>
                    </div>
                    <AssetTank 
                      currentLitres={currentLitres} 
                      maxCapacity={capacity} 
                      label={tank.name} 
                      type={tank.productType === "LPG" ? "gas" : "fuel"} 
                    />
                  </div>
                )
              })
            )}
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-foreground pt-4 border-t">Dispensers / Pumps</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {station.pumps.length === 0 ? (
              <div className="col-span-full py-8 text-center border rounded-xl border-dashed">
                <p className="text-muted-foreground text-sm">No dispensers configured.</p>
              </div>
            ) : (
              station.pumps.map((pump: any) => (
                <Card key={pump.id} className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Gauge size={16} className="text-muted-foreground" />
                        {pump.name}
                        <StatusBadge status={pump.status || "ACTIVE"} />
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono">Tank: {pump.tank.name}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Nozzles ({pump.nozzles.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {pump.nozzles.map((noz: any) => (
                          <span key={noz.id} className="flex items-center text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium border border-border/50">
                            {noz.name}
                            <span className={`ml-1.5 size-1.5 rounded-full ${
                              noz.status === 'ACTIVE' || !noz.status ? 'bg-emerald-500' :
                              noz.status === 'ISSUE' ? 'bg-rose-500' :
                              noz.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-stone-500'
                            }`} title={noz.status || 'ACTIVE'} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

        </TabsContent>

        {/* ---------------- DIPPINGS TAB ---------------- */}
        <TabsContent value="dippings" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tank</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Reason</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {allDippings.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No dipping records found.</td></tr>
                  ) : (
                    allDippings.map((dip: any) => (
                      <tr key={dip.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(dip.recordedAt)}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{dip.tank.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{dip.tank.productType}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="text-[10px] font-semibold">{dip.reason || "ROUTINE"}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-foreground">{Number(dip.dippingLiters).toLocaleString()} {dip.tank.productType === "LPG" ? "KG" : "L"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- SHIFTS TAB ---------------- */}
        <TabsContent value="shifts" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Attendant</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Dispenser</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Meters (Op / Cl)</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Sold</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {allShiftLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No shift logs found.</td></tr>
                  ) : (
                    allShiftLogs.map((log: any) => {
                      const reconciled = !!log.reconciledAt;
                      const active = log.closingMeter === null;
                      
                      return (
                         <tr key={log.id} className="hover:bg-muted/10">
                          <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(log.shiftDate)}</td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            {log.attendant ? `${log.attendant.firstName ?? ""} ${log.attendant.lastName ?? ""}`.trim() : "Unknown"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {log.pump.name} - {log.nozzle.name}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                            {Number(log.openingMeter).toLocaleString()} / {active ? "—" : Number(log.closingMeter).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-foreground">
                            {active ? "—" : `${Number(log.litersSold).toLocaleString()} L`}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {active ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">Active</Badge>
                            ) : reconciled ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">Reconciled</Badge>
                            ) : (
                              <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50 dark:bg-stone-900/30 dark:border-stone-800">Closed</Badge>
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

        {/* ---------------- WAYBILLS TAB ---------------- */}
        <TabsContent value="waybills" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Waybill No.</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Driver / Truck</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Dispatched</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Variance</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.waybills || station.waybills.length === 0) ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No waybill records found.</td></tr>
                  ) : (
                    station.waybills.map((w: any) => {
                      const dispatched = Number(w.litersLoaded) || 0;
                      const received = w.litersReceived ? Number(w.litersReceived) : null;
                      const variance = received !== null ? received - dispatched : null;
                      
                      return (
                        <tr key={w.id} className="hover:bg-muted/10">
                          <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(w.dispatchedAt)}</td>
                          <td className="px-6 py-4 font-mono text-xs font-semibold">{w.number}</td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">{w.driverName} • {w.truckPlate}</td>
                          <td className="px-6 py-4 text-right font-mono font-medium">{dispatched.toLocaleString()} L</td>
                          <td className="px-6 py-4 text-right font-mono font-medium">
                            {variance === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={variance < 0 ? "text-rose-600" : "text-emerald-600"}>
                                {variance > 0 ? "+" : ""}{variance.toLocaleString()} L
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="outline" className={
                              w.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : 
                              w.status === "IN_TRANSIT" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30" : ""
                            }>
                              {w.status}
                            </Badge>
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
        <TabsContent value="expenses" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.expenses || station.expenses.length === 0) ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No expense records found.</td></tr>
                  ) : (
                    station.expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(e.createdAt)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="text-[10px] font-medium">{e.category}</Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">{e.description}</td>
                        <td className="px-6 py-4 text-right font-medium">₦{Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            e.status === "APPROVED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : 
                            e.status === "REJECTED" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30" : 
                            "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                          }>
                            {e.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- SALES TAB ---------------- */}
        <TabsContent value="sales" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Sold</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Cash</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">POS / Transfer</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Total Revenue</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.dailySalesLogs || station.dailySalesLogs.length === 0) ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No sales records found.</td></tr>
                  ) : (
                    station.dailySalesLogs.map((log: any) => {
                      const totalRevenue = Number(log.amountCash) + Number(log.amountPos) + Number(log.amountTransfer);
                      const digitalRevenue = Number(log.amountPos) + Number(log.amountTransfer);
                      const recorder = log.recordedBy ? `${log.recordedBy.firstName ?? ""} ${log.recordedBy.lastName ?? ""}`.trim() : "Unknown";

                      return (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(log.logDate).split(" ")[0] + " " + formatHumanReadableDate(log.logDate).split(" ")[1] + " " + formatHumanReadableDate(log.logDate).split(" ")[2]}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="text-[10px] font-medium font-mono">{log.productType}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right font-medium">{Number(log.litersSold).toLocaleString()} L</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">₦{Number(log.amountCash).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">₦{digitalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right font-bold text-foreground">₦{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-center text-muted-foreground">{recorder}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Config Dialog */}
      {activeDialog === "config" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Station Configuration & Assets</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="addTank" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="addTank">Add Storage Tank</TabsTrigger>
                <TabsTrigger value="addPump">Add Dispenser / Pump</TabsTrigger>
              </TabsList>
              
              <TabsContent value="addTank" className="pt-4">
                <form onSubmit={handleAddTank} className="space-y-4">
                  <FormField label="Tank Name" htmlFor="t_name" error={tankForm.formState.errors.name?.message}>
                    <TextInput id="t_name" placeholder="e.g. PMS Tank 1" {...tankForm.register("name")} />
                  </FormField>
                  
                  <FormField label="Product Type" htmlFor="t_prod" error={tankForm.formState.errors.productType?.message}>
                    <select id="t_prod" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...tankForm.register("productType")}>
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

                  <div className="flex justify-end pt-4 border-t mt-4">
                    <Button type="button" variant="outline" className="mr-2" onClick={closeDialog}>Cancel</Button>
                    <Button type="submit">Create Tank</Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="addPump" className="pt-4">
                <form onSubmit={handleAddPump} className="space-y-4">
                  <FormField label="Pump Name" htmlFor="p_name" error={pumpForm.formState.errors.name?.message}>
                    <TextInput id="p_name" placeholder="e.g. Pump 1" {...pumpForm.register("name")} />
                  </FormField>

                  <FormField label="Draws From Tank" htmlFor="p_tank" error={pumpForm.formState.errors.tankId?.message}>
                    <select id="p_tank" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...pumpForm.register("tankId")}>
                      <option value="">Select tank...</option>
                      {station.tanks.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Number of Nozzles" htmlFor="p_nozzle_count" error={pumpForm.formState.errors.nozzles?.message}>
                    <select
                      id="p_nozzle_count"
                      className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full font-medium"
                      value={nozzleCount}
                      onChange={(e) => handleNozzleCountChange(Number(e.target.value))}
                    >
                      <option value={1}>1 Nozzle</option>
                      <option value={2}>2 Nozzles</option>
                      <option value={3}>3 Nozzles</option>
                      <option value={4}>4 Nozzles</option>
                    </select>
                  </FormField>

                  {apiError && <p className="text-xs text-red-600">{apiError}</p>}

                  <div className="flex justify-end pt-4 border-t mt-4">
                    <Button type="button" variant="outline" className="mr-2" onClick={closeDialog}>Cancel</Button>
                    <Button type="submit">Create Pump</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

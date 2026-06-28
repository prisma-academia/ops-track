"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  Fuel,
  Wallet,
  Clock,
  Settings,
  Plus,
  Droplet,
  Cloud,
  Pencil,
  ChevronsUpDown,
  Check,
  ArrowLeft
} from "lucide-react";
import { AssetTank } from "@/app/admin/(dashboard)/dashboard/Tank";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

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

const EditStationSchema = z.object({
  name: z.string().min(2, "Station name must be at least 2 characters"),
  code: z.string().min(2, "Station code must be at least 2 characters"),
  region: z.string().optional(),
  location: z.string().optional().nullable(),
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
  users,
}: {
  station: any;
  users: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [nozzleCount, setNozzleCount] = useState<number>(1);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [openManagerSelect, setOpenManagerSelect] = useState(false);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
    defaultValues: { name: "", productType: "PMS" as any, capacity: 0 },
  });

  const pumpForm = useForm({
    resolver: zodResolver(AddPumpSchema),
    defaultValues: { name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] },
  });

  const editStationForm = useForm({
    resolver: zodResolver(EditStationSchema),
    defaultValues: {
      name: station.name || "",
      code: station.code || "",
      region: station.region || "",
      location: station.location || "",
    }
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
    setIsAssigningManager(false);
    tankForm.reset({ name: "", productType: "PMS" as any, capacity: 0 });
    pumpForm.reset({ name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] });
    router.refresh();
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsAssigningManager(true);
    const res = await apiPatch(`/api/tenant/stations/${station.id}`, {
      staffUserIds: selectedManagerId ? [selectedManagerId] : [],
    });
    setIsAssigningManager(false);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  };

  const handleEditStation = editStationForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPatch(`/api/tenant/stations/${station.id}`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  // Flatten and sort data
  const regularDippings = station.tanks
    .flatMap((t: any) => t.dippings.map((d: any) => ({ ...d, tank: t, reason: d.reason || "ROUTINE" })));

  const waybillDips = station.tanks
    .flatMap((t: any) => (t.waybillDippings || []).map((d: any) => ({
      ...d,
      tank: t,
      recordedAt: d.createdAt,
      dippingLiters: d.afterLiters !== null ? d.afterLiters : d.beforeLiters,
      reason: "WAYBILL DISCHARGE"
    })));

  const allDippings = [...regularDippings, ...waybillDips]
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
      <Card className="border-border/50 bg-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
          <div className="flex items-center gap-5 flex-1">
            <Button variant="outline" size="icon" asChild className="shrink-0 h-10 w-10 border-border/50">
              <Link href="/admin/stations">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="size-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
              <Store size={26} strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{station.name}</h1>
                  <Badge variant="outline" className="font-mono text-xs bg-muted/50 text-muted-foreground border-border/50">{station.code}</Badge>
                  <button onClick={() => setActiveDialog("edit-station")} className="inline-flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-1.5 transition-colors ml-2" title="Edit Station Info">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} strokeWidth={2} />
                  <span>{station.location ? `${station.location}, ` : ""}{station.region} Region</span>
                </div>
                <div 
                  className="flex items-center gap-1.5 group cursor-pointer hover:bg-muted/50 p-1 -ml-1 rounded-md transition-colors" 
                  onClick={() => { setSelectedManagerId(station.staff && station.staff.length > 0 ? station.staff[0].id : ""); setActiveDialog("manager"); }}
                >
                  <User size={14} strokeWidth={2} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    Manager: <span className="font-medium text-foreground">{managerName}</span>
                  </span>
                  <div className="opacity-50 group-hover:opacity-100 transition-opacity ml-1 bg-primary/10 text-primary p-1 rounded-full">
                    <Pencil size={12} />
                  </div>
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
        <div className="flex items-center justify-between mb-3">
          <TabsList className="h-12 px-1 py-1">
            <TabsTrigger value="overview" className="px-5 py-3 text-sm">Overview</TabsTrigger>
            <TabsTrigger value="dippings" className="px-5 py-3 text-sm">Dippings</TabsTrigger>
            <TabsTrigger value="shifts" className="px-5 py-3 text-sm">Shift Logs</TabsTrigger>
            <TabsTrigger value="waybills" className="px-5 py-3 text-sm">Waybills</TabsTrigger>
            <TabsTrigger value="expenses" className="px-5 py-3 text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="sales" className="px-5 py-3 text-sm">Sales</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => setActiveDialog("config")} className="h-9 shrink-0 gap-2">
            <Settings size={14} />
            <span>Config</span>
          </Button>
        </div>

        {/* ---------------- OVERVIEW TAB ---------------- */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Infrastructure Overview</h2>
          </div>
          
          <div className="flex flex-col gap-12 lg:gap-16">
            {station.tanks.length === 0 ? (
              <div className="w-full py-8 text-center border rounded-xl border-dashed">
                <p className="text-muted-foreground text-sm">No infrastructure configured.</p>
              </div>
            ) : (
              station.tanks.map((tank: any) => {
                const lastDip = tank.dippings?.[0];
                const lastWaybillDip = tank.waybillDippings?.[0];
                
                let currentLitres = 0;
                let latestDate = 0;

                if (lastDip) {
                  currentLitres = Number(lastDip.dippingLiters);
                  latestDate = new Date(lastDip.recordedAt).getTime();
                }

                if (lastWaybillDip) {
                  const waybillDate = new Date(lastWaybillDip.createdAt).getTime();
                  if (waybillDate > latestDate) {
                    currentLitres = lastWaybillDip.afterLiters !== null ? Number(lastWaybillDip.afterLiters) : Number(lastWaybillDip.beforeLiters);
                    latestDate = waybillDate;
                  }
                }

                const capacity = Number(tank.capacity);
                const tankPumps = station.pumps.filter((p: any) => p.tankId === tank.id);

                return (
                  <div key={tank.id} className="flex flex-col lg:flex-row items-center lg:items-stretch w-full relative">
                    
                    {/* TANK CONTAINER */}
                    <div className="w-full lg:w-[320px] xl:w-[380px] shrink-0 relative flex flex-col justify-center">
                       <div className="mb-3 flex items-center justify-between px-1">
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-foreground">{tank.name}</span>
                           <StatusBadge status={tank.status || "ACTIVE"} />
                         </div>
                         <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{tank.productType}</Badge>
                       </div>
                       
                       <div className="relative z-10 w-full">
                         <AssetTank 
                           currentLitres={currentLitres} 
                           maxCapacity={capacity} 
                           label={tank.name} 
                           type={tank.productType === "LPG" ? "gas" : "fuel"} 
                         />
                       </div>

                       {/* Tank horizontal connector (Desktop) */}
                       {tankPumps.length > 0 && (
                         <div className="hidden lg:block absolute top-1/2 -right-8 w-8 border-t-2 border-dashed border-border/60 -translate-y-[1px]" />
                       )}
                    </div>

                    {/* PUMPS CONTAINER */}
                    <div className="flex-1 w-full relative ml-4 lg:ml-8 pt-6 lg:pt-0 flex flex-col justify-center">
                      {tankPumps.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic bg-muted/30 px-4 py-3 rounded-xl border border-dashed border-border/50 lg:ml-8 text-center lg:text-left">
                          No dispensers connected to this tank
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {tankPumps.map((pump: any, index: number) => {
                            const isFirst = index === 0;
                            const isLast = index === tankPumps.length - 1;
                            return (
                              <div key={pump.id} className="relative pl-8 lg:pl-10">
                                {/* Vertical tree line */}
                                <div 
                                  className={`absolute left-0 border-l-2 border-dashed border-border/60 
                                    ${isFirst ? 'top-[-24px] lg:top-[50%]' : 'top-0'} 
                                    ${isLast ? 'bottom-auto' : 'bottom-[-20px]'} 
                                    ${isLast ? (isFirst ? 'h-[calc(50%+24px)] lg:h-0' : 'h-[50%]') : 'h-auto'}
                                  `}
                                />
                                {/* Horizontal connector to pump */}
                                <div className="absolute w-8 lg:w-10 border-t-2 border-dashed border-border/60 left-0 top-1/2 -translate-y-[1px]" />
                                
                                <Card className="border-border/40 shadow-sm relative z-10 bg-card/80 backdrop-blur-sm py-2">
                                  <CardHeader className="px-4 py-0">
                                    <CardTitle className="font-semibold text-sm flex items-center justify-between">
                                      <span className="flex items-center gap-2">
                                        <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                                          <Fuel size={14} />
                                        </div>
                                        {pump.name}
                                      </span>
                                      <StatusBadge status={pump.status || "ACTIVE"} />
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="px-4 pb-4 pt-0">
                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-2 mt-1">Nozzles ({pump.nozzles.length})</div>
                                    
                                    {/* Connecting Lines to Nozzles inside Pump */}
                                    <div className="space-y-3">
                                      {pump.nozzles.map((noz: any, nIndex: number) => {
                                        const isLastNoz = nIndex === pump.nozzles.length - 1;
                                        return (
                                          <div key={noz.id} className="relative pl-6">
                                            {/* Vertical tree line for nozzle */}
                                            <div 
                                              className="absolute left-1 border-l-2 border-dashed border-border/40"
                                              style={{
                                                top: nIndex === 0 ? '-12px' : '0',
                                                bottom: isLastNoz ? 'auto' : '-12px',
                                                height: isLastNoz ? (nIndex === 0 ? '28px' : '16px') : 'auto'
                                              }}
                                            />
                                            {/* Horizontal connector to nozzle */}
                                            <div className="absolute w-5 border-t-2 border-dashed border-border/40 left-1 top-[16px]" />
                                            
                                            <div className="flex items-center justify-between w-full text-xs bg-background text-foreground px-3 py-2 rounded-md font-medium border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                              <span className="flex items-center gap-2">
                                                <div className={`size-2 rounded-full ${
                                                  noz.status === 'ACTIVE' || !noz.status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                                                  noz.status === 'ISSUE' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' :
                                                  noz.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-stone-500'
                                                }`} />
                                                {noz.name}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{noz.status || 'ACTIVE'}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
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

      {/* Assign Manager Dialog */}
      {activeDialog === "manager" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Station Manager</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignManager} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Manager</label>
                <Popover open={openManagerSelect} onOpenChange={setOpenManagerSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal bg-background"
                    >
                      <span className="truncate">
                        {selectedManagerId === "" ? "Unassigned" : (
                          users.find(u => u.id === selectedManagerId)
                            ? (() => {
                                const u = users.find(u => u.id === selectedManagerId)!;
                                return u.firstName || u.lastName
                                  ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                  : u.email;
                              })()
                            : "Select..."
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="unassigned"
                            onSelect={() => {
                              setSelectedManagerId("");
                              setOpenManagerSelect(false);
                            }}
                          >
                            Unassigned
                            {selectedManagerId === "" && <Check className="ml-auto h-4 w-4" />}
                          </CommandItem>
                          {users.map((u) => {
                            const label = u.firstName || u.lastName
                              ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                              : u.email;
                            return (
                              <CommandItem
                                key={u.id}
                                value={`${label} ${u.email}`.toLowerCase()}
                                onSelect={() => {
                                  setSelectedManagerId(u.id);
                                  setOpenManagerSelect(false);
                                }}
                              >
                                {label} ({u.email})
                                {selectedManagerId === u.id && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isAssigningManager}>Cancel</Button>
                <Button type="submit" disabled={isAssigningManager} className="gap-2">
                  {isAssigningManager ? <><SpinnerEllipsis /><span>Saving...</span></> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Station Dialog */}
      {activeDialog === "edit-station" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Station Information</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditStation} className="space-y-4 pt-4">
              <FormField label="Station Name" htmlFor="s_name" error={editStationForm.formState.errors.name?.message}>
                <TextInput id="s_name" {...editStationForm.register("name")} />
              </FormField>

              <FormField label="Station Code" htmlFor="s_code" error={editStationForm.formState.errors.code?.message}>
                <TextInput id="s_code" {...editStationForm.register("code")} />
              </FormField>

              <FormField label="Region" htmlFor="s_region" error={editStationForm.formState.errors.region?.message}>
                <select id="s_region" className="rounded border border-input bg-background px-3 py-2 text-sm w-full" {...editStationForm.register("region")}>
                  <option value="">Select Region</option>
                  <option value="South-West">South-West</option>
                  <option value="South-East">South-East</option>
                  <option value="North-Central">North-Central</option>
                  <option value="North-West">North-West</option>
                  <option value="North-East">North-East</option>
                  <option value="South-South">South-South</option>
                </select>
              </FormField>

              <FormField label="Location" htmlFor="s_location" error={editStationForm.formState.errors.location?.message}>
                <TextInput id="s_location" {...editStationForm.register("location")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={editStationForm.formState.isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={editStationForm.formState.isSubmitting} className="gap-2">
                  {editStationForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Saving...</span></> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
                    <select id="t_prod" className="rounded border border-input bg-background px-3 py-2 text-sm w-full" {...tankForm.register("productType")}>
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
                    <Button type="button" variant="outline" className="mr-2" onClick={closeDialog} disabled={tankForm.formState.isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={tankForm.formState.isSubmitting} className="gap-2">
                      {tankForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Creating...</span></> : "Create Tank"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="addPump" className="pt-4">
                <form onSubmit={handleAddPump} className="space-y-4">
                  <FormField label="Pump Name" htmlFor="p_name" error={pumpForm.formState.errors.name?.message}>
                    <TextInput id="p_name" placeholder="e.g. Pump 1" {...pumpForm.register("name")} />
                  </FormField>

                  <FormField label="Draws From Tank" htmlFor="p_tank" error={pumpForm.formState.errors.tankId?.message}>
                    <select id="p_tank" className="rounded border border-input bg-background px-3 py-2 text-sm w-full" {...pumpForm.register("tankId")}>
                      <option value="">Select tank...</option>
                      {station.tanks.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Number of Nozzles" htmlFor="p_nozzle_count" error={pumpForm.formState.errors.nozzles?.message}>
                    <select
                      id="p_nozzle_count"
                      className="rounded border border-input bg-background px-3 py-2 text-sm w-full font-medium"
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
                    <Button type="button" variant="outline" className="mr-2" onClick={closeDialog} disabled={pumpForm.formState.isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={pumpForm.formState.isSubmitting} className="gap-2">
                      {pumpForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Creating...</span></> : "Create Pump"}
                    </Button>
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

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { z } from "zod";
import { apiGet, apiPost, apiPatch } from "@/lib/client/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
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
  Truck,
  Flame,
  Fuel,
  Wallet,
  Settings,
  TrendingUp,
  Plus,
  Droplet,
  Cloud,
  Pencil,
  ChevronsUpDown,
  Check,
  ArrowLeft
} from "lucide-react";
import { AssetTank } from "@/components/asset-tank";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import nigerianLocations from "@/constant/nigerian-locations.json";

const optionalReading = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}, z.number().nonnegative().nullable());

const AddTankSchema = z.object({
  name: z.string().min(1, "Please enter a tank name").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive("Capacity must be positive"),
  waterLevel: optionalReading.optional(),
  temperature: optionalReading.optional(),
});

const AddPumpSchema = z.object({
  name: z.string().min(1, "Please enter a pump name").max(50),
  tankId: z.string().min(1, "Please select a tank"),
  nozzles: z.array(z.object({ name: z.string().min(1) })).min(1),
});

const EditStationSchema = z.object({
  name: z.string().min(2, "Station name must be at least 2 characters"),
  code: z.string().min(2, "Station code must be at least 2 characters"),
  state: z.string().min(2, "Please select a state"),
  lga: z.string().min(2, "Please select an LGA"),
  ward: z.string().min(2, "Please select a ward"),
  location: z.string().optional().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
});



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

function isToday(dateInput: string | Date): boolean {
  const d = new Date(dateInput);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

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
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [nozzleCount, setNozzleCount] = useState<number>(1);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [openManagerSelect, setOpenManagerSelect] = useState(false);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<any[]>([]);
  const [lastWaybill, setLastWaybill] = useState<any | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
    defaultValues: { name: "", productType: "PMS" as any, capacity: 0, waterLevel: null, temperature: null },
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
      state: station.state || "",
      lga: station.lga || "",
      ward: station.ward || "",
      location: station.location || "",
      latitude: station.latitude != null ? Number(station.latitude) : null,
      longitude: station.longitude != null ? Number(station.longitude) : null,
      altitude: station.altitude != null ? Number(station.altitude) : null,
    }
  });

  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);
  const [openWardSelect, setOpenWardSelect] = useState(false);

  const selectedState = editStationForm.watch("state");
  const selectedLga = editStationForm.watch("lga");
  const selectedWard = editStationForm.watch("ward");

  const availableLgas = selectedState
    ? nigerianLocations.find((loc) => loc.state === selectedState)?.lgas || []
    : [];

  const availableWards = selectedLga
    ? availableLgas.find((l) => l.name === selectedLga)?.wards || []
    : [];

  const handleWardSelect = (wardName: string) => {
    editStationForm.setValue("ward", wardName, { shouldValidate: true });
    const wardObj = availableWards.find((w) => w.name === wardName);
    if (wardObj) {
      editStationForm.setValue("latitude", wardObj.latitude);
      editStationForm.setValue("longitude", wardObj.longitude);
    } else {
      editStationForm.setValue("latitude", null);
      editStationForm.setValue("longitude", null);
    }
  };

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
    tankForm.reset({ name: "", productType: "PMS" as any, capacity: 0, waterLevel: null, temperature: null });
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
    const res = await apiPatch(`/api/tenant/stations/${station.id}`, {
      ...values,
      staffUserIds: selectedManagerId ? [selectedManagerId] : [],
    });
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const openEditStation = () => {
    setSelectedManagerId(station.staff && station.staff.length > 0 ? station.staff[0].id : "");
    editStationForm.reset({
      name: station.name || "",
      code: station.code || "",
      state: station.state || "",
      lga: station.lga || "",
      ward: station.ward || "",
      location: station.location || "",
      latitude: station.latitude != null ? Number(station.latitude) : null,
      longitude: station.longitude != null ? Number(station.longitude) : null,
      altitude: station.altitude != null ? Number(station.altitude) : null,
    });
    setActiveDialog("edit-station");
  };

  const [configTab, setConfigTab] = useState<string>("addTank");

  const openAddTankDialog = () => {
    const nextTankIndex = (station.tanks?.length || 0) + 1;
    tankForm.reset({
      name: `TANK ${nextTankIndex}`,
      productType: "PMS",
      capacity: 0,
      waterLevel: null,
      temperature: null,
    });
    setConfigTab("addTank");
    setActiveDialog("config");
  };

  const openAddPumpDialog = () => {
    const nextPumpIndex = (station.pumps?.length || 0) + 1;
    pumpForm.reset({
      name: `PUMP ${nextPumpIndex}`,
      tankId: "",
      nozzles: [{ name: "Nozzle A" }]
    });
    setConfigTab("addPump");
    setActiveDialog("config");
  };

  const openConfigDialog = () => {
    openAddTankDialog();
  };

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      const base = `/api/tenant/stations/${station.id}`;
      const [salesRes, expensesRes, waybillRes] = await Promise.all([
        apiGet<any[]>(`${base}/sales-logs?page=1&take=5`),
        apiGet<any[]>(`${base}/expenses?page=1&take=50`),
        apiGet<any[]>(`${base}/waybills?page=1&take=1`),
      ]);

      if (cancelled) return;

      setRecentSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      setTodayExpenses(expenses.filter((e) => isToday(e.createdAt)));
      const waybills = Array.isArray(waybillRes.data) ? waybillRes.data : [];
      setLastWaybill(waybills[0] ?? null);
      setOverviewLoading(false);
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [station.id]);

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

  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/station/stations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl">{station.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">Station overview · {station.code}</CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={openEditStation} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Station
            </Button>
            <Button onClick={openConfigDialog} className="gap-2">
              <Settings className="h-4 w-4" />
              Config
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {/* ---------------- STATION INFO & PRICES GRID ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Station Information Card */}
        <Card className="flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Store size={16} className="text-primary" />
              Station Information
            </CardTitle>
            <CardDescription className="text-xs">Operational status and location details</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2 flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Station Manager</p>
                  <p className="font-semibold text-foreground">{managerName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Store size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Station Code</p>
                  <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 h-5 bg-background">{station.code}</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location / Ward / LGA</p>
                  <p className="font-semibold text-foreground text-xs leading-tight">
                    {station.ward ? `${station.ward}, ` : ""}{station.lga ? `${station.lga}, ` : ""}{station.state || "N/A"}
                  </p>
                  {station.location && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{station.location}</p>
                  )}
                </div>
              </div>

              {((station.latitude != null) || (station.longitude != null) || (station.altitude != null)) && (
                <div className="col-span-2 flex items-center gap-3 border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-1">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">GPS Coordinates</div>
                  <div className="flex gap-4 text-xs font-mono">
                    {station.latitude != null && (
                      <div><span className="text-muted-foreground">LAT:</span> <span className="font-medium text-foreground">{Number(station.latitude).toFixed(6)}</span></div>
                    )}
                    {station.longitude != null && (
                      <div><span className="text-muted-foreground">LON:</span> <span className="font-medium text-foreground">{Number(station.longitude).toFixed(6)}</span></div>
                    )}
                    {station.altitude != null && (
                      <div><span className="text-muted-foreground">ALT:</span> <span className="font-medium text-foreground">{Number(station.altitude).toFixed(1)}m</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Consolidated Prices Card */}
        <Card className="flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Fuel size={16} className="text-primary" />
              Product Prices
            </CardTitle>
            <CardDescription className="text-xs">Active retail fuel prices per unit</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              {["PMS", "AGO", "DPK", "LPG"].map((product) => {
                const price = latestPrices[product];
                return (
                  <div key={product} className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                      {PRODUCT_ICONS[product] || <Flame size={14} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {PRODUCT_NAMES[product] ? PRODUCT_NAMES[product].split(" ")[0] : product}
                      </p>
                      <p className="text-base font-bold text-foreground font-mono mt-0.5 truncate">
                        {price != null ? (
                          `₦${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- ACTIVITY SNAPSHOT ---------------- */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Sales */}
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-500" />
              Recent Sales
            </CardTitle>
            <CardDescription className="text-xs">Latest recorded sales logs</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <SpinnerEllipsis />
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => {
                  const revenue = Number(sale.amountPos) + Number(sale.amountTransfer);
                  return (
                    <div key={sale.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-mono">{sale.productType}</Badge>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {formatHumanReadableDate(sale.logDate).split(" ").slice(0, 3).join(" ")}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          {Number(sale.litersSold).toLocaleString()} L
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono text-foreground">
                          ₦{revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant="outline" className={cn(
                          "text-[8px] mt-0.5",
                          sale.status === "APPROVED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" :
                          sale.status === "REJECTED" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30" :
                          "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                        )}>
                          {sale.status ?? "PENDING"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Expenses */}
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wallet size={15} className="text-amber-500" />
              Today&apos;s Expenses
            </CardTitle>
            <CardDescription className="text-xs">Expenses recorded today only</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <SpinnerEllipsis />
              </div>
            ) : todayExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No expenses recorded today.</p>
            ) : (
              <>
                <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Today</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    ₦{todayExpensesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{todayExpenses.length} expense{todayExpenses.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-start justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                      <div className="min-w-0">
                        <Badge variant="secondary" className="text-[9px]">{expense.category.replace(/_/g, " ")}</Badge>
                        <p className="text-xs text-muted-foreground truncate mt-1">{expense.description}</p>
                      </div>
                      <p className="text-xs font-mono font-semibold text-foreground shrink-0">
                        ₦{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last Waybill */}
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck size={15} className="text-blue-500" />
              Last Waybill
            </CardTitle>
            <CardDescription className="text-xs">Most recent fuel delivery</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <SpinnerEllipsis />
              </div>
            ) : !lastWaybill ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No waybill deliveries yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">{lastWaybill.waybill?.number ?? "—"}</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px]",
                    lastWaybill.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" :
                    lastWaybill.status === "IN_TRANSIT" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30" :
                    "text-stone-600 border-stone-200 bg-stone-50 dark:bg-stone-900/30"
                  )}>
                    {lastWaybill.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Dispatched</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {formatHumanReadableDate(lastWaybill.waybill?.dispatchedAt).split(" ").slice(0, 3).join(" ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Volume</p>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      {Number(lastWaybill.litersToDispense || 0).toLocaleString()} L
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Driver / Truck</p>
                    <p className="text-muted-foreground mt-0.5">
                      {lastWaybill.waybill?.driverName ?? "—"} • {lastWaybill.waybill?.truckPlate ?? "—"}
                    </p>
                  </div>
                  {lastWaybill.litersReceived != null && (
                    <div className="col-span-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Variance</span>
                        {(() => {
                          const dispatched = Number(lastWaybill.litersToDispense) || 0;
                          const received = Number(lastWaybill.litersReceived);
                          const variance = received - dispatched;
                          return (
                            <span className={cn("font-mono font-semibold text-sm", variance < 0 ? "text-rose-600" : "text-emerald-600")}>
                              {variance > 0 ? "+" : ""}{variance.toLocaleString()} L
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- TANK OVERVIEW ---------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Tank Overview</h2>
            <p className="text-xs text-muted-foreground">Live storage levels across all tanks</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openAddTankDialog} className="h-8 gap-1.5 text-xs">
              <Plus size={14} className="text-primary" />
              Add Tank
            </Button>
            <Button size="sm" variant="outline" onClick={openAddPumpDialog} className="h-8 gap-1.5 text-xs">
              <Plus size={14} className="text-primary" />
              Add Pump
            </Button>
          </div>
        </div>

        {station.tanks.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-16 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Droplet size={24} />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Tanks Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-6">
              Add storage tanks to start tracking fuel levels at this station.
            </p>
            <Button onClick={openAddTankDialog} className="gap-2 shadow-xs text-xs h-9">
              <Plus size={15} />
              Add Storage Tank
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {station.tanks.map((tank: any) => {
              const currentLitres = Number(tank.currentLiters || 0);
              const capacity = Number(tank.capacity);
              const tankPumps = station.pumps.filter((p: any) => p.tankId === tank.id);
              const nozzleCount = tankPumps.reduce((sum: number, p: any) => sum + (p.nozzles?.length ?? 0), 0);

              return (
                <div key={tank.id} className="flex flex-col gap-2">
                  <Link href={`/admin/station/stations/${station.id}/tanks/${tank.id}`} className="group">
                    <div className="relative">
                      <AssetTank
                        variant="compact"
                        currentLitres={currentLitres}
                        maxCapacity={capacity}
                        label={tank.name}
                        type={tank.productType === "LPG" ? "gas" : "fuel"}
                        className="group-hover:border-primary/40 group-hover:shadow-md transition-all duration-200 pt-8"
                      />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
                        <Badge variant="outline" className="font-mono text-[9px] bg-background/80 backdrop-blur-sm">
                          {tank.productType}
                        </Badge>
                        <StatusBadge status={tank.status || "ACTIVE"} />
                      </div>
                    </div>
                  </Link>
                  {(tankPumps.length > 0 || nozzleCount > 0 || tank.waterLevel != null || tank.temperature != null) && (
                    <p className="text-[10px] text-center text-muted-foreground">
                      {[
                        tankPumps.length > 0 || nozzleCount > 0
                          ? `${tankPumps.length} pump${tankPumps.length !== 1 ? "s" : ""} · ${nozzleCount} nozzle${nozzleCount !== 1 ? "s" : ""}`
                          : null,
                        tank.waterLevel != null ? `Water ${Number(tank.waterLevel).toLocaleString()} L` : null,
                        tank.temperature != null ? `${Number(tank.temperature)}°C` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Station & Assign Manager Dialog */}
      {activeDialog === "edit-station" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Station & Management</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditStation} className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Station Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2 mb-4">Station Details</h3>
                  
                  {/* Station Name - Full Width */}
                  <FormField label="Station Name" htmlFor="s_name" error={editStationForm.formState.errors.name?.message}>
                    <Input id="s_name" {...editStationForm.register("name")} />
                  </FormField>

                  {/* State and Station Code - Same Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* State */}
                    <FormField label="State" htmlFor="s_state" error={editStationForm.formState.errors.state?.message}>
                      <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            id="s_state"
                            className="w-full justify-between font-normal bg-background text-foreground"
                          >
                            <span className="truncate">{selectedState || "Select State"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search state..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No state found.</CommandEmpty>
                              <CommandGroup>
                                {nigerianLocations.map((loc) => (
                                  <CommandItem
                                    key={loc.state}
                                    value={loc.state.toLowerCase()}
                                    onSelect={() => {
                                      editStationForm.setValue("state", loc.state, { shouldValidate: true });
                                      editStationForm.setValue("lga", "");
                                      editStationForm.setValue("ward", "");
                                      editStationForm.setValue("latitude", null);
                                      editStationForm.setValue("longitude", null);
                                      setOpenStateSelect(false);
                                    }}
                                  >
                                    {loc.state}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <input type="hidden" {...editStationForm.register("state")} />
                    </FormField>

                    {/* Station Code */}
                    <FormField label="Station Code" htmlFor="s_code" error={editStationForm.formState.errors.code?.message}>
                      <Input id="s_code" {...editStationForm.register("code")} />
                    </FormField>
                  </div>

                  {/* LGA and Ward - Same Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* LGA */}
                    <FormField label="LGA" htmlFor="s_lga" error={editStationForm.formState.errors.lga?.message}>
                      <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            id="s_lga"
                            disabled={!selectedState}
                            className="w-full justify-between font-normal bg-background text-foreground"
                          >
                            <span className="truncate">{selectedLga || "Select LGA"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search LGA..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No LGA found.</CommandEmpty>
                              <CommandGroup>
                                {availableLgas.map((lga: any) => (
                                  <CommandItem
                                    key={lga.name}
                                    value={lga.name.toLowerCase()}
                                    onSelect={() => {
                                      editStationForm.setValue("lga", lga.name, { shouldValidate: true });
                                      editStationForm.setValue("ward", "");
                                      editStationForm.setValue("latitude", null);
                                      editStationForm.setValue("longitude", null);
                                      setOpenLgaSelect(false);
                                    }}
                                  >
                                    {lga.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <input type="hidden" {...editStationForm.register("lga")} />
                    </FormField>

                    {/* Ward */}
                    <FormField label="Ward" htmlFor="s_ward" error={editStationForm.formState.errors.ward?.message}>
                      <Popover open={openWardSelect} onOpenChange={setOpenWardSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            id="s_ward"
                            disabled={!selectedLga}
                            className="w-full justify-between font-normal bg-background text-foreground"
                          >
                            <span className="truncate">{selectedWard || "Select Ward"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search ward..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No ward found.</CommandEmpty>
                              <CommandGroup>
                                {availableWards.map((ward: any) => (
                                  <CommandItem
                                    key={ward.name}
                                    value={ward.name.toLowerCase()}
                                    onSelect={() => {
                                      handleWardSelect(ward.name);
                                      setOpenWardSelect(false);
                                    }}
                                  >
                                    {ward.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <input type="hidden" {...editStationForm.register("ward")} />
                    </FormField>
                  </div>

                  <FormField label="Location / Address" htmlFor="s_location" error={editStationForm.formState.errors.location?.message}>
                    <Input id="s_location" {...editStationForm.register("location")} />
                  </FormField>
                </div>

                {/* Right Column: Manager Assignment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2 mb-4">Management</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Manager</label>
                    <Popover open={openManagerSelect} onOpenChange={setOpenManagerSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal bg-background text-foreground"
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
                </div>

              </div>

              {apiError && <p className="text-xs text-red-600 mt-4">{apiError}</p>}

              <DialogFooter className="mt-6">
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
            
            <Tabs value={configTab} onValueChange={setConfigTab} className="w-full mt-4">
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
                    <select id="t_prod" className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full" {...tankForm.register("productType")}>
                      <option value="PMS">PMS (Petrol)</option>
                      <option value="AGO">AGO (Diesel)</option>
                      <option value="DPK">DPK (Kerosene)</option>
                      <option value="LPG">LPG (Gas)</option>
                    </select>
                  </FormField>

                  <FormField label="Liters Capacity" htmlFor="t_cap" error={tankForm.formState.errors.capacity?.message}>
                    <Controller
                      name="capacity"
                      control={tankForm.control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          id="t_cap"
                          placeholder="e.g. 45000"
                          value={field.value as string | number}
                          onChange={(e: any) => field.onChange(Number(e.target.value))}
                          prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                        />
                      )}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Water level (L, optional)" htmlFor="t_water" error={tankForm.formState.errors.waterLevel?.message}>
                      <Controller
                        name="waterLevel"
                        control={tankForm.control}
                        render={({ field }) => (
                          <FormattedNumberInput
                            id="t_water"
                            placeholder="e.g. 12"
                            value={(field.value ?? "") as string | number}
                            onChange={(e: any) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          />
                        )}
                      />
                    </FormField>
                    <FormField label="Temperature (°C, optional)" htmlFor="t_temp" error={tankForm.formState.errors.temperature?.message}>
                      <Controller
                        name="temperature"
                        control={tankForm.control}
                        render={({ field }) => (
                          <FormattedNumberInput
                            id="t_temp"
                            placeholder="e.g. 28"
                            value={(field.value ?? "") as string | number}
                            onChange={(e: any) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          />
                        )}
                      />
                    </FormField>
                  </div>

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
                    <select id="p_tank" className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full" {...pumpForm.register("tankId")}>
                      <option value="">Select tank...</option>
                      {station.tanks.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Number of Nozzles" htmlFor="p_nozzle_count" error={pumpForm.formState.errors.nozzles?.message}>
                    <select
                      id="p_nozzle_count"
                      className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full font-medium"
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

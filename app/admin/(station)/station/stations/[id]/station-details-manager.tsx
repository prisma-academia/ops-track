"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, formatHumanReadableDate, formatHumanReadableDateOnly } from "@/lib/utils";
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
  DialogDescription,
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
  ArrowLeft,
  Lock,
  AlertCircle,
  Landmark,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { uploadClientFile } from "@/lib/client-upload";
import { AssetTank } from "@/components/asset-tank";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import nigerianLocations from "@/constant/nigerian-locations.json";
import { StationManagersSelector } from "@/components/station-managers-selector";

const optionalReading = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}, z.number().nonnegative().nullable());

const AddTankSchema = z.object({
  name: z.string().min(1, "Please enter a tank name").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive("Capacity must be positive"),
  currentLiters: optionalReading.optional(),
  waterLevel: optionalReading.optional(),
  temperature: optionalReading.optional(),
}).refine((data) => {
  if (data.currentLiters != null && data.currentLiters > data.capacity) {
    return false;
  }
  return true;
}, {
  message: "Initial stock cannot exceed tank capacity",
  path: ["currentLiters"],
});

const EditTankSchema = z.object({
  name: z.string().min(1, "Please enter a tank name").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive("Capacity must be positive"),
  currentLiters: optionalReading.optional(),
  waterLevel: optionalReading.optional(),
  temperature: optionalReading.optional(),
}).refine((data) => {
  if (data.currentLiters != null && data.currentLiters > data.capacity) {
    return false;
  }
  return true;
}, {
  message: "Stock cannot exceed tank capacity",
  path: ["currentLiters"],
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
  imageUrl: z.string().optional().nullable(),
});

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  PMS: <Flame size={16} className="text-rose-500" />,
  AGO: <Droplet size={16} className="text-amber-500" />,
  DPK: <Droplet size={16} className="text-blue-500" />,
  LPG: <Cloud size={16} className="text-slate-500" />,
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
  canEditTank = true,
  initialLedger,
}: {
  station: any;
  users: any[];
  canEditTank?: boolean;
  initialLedger?: {
    expectedRevenue: number;
    totalReceived: number;
    balance: number;
    overpayment: number;
    underpayment: number;
    totalSalesCount: number;
    varianceItems?: any[];
  };
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [nozzleCount, setNozzleCount] = useState<number>(1);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<any[]>([]);
  const [recentWaybills, setRecentWaybills] = useState<any[]>([]);
  const [stationLedger, setStationLedger] = useState(initialLedger || null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
    defaultValues: { name: "", productType: "PMS" as any, capacity: "" as any, currentLiters: "" as any, waterLevel: null, temperature: null },
  });

  const [editingTank, setEditingTank] = useState<any | null>(null);

  const editTankForm = useForm({
    resolver: zodResolver(EditTankSchema),
    defaultValues: { name: "", productType: "PMS" as any, capacity: "" as any, currentLiters: "" as any, waterLevel: null, temperature: null },
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
      imageUrl: station.imageUrl || "",
    }
  });

  const [stationImagePreview, setStationImagePreview] = useState<string | null>(station.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    setEditingTank(null);
    tankForm.reset({ name: "", productType: "PMS" as any, capacity: "" as any, currentLiters: "" as any, waterLevel: null, temperature: null });
    editTankForm.reset({ name: "", productType: "PMS" as any, capacity: "" as any, currentLiters: "" as any, waterLevel: null, temperature: null });
    pumpForm.reset({ name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] });
    router.refresh();
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsAssigningManager(true);
    const res = await apiPatch(`/api/tenant/stations/${station.id}`, {
      staffUserIds: selectedManagerIds,
    });
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
      staffUserIds: selectedManagerIds,
    });
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const openEditStation = () => {
    setSelectedManagerIds(Array.isArray(station.staff) ? station.staff.map((s: any) => s.id) : []);
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
      imageUrl: station.imageUrl || "",
    });
    setStationImagePreview(station.imageUrl || null);
    setActiveDialog("edit-station");
  };

  const handleEditTank = editTankForm.handleSubmit(async (values) => {
    if (!editingTank || !canEditTank) return;
    setApiError(null);

    const hasRecords = Boolean(
      (editingTank._count?.dippings ?? 0) > 0 ||
      (editingTank._count?.waybillDippings ?? 0) > 0 ||
      (editingTank._count?.pumps ?? 0) > 0 ||
      (editingTank._count?.stockMovements ?? 0) > 1 ||
      (editingTank.stockMovements && editingTank.stockMovements.length > 0) ||
      (editingTank.dippingSessions && editingTank.dippingSessions.length > 0) ||
      (station.pumps?.some((p: any) => p.tankId === editingTank.id))
    );

    const effectiveStock = Number(editingTank.currentLiters || 0);
    if (values.capacity < effectiveStock) {
      setApiError(`Tank capacity cannot be reduced below current stock (${effectiveStock.toLocaleString()} L).`);
      return;
    }

    const payload: any = {
      name: values.name,
      waterLevel: values.waterLevel,
      temperature: values.temperature,
      capacity: values.capacity,
    };
    if (!hasRecords) {
      payload.productType = values.productType;
      payload.currentLiters = values.currentLiters;
    }

    const res = await apiPatch(`/api/tenant/stations/${station.id}/tanks/${editingTank.id}`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const openEditTankDialog = (tank: any, e?: React.MouseEvent) => {
    if (!canEditTank) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingTank(tank);
    editTankForm.reset({
      name: tank.name || "",
      productType: tank.productType || "PMS",
      capacity: tank.capacity != null ? String(tank.capacity) : ("" as any),
      currentLiters: tank.currentLiters != null ? String(tank.currentLiters) : ("" as any),
      waterLevel: tank.waterLevel != null ? String(tank.waterLevel) : null,
      temperature: tank.temperature != null ? String(tank.temperature) : null,
    });
    setActiveDialog("edit-tank");
  };

  const openAddTankDialog = () => {
    const nextTankIndex = (station.tanks?.length || 0) + 1;
    tankForm.reset({
      name: `TANK ${nextTankIndex}`,
      productType: "PMS",
      capacity: "" as any,
      currentLiters: "" as any,
      waterLevel: null,
      temperature: null,
    });
    setActiveDialog("add-tank");
  };

  const openAddPumpDialog = () => {
    const nextPumpIndex = (station.pumps?.length || 0) + 1;
    pumpForm.reset({
      name: `PUMP ${nextPumpIndex}`,
      tankId: station.tanks?.[0]?.id || "",
      nozzles: [{ name: "Nozzle A" }]
    });
    setActiveDialog("add-pump");
  };

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      const base = `/api/tenant/stations/${station.id}`;
      const [salesRes, expensesRes, waybillRes, stationRes] = await Promise.all([
        apiGet<any[]>(`${base}/sales-logs?page=1&take=3&status=APPROVED`),
        apiGet<any[]>(`${base}/expenses?page=1&take=50&status=APPROVED`),
        apiGet<any[]>(`${base}/waybills?page=1&take=3`),
        apiGet<any>(`${base}`),
      ]);

      if (cancelled) return;

      setRecentSales(Array.isArray(salesRes.data) ? salesRes.data.slice(0, 3) : []);
      const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      setTodayExpenses(expenses.filter((e) => isToday(e.createdAt)));
      const waybills = Array.isArray(waybillRes.data) ? waybillRes.data.slice(0, 3) : [];
      setRecentWaybills(waybills);
      if (stationRes.data?.ledgerSummary) {
        setStationLedger(stationRes.data.ledgerSummary);
      }
      setOverviewLoading(false);
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [station.id]);

  // Derive managers from staff
  const managers = Array.isArray(station.staff) ? station.staff : [];
  const managerNames = managers.length > 0
    ? managers.map((m: any) => `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email).join(", ")
    : "Unassigned";

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

  const isUnderpayment = (stationLedger?.balance ?? 0) < 0;
  const isOverpayment = (stationLedger?.balance ?? 0) > 0;
  const isSettled = (stationLedger?.balance ?? 0) === 0;

  const varianceList = (stationLedger?.varianceItems || []).filter((item: any) => {
    if (isUnderpayment) return item.variance < 0;
    if (isOverpayment) return item.variance > 0;
    return item.variance !== 0;
  });

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
          </CardAction>
        </CardHeader>
      </Card>

      {/* ---------------- STATION INFO & LEDGER GRID ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Station Information Card */}
        <Card className="flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardContent className="flex-1 flex flex-col justify-between">
            {station.imageUrl && (
              <div className="mb-4 relative h-40 w-full overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800 bg-muted">
                <img
                  src={station.imageUrl}
                  alt={station.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Left Column: Station Manager, State, Ward / LGA, Station Code */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Station Manager</p>
                    <p className="font-semibold text-foreground truncate">{managerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Landmark size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">State</p>
                    <p className="font-semibold text-foreground truncate">{station.state || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ward / LGA</p>
                    <p className="font-semibold text-foreground truncate text-xs">
                      {[station.ward, station.lga].filter(Boolean).join(" / ") || "N/A"}
                    </p>
                    {station.location && (
                      <p className="text-[10px] text-muted-foreground truncate">{station.location}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Store size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Station Code</p>
                    <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 h-5 bg-background mt-0.5">{station.code}</Badge>
                  </div>
                </div>
              </div>

              {/* Right Column: Product and Prices with same UI as left, no divider */}
              <div className="space-y-3">
                {["PMS", "AGO", "DPK", "LPG"].map((product) => {
                  const price = latestPrices[product];
                  return (
                    <div key={product} className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {PRODUCT_ICONS[product] || <Flame size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                          {PRODUCT_NAMES[product] ? PRODUCT_NAMES[product].split(" ")[0] : product} Price
                        </p>
                        <p className="font-semibold text-foreground font-mono mt-0.5">
                          {price != null ? (
                            `₦${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / L`
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {((station.latitude != null) || (station.longitude != null) || (station.altitude != null)) && (
              <div className="flex items-center gap-3 border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-3">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">GPS</div>
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
          </CardContent>
        </Card>

        {/* Station Ledger Card */}
        <Card className="flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                Station Ledger
              </CardTitle>
              <CardDescription className="text-xs">Sales revenue and settlement status</CardDescription>
            </div>
            {stationLedger && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5",
                  isUnderpayment
                    ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30"
                    : isOverpayment
                    ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-muted-foreground border-stone-200 bg-stone-50 dark:bg-stone-900/30"
                )}
              >
                {isUnderpayment
                  ? "Underpayment"
                  : isOverpayment
                  ? "Overpayment"
                  : "Settled"}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-3">
            {/* Station Ledger Balance Hero Box */}
            <div className={cn(
              "p-4 rounded-xl border flex items-center justify-between",
              isUnderpayment
                ? "bg-rose-500/5 border-rose-500/15"
                : isOverpayment
                ? "bg-emerald-500/5 border-emerald-500/15"
                : "bg-stone-50/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800"
            )}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                    isUnderpayment
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-bold"
                      : isOverpayment
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold"
                      : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 font-bold"
                  )}>
                    {isUnderpayment ? "Underpayment" : isOverpayment ? "Overpayment" : "Settled"}
                  </span>
                </div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pt-1">
                  Station Ledger Balance
                </p>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  isUnderpayment
                    ? "text-rose-600"
                    : isOverpayment
                    ? "text-emerald-600"
                    : "text-foreground"
                )}>
                  {stationLedger
                    ? `${stationLedger.balance < 0 ? "-₦" : stationLedger.balance > 0 ? "+₦" : "₦"}${Math.abs(stationLedger.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "₦0.00"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {stationLedger?.totalSalesCount ?? 0} Sales Logged
                </p>
                <Link
                  href="/admin/station/sales-reports"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 mt-1.5"
                >
                  Sales Report &rarr;
                </Link>
              </div>
            </div>

            {/* Below: Reason for Over or Under / Related Sales */}
            <div className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-3.5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>
                    {isUnderpayment
                      ? "Reason for Underpayment"
                      : isOverpayment
                      ? "Reason for Overpayment"
                      : "Settlement Status"}
                  </span>
                  {varianceList.length > 0 && (
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {varianceList.length} sales with variance
                    </span>
                  )}
                </p>

                {varianceList.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {varianceList.slice(0, 4).map((item: any) => {
                      const formattedDate = formatHumanReadableDateOnly(item.logDate);
                      const isShortage = item.variance < 0;
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-background border border-stone-200/80 dark:border-stone-800/80 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0">
                                {item.productType}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                            </div>
                            <span className={cn(
                              "font-mono font-bold text-[11px]",
                              isShortage ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {isShortage ? "-₦" : "+₦"}{Math.abs(item.variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {item.reason ? (
                            <p className="text-[11px] text-foreground font-medium italic">
                              &ldquo;{item.reason}&rdquo;
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">
                              Expected ₦{Number(item.expectedRevenue).toLocaleString()} · Received ₦{Number(item.totalReceived).toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : isUnderpayment ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Underpayment of ₦{Math.abs(stationLedger?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} across station sales logs.
                  </p>
                ) : isOverpayment ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Surplus remittance of ₦{Math.abs(stationLedger?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} recorded on station sales logs.
                  </p>
                ) : (
                  <div className="flex items-center gap-2.5 py-3 text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="size-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    <span className="font-medium">All recorded sales are settled and balanced. No debt or surplus exists.</span>
                  </div>
                )}
              </div>
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
            <CardDescription className="text-xs">Last 3 recorded sales logs</CardDescription>
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
                {recentSales.slice(0, 3).map((sale) => {
                  const revenue = Number(sale.amountPos) + Number(sale.amountTransfer);
                  return (
                    <div key={sale.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-mono">{sale.productType}</Badge>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {formatHumanReadableDateOnly(sale.logDate)}
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

        {/* Recent Waybills */}
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck size={15} className="text-blue-500" />
              Recent Waybills
            </CardTitle>
            <CardDescription className="text-xs">Last 3 fuel deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                <SpinnerEllipsis />
              </div>
            ) : recentWaybills.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No waybill deliveries yet.</p>
            ) : (
              <div className="space-y-3">
                {recentWaybills.map((wb) => {
                  const productType = wb.waybill?.productType || wb.productType || "PMS";
                  const dispatchedAt = wb.waybill?.dispatchedAt || wb.dispatchedAt;
                  const qty = Number(wb.litersToDispense || wb.litersReceived || 0);

                  return (
                    <div key={wb.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-mono">
                            {productType}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {dispatchedAt ? formatHumanReadableDate(dispatchedAt).split(" ").slice(0, 3).join(" ") : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {qty.toLocaleString()} L
                        </p>
                      </div>
                    </div>
                  );
                })}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {station.tanks.map((tank: any) => {
              const currentLitres = Number(tank.currentLiters || 0);
              const capacity = Number(tank.capacity);
              const tankPumps = station.pumps.filter((p: any) => p.tankId === tank.id);
              const nozzleCount = tankPumps.reduce((sum: number, p: any) => sum + (p.nozzles?.length ?? 0), 0);

              const lastClosing = tank.dippingSessions?.[0]?.closings?.[0];

              return (
                <div key={tank.id} className="flex items-stretch gap-2">
                  <div className="relative group flex-1 min-w-0">
                    <Link href={`/admin/station/stations/${station.id}/tanks/${tank.id}`}>
                      <AssetTank
                        variant="compact"
                        currentLitres={currentLitres}
                        maxCapacity={capacity}
                        label={tank.name}
                        type={tank.productType === "LPG" ? "gas" : "fuel"}
                        productLabel={tank.productType}
                        waterLevel={tank.waterLevel == null ? null : Number(tank.waterLevel)}
                        temperature={tank.temperature == null ? null : Number(tank.temperature)}
                        lastClosingDip={lastClosing ? Number(lastClosing.closingLiters) : null}
                        lastClosingAt={lastClosing ? formatHumanReadableDate(lastClosing.recordedAt) : null}
                        className="group-hover:border-primary/40 group-hover:shadow-md transition-all duration-200 pt-8 h-full"
                        rightSide={
                          <div className="flex flex-col justify-center gap-3 pr-1">
                            <div className="flex flex-col items-center gap-1" title={`${tankPumps.length} Pumps`}>
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Fuel size={16} />
                              </div>
                              <span className="text-xs font-bold font-mono text-foreground">{tankPumps.length}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1" title={`${nozzleCount} Nozzles`}>
                              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Droplet size={16} />
                              </div>
                              <span className="text-xs font-bold font-mono text-foreground">{nozzleCount}</span>
                            </div>
                          </div>
                        }
                      />
                    </Link>
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 pointer-events-none">
                      <Badge variant="outline" className="font-mono text-[9px] bg-background/80 backdrop-blur-sm pointer-events-auto">
                        {tank.productType}
                      </Badge>
                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        <StatusBadge status={tank.status || "ACTIVE"} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Station & Assign Manager Dialog */}
      {activeDialog === "edit-station" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-4xl">
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
                    {/* Station Code */}
                    <FormField label="Station Code" htmlFor="s_code" error={editStationForm.formState.errors.code?.message}>
                      <Input id="s_code" {...editStationForm.register("code")} />
                    </FormField>
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

                  {/* Station Photo Upload */}
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium">Station Photo</label>
                    {stationImagePreview ? (
                      <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
                        <img
                          src={stationImagePreview}
                          alt="Station preview"
                          className="h-32 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer bg-white text-stone-900 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-stone-100 flex items-center gap-1 shadow">
                            <UploadCloud className="size-3.5" />
                            <span>Change</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImage}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setUploadingImage(true);
                                  const url = await uploadClientFile(file);
                                  setStationImagePreview(url);
                                  editStationForm.setValue("imageUrl", url, { shouldValidate: true });
                                } catch (err: any) {
                                  setApiError(err.message || "Failed to upload image.");
                                } finally {
                                  setUploadingImage(false);
                                }
                              }}
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setStationImagePreview(null);
                              editStationForm.setValue("imageUrl", null, { shouldValidate: true });
                            }}
                          >
                            <Trash2 className="size-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors p-4">
                        {uploadingImage ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <SpinnerEllipsis />
                            <span>Uploading photo...</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="size-6 text-muted-foreground mb-1" />
                            <span className="text-xs font-medium text-foreground">Upload station photo</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP up to 10MB</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setUploadingImage(true);
                              const url = await uploadClientFile(file);
                              setStationImagePreview(url);
                              editStationForm.setValue("imageUrl", url, { shouldValidate: true });
                            } catch (err: any) {
                              setApiError(err.message || "Failed to upload image.");
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </label>
                    )}
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

      {/* Add Tank Dialog */}
      {activeDialog === "add-tank" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplet className="size-5 text-primary" />
                Add Storage Tank
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure a new fuel storage tank for this station.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTank} className="space-y-4 pt-2">
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

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Liters Capacity" htmlFor="t_cap" error={tankForm.formState.errors.capacity?.message}>
                  <Controller
                    name="capacity"
                    control={tankForm.control}
                    render={({ field }) => (
                      <FormattedNumberInput
                        id="t_cap"
                        placeholder="e.g. 45000"
                        value={field.value as string | number}
                        onChange={(e: any) => field.onChange(e.target.value)}
                        prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                      />
                    )}
                  />
                </FormField>

                <FormField label="Initial Stock (L, optional)" htmlFor="t_init" error={tankForm.formState.errors.currentLiters?.message}>
                  <Controller
                    name="currentLiters"
                    control={tankForm.control}
                    render={({ field }) => (
                      <FormattedNumberInput
                        id="t_init"
                        placeholder="e.g. 15000"
                        value={(field.value ?? "") as string | number}
                        onChange={(e: any) => field.onChange(e.target.value)}
                        prefixIcon={<Flame className="w-4 h-4 text-emerald-500" />}
                      />
                    )}
                  />
                </FormField>
              </div>

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
                        onChange={(e: any) => field.onChange(e.target.value)}
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
                        onChange={(e: any) => field.onChange(e.target.value)}
                      />
                    )}
                  />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={tankForm.formState.isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={tankForm.formState.isSubmitting} className="gap-2">
                  {tankForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Creating...</span></> : "Create Tank"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Pump Dialog */}
      {activeDialog === "add-pump" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fuel className="size-5 text-primary" />
                Add Dispenser / Pump
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add a fuel dispenser pump and assign which tank it draws from.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPump} className="space-y-4 pt-2">
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

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={pumpForm.formState.isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={pumpForm.formState.isSubmitting} className="gap-2">
                  {pumpForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Creating...</span></> : "Create Pump"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Tank Dialog */}
      {activeDialog === "edit-tank" && editingTank && canEditTank && (() => {
        const editingTankHasRecords = Boolean(
          (editingTank._count?.dippings ?? 0) > 0 ||
          (editingTank._count?.waybillDippings ?? 0) > 0 ||
          (editingTank._count?.pumps ?? 0) > 0 ||
          (editingTank._count?.stockMovements ?? 0) > 1 ||
          (editingTank.stockMovements && editingTank.stockMovements.length > 0) ||
          (editingTank.dippingSessions && editingTank.dippingSessions.length > 0) ||
          (station.pumps?.some((p: any) => p.tankId === editingTank.id))
        );

        return (
          <Dialog open={true} onOpenChange={closeDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="size-5 text-primary" />
                  Edit Tank Information
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update parameters and details for {editingTank.name}.
                </DialogDescription>
              </DialogHeader>

              {editingTankHasRecords && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Protected Tank Records</p>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                      Product type and current stock are locked because this tank has operational records (pumps, dippings, or stock ledger entries).
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleEditTank} className="space-y-4 pt-2">
                <FormField label="Tank Name" htmlFor="et_name" error={editTankForm.formState.errors.name?.message}>
                  <TextInput id="et_name" placeholder="e.g. PMS Tank 1" {...editTankForm.register("name")} />
                </FormField>
                
                <FormField
                  label={
                    <div className="flex items-center justify-between">
                      <span>Product Type</span>
                      {editingTankHasRecords && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-normal">
                          <Lock className="size-3" /> Locked (records exist)
                        </span>
                      )}
                    </div>
                  }
                  htmlFor="et_prod"
                  error={editTankForm.formState.errors.productType?.message}
                >
                  <select
                    id="et_prod"
                    disabled={editingTankHasRecords}
                    className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full disabled:opacity-60 disabled:bg-muted/50 disabled:cursor-not-allowed"
                    {...editTankForm.register("productType")}
                  >
                    <option value="PMS">PMS (Petrol)</option>
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="DPK">DPK (Kerosene)</option>
                    <option value="LPG">LPG (Gas)</option>
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Liters Capacity" htmlFor="et_cap" error={editTankForm.formState.errors.capacity?.message}>
                    <Controller
                      name="capacity"
                      control={editTankForm.control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          id="et_cap"
                          placeholder="e.g. 45000"
                          value={field.value as string | number}
                          onChange={(e: any) => field.onChange(e.target.value)}
                          prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label={
                      <div className="flex items-center justify-between">
                        <span>Current Stock (L)</span>
                        {editingTankHasRecords && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-normal">
                            <Lock className="size-3" /> Managed by ops
                          </span>
                        )}
                      </div>
                    }
                    htmlFor="et_liters"
                    error={editTankForm.formState.errors.currentLiters?.message}
                  >
                    <Controller
                      name="currentLiters"
                      control={editTankForm.control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          id="et_liters"
                          disabled={editingTankHasRecords}
                          placeholder="e.g. 15000"
                          value={(field.value ?? "") as string | number}
                          onChange={(e: any) => field.onChange(e.target.value)}
                          prefixIcon={<Flame className="w-4 h-4 text-emerald-500" />}
                          className={editingTankHasRecords ? "opacity-60 bg-muted/50 cursor-not-allowed pointer-events-none" : ""}
                        />
                      )}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Water level (L, optional)" htmlFor="et_water" error={editTankForm.formState.errors.waterLevel?.message}>
                    <Controller
                      name="waterLevel"
                      control={editTankForm.control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          id="et_water"
                          placeholder="e.g. 12"
                          value={(field.value ?? "") as string | number}
                          onChange={(e: any) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Temperature (°C, optional)" htmlFor="et_temp" error={editTankForm.formState.errors.temperature?.message}>
                    <Controller
                      name="temperature"
                      control={editTankForm.control}
                      render={({ field }) => (
                        <FormattedNumberInput
                          id="et_temp"
                          placeholder="e.g. 28"
                          value={(field.value ?? "") as string | number}
                          onChange={(e: any) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                  </FormField>
                </div>

                {apiError && <p className="text-xs text-red-600">{apiError}</p>}

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog} disabled={editTankForm.formState.isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={editTankForm.formState.isSubmitting} className="gap-2">
                    {editTankForm.formState.isSubmitting ? <><SpinnerEllipsis /><span>Saving...</span></> : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

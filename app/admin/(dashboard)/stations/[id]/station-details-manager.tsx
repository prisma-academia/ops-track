"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, formatHumanReadableDate, formatShortCurrency } from "@/lib/utils";
import { z } from "zod";
import { apiPost, apiPatch } from "@/lib/client/api";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { AssetTank } from "@/components/asset-tank";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import nigerianLocations from "@/constant/nigerian-locations.json";

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
  console.log("Station Details Data:", station);

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
      capacity: 0
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

  const openAddPumpDialogForTank = (tankId: string) => {
    const nextPumpIndex = (station.pumps?.length || 0) + 1;
    pumpForm.reset({
      name: `PUMP ${nextPumpIndex}`,
      tankId: tankId,
      nozzles: [{ name: "Nozzle A" }]
    });
    setConfigTab("addPump");
    setActiveDialog("config");
  };

  const openConfigDialog = () => {
    openAddTankDialog();
  };

  // ── Server-paginated queries for each tab ──
  const dippingsQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${station.id}/dippings`,
    syncWithUrl: false,
    enabled: activeTab === "dippings",
  });
  const shiftsQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${station.id}/shifts`,
    syncWithUrl: false,
    enabled: activeTab === "shifts",
  });
  const waybillsQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${station.id}/waybills`,
    syncWithUrl: false,
    enabled: activeTab === "waybills",
  });
  const expensesQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${station.id}/expenses`,
    syncWithUrl: false,
    enabled: activeTab === "expenses",
  });
  const salesQuery = usePaginatedQuery<any>({
    baseUrl: `/api/tenant/stations/${station.id}/sales-logs`,
    syncWithUrl: false,
    enabled: activeTab === "sales",
  });

  // ── Column definitions ──
  const dippingsColumns: ColumnDef<any>[] = [
    {
      accessorKey: "recorded_at",
      header: "Date & Time",
      cell: ({ row }) => (
        <span className="text-foreground/90">{formatHumanReadableDate(row.original.recorded_at || row.original.recordedAt)}</span>
      ),
    },
    {
      id: "tank_name",
      header: "Tank",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.tank_name || row.original.tank?.name || "—"}</span>
      ),
    },
    {
      id: "product_type",
      header: "Product",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.product_type || row.original.tank?.productType || "—"}</span>
      ),
    },
    {
      id: "reason",
      header: () => <div className="text-center">Reason / Type</div>,
      cell: ({ row }) => {
        const o = row.original;
        const reason = o.reason || "ROUTINE";
        const isPriceChange = reason === "PRICE_CHANGE";
        const isEod = reason === "END_OF_DAY";

        return (
          <div className="flex flex-col items-center gap-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isPriceChange
                  ? "text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30"
                  : isEod
                  ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                  : "text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-900/30"
              )}
            >
              {reason.replace(/_/g, " ")}
            </Badge>
            {o.closingIndex > 0 && (
              <span className="text-[9px] text-muted-foreground font-mono">Closing #{o.closingIndex}</span>
            )}
          </div>
        );
      },
    },
    {
      id: "price",
      header: () => <div className="text-right whitespace-nowrap">Unit Price</div>,
      cell: ({ row }) => {
        const o = row.original;
        if (o.pricePerLiter != null) {
          return (
            <div className="text-right font-mono text-xs text-foreground whitespace-nowrap">
              <div>₦{Number(o.pricePerLiter).toLocaleString()}/L</div>
              {o.newPricePerLiter != null && (
                <div className="text-[10px] text-indigo-600 font-semibold">New: ₦{Number(o.newPricePerLiter).toLocaleString()}/L</div>
              )}
            </div>
          );
        }
        return <div className="text-right text-muted-foreground text-xs">—</div>;
      },
    },
    {
      id: "dip_levels",
      header: () => <div className="text-right whitespace-nowrap">Dip Levels (Op / Cl)</div>,
      cell: ({ row }) => {
        const o = row.original;
        const productType = o.product_type || o.tank?.productType;
        const unit = productType === "LPG" ? "KG" : "L";

        if (o.openingLiters != null) {
          return (
            <div className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
              <div>Op: {Number(o.openingLiters).toLocaleString()} {unit}</div>
              {o.closingLiters != null ? (
                <div>Cl: {Number(o.closingLiters).toLocaleString()} {unit}</div>
              ) : (
                <div className="text-amber-600 font-semibold">Active Open</div>
              )}
            </div>
          );
        }

        const liters = Number(o.dipping_liters ?? o.dippingLiters ?? 0);
        return <div className="text-right font-mono text-xs text-foreground">{liters.toLocaleString()} {unit}</div>;
      },
    },
    {
      id: "volume_and_revenue",
      header: () => <div className="text-right whitespace-nowrap">Sold & Revenue</div>,
      cell: ({ row }) => {
        const o = row.original;
        const productType = o.product_type || o.tank?.productType;
        const unit = productType === "LPG" ? "KG" : "L";

        if (o.litersSold != null) {
          return (
            <div className="text-right whitespace-nowrap">
              <div className="text-xs font-semibold text-emerald-600 font-mono">
                {Number(o.litersSold).toLocaleString()} {unit}
              </div>
              {o.revenue != null && (
                <div className="text-xs font-bold text-foreground font-mono">
                  {formatShortCurrency(Number(o.revenue))}
                </div>
              )}
            </div>
          );
        }

        return <div className="text-right text-muted-foreground text-xs">—</div>;
      },
    },
  ];

  const shiftsColumns: ColumnDef<any>[] = [
    {
      accessorKey: "shiftDate",
      header: "Date",
      cell: ({ row }) => <span className="text-foreground/90">{formatHumanReadableDate(row.original.shiftDate)}</span>,
    },
    {
      id: "attendant",
      header: "Attendant",
      cell: ({ row }) => {
        const a = row.original.attendant;
        return <span className="font-medium text-foreground">{a ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() : "Unknown"}</span>;
      },
    },
    {
      id: "dispenser",
      header: "Dispenser",
      cell: ({ row }) => {
        const nozzle = row.original.nozzle;
        const pump = nozzle?.pump;
        return <span className="text-muted-foreground">{pump?.name ?? "—"} - {nozzle?.name ?? "—"}</span>;
      },
    },
    {
      id: "meters",
      header: () => <div className="text-right">Meters (Op / Cl)</div>,
      cell: ({ row }) => {
        const active = row.original.closingMeter === null;
        return (
          <div className="text-right font-mono text-xs text-muted-foreground">
            {Number(row.original.openingMeter).toLocaleString()} / {active ? "—" : Number(row.original.closingMeter).toLocaleString()}
          </div>
        );
      },
    },
    {
      id: "volume_sold",
      header: () => <div className="text-right">Volume Sold</div>,
      cell: ({ row }) => {
        const active = row.original.closingMeter === null;
        return <div className="text-right font-semibold text-foreground">{active ? "—" : `${Number(row.original.litersSold).toLocaleString()} L`}</div>;
      },
    },
    {
      id: "status",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const active = row.original.closingMeter === null;
        const reconciled = !!row.original.reconciledAt;
        return (
          <div className="text-center">
            {active ? (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">Active</Badge>
            ) : reconciled ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">Reconciled</Badge>
            ) : (
              <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50 dark:bg-stone-900/30 dark:border-stone-800">Closed</Badge>
            )}
          </div>
        );
      },
    },
  ];

  const waybillsColumns: ColumnDef<any>[] = [
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-foreground/90">{formatHumanReadableDate(row.original.waybill?.dispatchedAt)}</span>,
    },
    {
      id: "number",
      header: "Waybill No.",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.waybill?.number}</span>,
    },
    {
      id: "driver",
      header: "Driver / Truck",
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.waybill?.driverName} • {row.original.waybill?.truckPlate}</span>,
    },
    {
      id: "volume_dispatched",
      header: () => <div className="text-right">Volume Dispatched</div>,
      cell: ({ row }) => <div className="text-right font-mono font-medium">{Number(row.original.litersToDispense || 0).toLocaleString()} L</div>,
    },
    {
      id: "variance",
      header: () => <div className="text-right">Variance</div>,
      cell: ({ row }) => {
        const dispatched = Number(row.original.litersToDispense) || 0;
        const received = row.original.litersReceived ? Number(row.original.litersReceived) : null;
        const variance = received !== null ? received - dispatched : null;
        return (
          <div className="text-right font-mono font-medium">
            {variance === null ? <span className="text-muted-foreground">—</span> : (
              <span className={variance < 0 ? "text-rose-600" : "text-emerald-600"}>
                {variance > 0 ? "+" : ""}{variance.toLocaleString()} L
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className={
            row.original.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" :
            row.original.status === "IN_TRANSIT" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30" : ""
          }>{row.original.status}</Badge>
        </div>
      ),
    },
  ];

  const expensesColumns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => <span className="text-foreground/90">{formatHumanReadableDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="secondary" className="text-[10px] font-medium">{row.original.category}</Badge>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-muted-foreground truncate max-w-xs block">{row.original.description}</span>,
    },
    {
      id: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">₦{Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className={
            row.original.status === "APPROVED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" :
            row.original.status === "REJECTED" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30" :
            "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
          }>{row.original.status}</Badge>
        </div>
      ),
    },
  ];

  const salesColumns: ColumnDef<any>[] = [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ row }) => {
        const parts = formatHumanReadableDate(row.original.logDate).split(" ");
        return <span className="text-foreground/90">{parts.slice(0, 3).join(" ")}</span>;
      },
    },
    {
      accessorKey: "productType",
      header: "Product",
      cell: ({ row }) => <Badge variant="secondary" className="text-[10px] font-medium font-mono">{row.original.productType}</Badge>,
    },
    {
      id: "volume_sold",
      header: () => <div className="text-right">Volume Sold</div>,
      cell: ({ row }) => <div className="text-right font-medium">{Number(row.original.litersSold).toLocaleString()} L</div>,
    },

    {
      id: "digital",
      header: () => <div className="text-right">POS / Transfer</div>,
      cell: ({ row }) => {
        const digital = Number(row.original.amountPos) + Number(row.original.amountTransfer);
        return <div className="text-right text-muted-foreground">₦{digital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      },
    },
    {
      id: "total",
      header: () => <div className="text-right">Total Revenue</div>,
      cell: ({ row }) => {
        const total = Number(row.original.amountPos) + Number(row.original.amountTransfer);
        return <div className="text-right font-bold text-foreground">₦{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const flags: string[] = [];

        return (
          <div className="flex flex-col items-center gap-1">
            {row.original.status === "APPROVED" ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] font-semibold">Approved</Badge>
            ) : row.original.status === "REJECTED" ? (
              <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 text-[10px] font-semibold">Rejected</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] font-semibold">Pending</Badge>
            )}

          </div>
        );
      },
    },
    {
      id: "recorded_by",
      header: () => <div className="text-center">Recorded By</div>,
      cell: ({ row }) => {
        const r = row.original.recordedBy;
        const recorder = r ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : "Unknown";
        return <div className="text-center text-muted-foreground">{recorder}</div>;
      },
    },
  ];

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
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/stations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl">Station Overview</CardTitle>
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

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-4 px-1.5 py-2 justify-start md:w-auto gap-1">
            <TabsTrigger value="overview" className="px-6 py-4 text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="dippings" className="px-6 py-4 text-[15px] font-semibold">Dippings</TabsTrigger>
            <TabsTrigger value="shifts" className="px-6 py-4 text-[15px] font-semibold">Shift Logs</TabsTrigger>
            <TabsTrigger value="waybills" className="px-6 py-4 text-[15px] font-semibold">Waybills</TabsTrigger>
            <TabsTrigger value="expenses" className="px-6 py-4 text-[15px] font-semibold">Expenses</TabsTrigger>
            <TabsTrigger value="sales" className="px-6 py-4 text-[15px] font-semibold">Sales</TabsTrigger>
          </TabsList>
        </div>

        {/* ---------------- OVERVIEW TAB ---------------- */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Infrastructure Overview</h2>
              <p className="text-xs text-muted-foreground">Storage tanks and dispensing pumps layout mapping</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openAddTankDialog} className="h-8 gap-1.5 text-xs bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-foreground">
                <Plus size={14} className="text-primary" />
                Add Tank
              </Button>
              <Button size="sm" variant="outline" onClick={openAddPumpDialog} className="h-8 gap-1.5 text-xs bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-foreground">
                <Plus size={14} className="text-primary" />
                Add Pump / Dispenser
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-12 lg:gap-16">
            {station.tanks.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-16 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 text-center">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Droplet size={24} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">No Infrastructure Configured</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-6">
                  Get started by adding storage fuel tanks and pump dispensers to map out this retail station's physical layout.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={openAddTankDialog} className="gap-2 shadow-xs text-xs h-9">
                    <Plus size={15} />
                    Add Storage Tank
                  </Button>
                  <Button variant="outline" onClick={openAddPumpDialog} className="gap-2 text-xs h-9 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-foreground">
                    <Plus size={15} />
                    Add Pump / Dispenser
                  </Button>
                </div>
              </div>
            ) : (
              station.tanks.map((tank: any) => {
                const currentLitres = Number(tank.currentLiters || 0);

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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/10 lg:ml-8">
                          <p className="text-xs text-muted-foreground italic">No dispensers connected to this tank</p>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openAddPumpDialogForTank(tank.id)}
                            className="h-8 gap-1.5 text-xs bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-foreground"
                          >
                            <Plus size={13} className="text-primary" />
                            Connect Pump
                          </Button>
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
          <DataTable
            columns={dippingsColumns}
            data={(dippingsQuery.data ?? [])}
            isLoading={dippingsQuery.isLoading}
            serverPagination={{
              ...dippingsQuery.meta,
              onPageChange: dippingsQuery.setPage,
              onPageSizeChange: dippingsQuery.setPageSize,
            }}
            empty="No dipping records found."
          />
        </TabsContent>

        {/* ---------------- SHIFTS TAB ---------------- */}
        <TabsContent value="shifts" className="mt-0 animate-in fade-in duration-500">
          <DataTable
            columns={shiftsColumns}
            data={(shiftsQuery.data ?? [])}
            isLoading={shiftsQuery.isLoading}
            serverPagination={{
              ...shiftsQuery.meta,
              onPageChange: shiftsQuery.setPage,
              onPageSizeChange: shiftsQuery.setPageSize,
            }}
            empty="No shift logs found."
          />
        </TabsContent>

        {/* ---------------- WAYBILLS TAB ---------------- */}
        <TabsContent value="waybills" className="mt-0 animate-in fade-in duration-500">
          <DataTable
            columns={waybillsColumns}
            data={(waybillsQuery.data ?? [])}
            isLoading={waybillsQuery.isLoading}
            serverPagination={{
              ...waybillsQuery.meta,
              onPageChange: waybillsQuery.setPage,
              onPageSizeChange: waybillsQuery.setPageSize,
            }}
            empty="No waybill records found."
          />
        </TabsContent>

        {/* ---------------- EXPENSES TAB ---------------- */}
        <TabsContent value="expenses" className="mt-0 animate-in fade-in duration-500">
          <DataTable
            columns={expensesColumns}
            data={(expensesQuery.data ?? [])}
            isLoading={expensesQuery.isLoading}
            serverPagination={{
              ...expensesQuery.meta,
              onPageChange: expensesQuery.setPage,
              onPageSizeChange: expensesQuery.setPageSize,
            }}
            empty="No expense records found."
          />
        </TabsContent>

        {/* ---------------- SALES TAB ---------------- */}
        <TabsContent value="sales" className="mt-0 animate-in fade-in duration-500">
          <DataTable
            columns={salesColumns}
            data={(salesQuery.data ?? [])}
            isLoading={salesQuery.isLoading}
            serverPagination={{
              ...salesQuery.meta,
              onPageChange: salesQuery.setPage,
              onPageSizeChange: salesQuery.setPageSize,
            }}
            empty="No sales records found."
          />
        </TabsContent>

      </Tabs>

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

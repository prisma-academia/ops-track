"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ChevronsUpDown, Check } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { cn } from "@/lib/utils";
import { NumberInput } from "@/components/ui/number-input";

const CreateWaybillSchema = z.object({
  number: z.string().min(1, "Waybill number is required"),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive("Must be positive"),
  truckPlate: z.string().min(1, "Truck plate is required").toUpperCase(),
  driverName: z.string().min(1, "Driver name is required"),
  driverPhone: z.string().optional().nullable(),
  supplier: z.string().min(1, "Supplier is required"),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
  deliveryDatetime: z.string().optional().nullable(),
  allocations: z.array(z.object({
    stationId: z.string().min(1, "Station is required"),
    litersToDispense: z.coerce.number().positive("Must be positive"),
    costPerLiter: z.coerce.number().positive("Must be positive"),
    transportationCost: z.coerce.number().nonnegative("Must be non-negative"),
  })).min(1, "At least one station assignment is required"),
}).refine((data) => {
  const sum = data.allocations.reduce((acc, a) => acc + Number(a.litersToDispense), 0);
  return Math.abs(sum - data.litersLoaded) < 0.01;
}, {
  message: "The sum of station allocations must equal the total liters loaded.",
  path: ["litersLoaded"]
}).refine((data) => {
  const ids = data.allocations.map(a => a.stationId);
  return new Set(ids).size === ids.length;
}, {
  message: "Each station can only be assigned once per waybill.",
  path: ["allocations"]
});

type LookupItem = { id: string; name: string };

export function CreateWaybillForm({ stations, prefillRequests }: { stations: { id: string; name: string; code: string }[], prefillRequests?: any[] }) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  // Lookups State
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [depots, setDepots] = useState<LookupItem[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<LookupItem[]>([]);

  // Add Lookup Modal State
  const [lookupDialog, setLookupDialog] = useState<{ isOpen: boolean; type: "supplier" | "depot" | "transportCompany"; label: string } | null>(null);
  const [newLookupName, setNewLookupName] = useState("");
  const [isAddingLookup, setIsAddingLookup] = useState(false);

  // Lookup Combobox State
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openDepot, setOpenDepot] = useState(false);
  const [openTransport, setOpenTransport] = useState(false);

  // Per-allocation station combobox open state
  const [openStationIndex, setOpenStationIndex] = useState<number | null>(null);

  const initialAllocations = prefillRequests && prefillRequests.length > 0
    ? prefillRequests.map(r => ({
        stationId: r.stationId,
        stationRequestId: r.id,
        litersToDispense: Number(r.requestedLiters),
        costPerLiter: 0,
        transportationCost: 0,
      }))
    : [{ stationId: "", litersToDispense: 0, costPerLiter: 0, transportationCost: 0 }];

  const initialLiters = prefillRequests && prefillRequests.length > 0
    ? prefillRequests.reduce((sum, r) => sum + Number(r.requestedLiters), 0)
    : 0;

  const initialProduct = prefillRequests && prefillRequests.length > 0
    ? prefillRequests[0].productType
    : "PMS";

  const form = useForm<z.infer<typeof CreateWaybillSchema>>({
    resolver: zodResolver(CreateWaybillSchema) as any,
    defaultValues: {
      productType: initialProduct,
      litersLoaded: initialLiters,
      allocations: initialAllocations
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  const watchAllocations = form.watch("allocations");
  const watchProductType = form.watch("productType");
  const watchLitersLoaded = form.watch("litersLoaded");

  // Derived allocation totals (real-time)
  const totalAllocated = (watchAllocations ?? []).reduce(
    (acc, curr) => acc + (parseFloat(curr?.litersToDispense as any) || 0), 0
  );
  const remaining = (parseFloat(watchLitersLoaded as any) || 0) - totalAllocated;
  const isOverAllocated = remaining < -0.01;
  const isExactMatch = Math.abs(remaining) < 0.01 && totalAllocated > 0;

  // Derived summary calculations
  const summaryProductCost = (watchAllocations ?? []).reduce(
    (acc, curr) => acc + ((parseFloat(curr?.litersToDispense as any) || 0) * (parseFloat(curr?.costPerLiter as any) || 0)),
    0
  );
  const summaryTransCost = (watchAllocations ?? []).reduce(
    (acc, curr) => acc + (parseFloat(curr?.transportationCost as any) || 0),
    0
  );
  const summaryGrandTotal = summaryProductCost + summaryTransCost;

  const litersLoadedError = form.formState.errors.litersLoaded?.message;
  const allocationsError = form.formState.errors.allocations?.message;

  useEffect(() => {
    if (litersLoadedError) {
      toast.error(litersLoadedError);
    }
  }, [litersLoadedError]);

  useEffect(() => {
    if (allocationsError) {
      toast.error(allocationsError);
    }
  }, [allocationsError]);

  // Fetch Lookups
  useEffect(() => {
    async function fetchLookups() {
      try {
        const res = await fetch("/api/tenant/waybills/lookups");
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
          setDepots(data.depots || []);
          setTransportCompanies(data.transportCompanies || []);
        }
      } catch (e) {
        console.error("Failed to fetch lookups", e);
      }
    }
    fetchLookups();
  }, []);

  // Auto-generate Waybill Number from the first station code
  const firstStationId = watchAllocations?.[0]?.stationId;

  useEffect(() => {
    if (watchProductType) {
      const station = stations.find((s) => s.id === firstStationId);
      const rawCode = station ? station.code : "DISP";
      // Strip trailing numeric segment (e.g. HOT-001 → HOT)
      const prefix = rawCode.replace(/-?\d+$/, "");
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const randomNum = Math.floor(Math.random() * 900) + 100;
      form.setValue("number", `WB-${prefix}-${today}-${watchProductType}-${randomNum}`, { shouldValidate: true });
    }
  }, [firstStationId, watchProductType, stations, form]);

  const handleAddLookup = async () => {
    if (!lookupDialog || !newLookupName.trim()) return;
    setIsAddingLookup(true);
    try {
      const res = await fetch("/api/tenant/waybills/lookups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: lookupDialog.type, name: newLookupName.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        const created = result.data;
        if (lookupDialog.type === "supplier") {
          setSuppliers([...suppliers, created]);
          form.setValue("supplier", created.name, { shouldValidate: true });
        } else if (lookupDialog.type === "depot") {
          setDepots([...depots, created]);
          form.setValue("depot", created.name, { shouldValidate: true });
        } else if (lookupDialog.type === "transportCompany") {
          setTransportCompanies([...transportCompanies, created]);
          form.setValue("transportCompany", created.name, { shouldValidate: true });
        }
        setLookupDialog(null);
        setNewLookupName("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingLookup(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof CreateWaybillSchema>) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/waybills", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      router.push("/admin/waybills");
      router.refresh();
    }
  };

  const renderLookupSelect = (
    fieldValue: string | null | undefined,
    onChange: (value: string) => void,
    options: LookupItem[],
    placeholder: string,
    type: "supplier" | "depot" | "transportCompany",
    label: string,
    openState: boolean,
    setOpenState: (o: boolean) => void,
    hasError?: boolean
  ) => {
    return (
      <Popover open={openState} onOpenChange={setOpenState}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-between font-normal ${!fieldValue ? "text-muted-foreground" : ""} ${hasError ? "border-destructive" : ""}`}
          >
            <span className="truncate">{fieldValue || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.name.toLowerCase()}
                    onSelect={() => {
                      onChange(opt.name);
                      setOpenState(false);
                    }}
                    data-checked={fieldValue === opt.name}
                  >
                    {opt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2 text-sm font-medium"
                onClick={() => {
                  setLookupDialog({ isOpen: true, type, label });
                  setOpenState(false);
                }}
              >
                + Other (Add New)
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="w-full">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Column 1: General Info */}
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-semibold text-lg text-foreground">General Information</h3>
            {form.watch("number") && (
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{form.watch("number")}</span>
            )}
          </div>

          {/* Waybill Number — full width */}
          <div className="space-y-2">
            <Label className={form.formState.errors.number ? "text-destructive" : ""}>Waybill Number *</Label>
            <Input
              placeholder="e.g. WB-998811"
              disabled
              {...form.register("number")}
              className={form.formState.errors.number ? "border-destructive" : ""}
            />
          </div>

          {/* Product Type + Total Liters — same row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={form.formState.errors.productType ? "text-destructive" : ""}>Product Type *</Label>
              <Controller
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={form.formState.errors.productType ? "border-destructive w-full" : "w-full"}>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                      <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                      <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
                      <SelectItem value="LPG">LPG (Gas)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className={form.formState.errors.litersLoaded ? "text-destructive" : ""}>Total Loaded Liters *</Label>
              <Controller
                control={form.control}
                name="litersLoaded"
                render={({ field }) => (
                  <NumberInput
                    placeholder="e.g. 33,000"
                    value={field.value}
                    onChange={field.onChange}
                    maxDigits={6}
                    className={form.formState.errors.litersLoaded ? "border-destructive" : ""}
                  />
                )}
              />
            </div>
          </div>

          {/* Receipt-style Waybill Summary */}
          <div className="border-t-2 border-dashed border-muted/80 pt-6 mt-6 space-y-4">
            <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">Waybill Summary Receipt</h4>
            
            <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-muted-foreground/20 space-y-3 font-mono text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-dashed pb-2">
                <span>Product Type:</span>
                <span className="font-bold text-foreground">{watchProductType}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Loaded:</span>
                <span className="font-bold text-foreground">{(parseFloat(watchLitersLoaded as any) || 0).toLocaleString()} L</span>
              </div>
              <div className="flex justify-between">
                <span>Total Allocated:</span>
                <span className="font-bold text-foreground">{totalAllocated.toLocaleString()} L</span>
              </div>

              <div className="border-t border-dashed my-2 pt-2 space-y-2">
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider pb-1">Allocations Breakdown:</div>
                {(watchAllocations ?? []).map((alloc, idx) => {
                  const station = stations.find(s => s.id === alloc.stationId);
                  const volume = parseFloat(alloc.litersToDispense as any) || 0;
                  const cost = parseFloat(alloc.costPerLiter as any) || 0;
                  const trans = parseFloat(alloc.transportationCost as any) || 0;
                  const subtotal = (volume * cost) + trans;

                  return (
                    <div key={idx} className="flex justify-between items-start text-[11px] gap-4">
                      <span className="truncate max-w-[150px]">
                        {station ? station.name : `Station #${idx + 1}`}
                      </span>
                      <span className="text-foreground text-right shrink-0">
                        {volume.toLocaleString()}L @ ₦{cost.toFixed(2)} + ₦{trans.toLocaleString()} = <span className="font-semibold">₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 border-double border-muted-foreground/30 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs">
                  <span>Product Cost:</span>
                  <span className="font-semibold text-foreground">₦{summaryProductCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Transport Cost:</span>
                  <span className="font-semibold text-foreground">₦{summaryTransCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-primary pt-1 border-t border-dashed border-muted-foreground/20">
                  <span>GRAND TOTAL:</span>
                  <span>₦{summaryGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Supplier / Depot / Transport */}
        <div className="space-y-6">
          <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg border-b pb-4 text-foreground">Supply Information</h3>

            {/* Supplier & Depot */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={form.formState.errors.supplier ? "text-destructive" : ""}>Supplier *</Label>
                <Controller
                  control={form.control}
                  name="supplier"
                  render={({ field }) => renderLookupSelect(field.value, field.onChange, suppliers, "Select Supplier", "supplier", "Supplier", openSupplier, setOpenSupplier, !!form.formState.errors.supplier)}
                />
                {form.formState.errors.supplier && (
                  <p className="text-xs text-destructive">{form.formState.errors.supplier.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Depot</Label>
                <Controller
                  control={form.control}
                  name="depot"
                  render={({ field }) => renderLookupSelect(field.value, field.onChange, depots, "Select Depot", "depot", "Depot", openDepot, setOpenDepot)}
                />
              </div>
            </div>

            {/* Transport Company — full width */}
            <div className="space-y-2">
              <Label>Transport Company</Label>
              <Controller
                control={form.control}
                name="transportCompany"
                render={({ field }) => renderLookupSelect(field.value, field.onChange, transportCompanies, "Select Transporter", "transportCompany", "Transport Company", openTransport, setOpenTransport)}
              />
            </div>
          </div>

          {/* Logistic Information — truck, driver, arrival */}
          <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6">
            <h3 className="font-semibold text-lg border-b pb-4 text-foreground">Logistic Information</h3>

            {/* Truck Plate + Driver Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={form.formState.errors.truckPlate ? "text-destructive" : ""}>Truck Plate Number *</Label>
                <Input
                  placeholder="e.g. LAG-901-AA"
                  {...form.register("truckPlate")}
                  className={form.formState.errors.truckPlate ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label className={form.formState.errors.driverName ? "text-destructive" : ""}>Driver Name *</Label>
                <Input
                  placeholder="e.g. Alabi Kazeem"
                  {...form.register("driverName")}
                  className={form.formState.errors.driverName ? "border-destructive" : ""}
                />
              </div>
            </div>

            {/* Driver Phone + Expected Arrival — same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Phone Number</Label>
                <Input
                  placeholder="e.g. +2348012345678"
                  {...form.register("driverPhone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDatetime">Expected Arrival Date/Time</Label>
                <Input
                  id="deliveryDatetime"
                  type="datetime-local"
                  onChange={(e) => {
                    form.setValue(
                      "deliveryDatetime",
                      e.target.value ? new Date(e.target.value).toISOString() : null
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Allocations Block — full width */}
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-semibold text-lg text-foreground">Station Assignments & Volume Allocation</h3>
            <div className="flex items-center gap-4">
              {/* Live allocation meter */}
              {(parseFloat(watchLitersLoaded as any) || 0) > 0 && (
                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-lg border ${
                  isOverAllocated
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : isExactMatch
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}>
                  <span>
                    {totalAllocated.toLocaleString()} / {(parseFloat(watchLitersLoaded as any) || 0).toLocaleString()} L
                  </span>
                  <span className="text-xs opacity-75">
                    {isOverAllocated
                      ? `▲ ${Math.abs(remaining).toLocaleString()} over`
                      : isExactMatch
                      ? "✓ Exact"
                      : `${remaining.toLocaleString()} remaining`}
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ stationId: "", litersToDispense: 0, costPerLiter: 0, transportationCost: 0 })}
              >
                + Add Station
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const errorForField = form.formState.errors.allocations?.[index];
              const isStationOpen = openStationIndex === index;
              const currentStationId = watchAllocations?.[index]?.stationId;
              const selectedStation = stations.find(s => s.id === currentStationId);

              return (
                <div key={field.id} className="relative p-5 border rounded-xl bg-muted/20 space-y-4">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                      onClick={() => remove(index)}
                    >
                      ✕
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-start">
                    {/* Station — Command combobox with search */}
                    <div className="space-y-2">
                      <Label className={errorForField?.stationId ? "text-destructive" : ""}>
                        Station *
                      </Label>
                      <Controller
                        control={form.control}
                        name={`allocations.${index}.stationId`}
                        render={({ field: stationField }) => (
                          <Popover
                            open={isStationOpen}
                            onOpenChange={(open) => setOpenStationIndex(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !stationField.value && "text-muted-foreground",
                                  errorForField?.stationId && "border-destructive"
                                )}
                              >
                                <span className="truncate">
                                  {selectedStation
                                    ? `${selectedStation.name} (${selectedStation.code})`
                                    : "Search station..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search station by name or code..." />
                                <CommandList className="max-h-[220px]">
                                  <CommandEmpty>No station found.</CommandEmpty>
                                  <CommandGroup>
                                    {stations.map((s) => (
                                      <CommandItem
                                        key={s.id}
                                        value={`${s.name} ${s.code}`.toLowerCase()}
                                        onSelect={() => {
                                          stationField.onChange(s.id);
                                          setOpenStationIndex(null);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            stationField.value === s.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="font-medium">{s.name}</span>
                                        <span className="ml-1.5 text-xs text-muted-foreground font-mono">({s.code})</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errorForField?.stationId && (
                        <p className="text-xs text-destructive">{errorForField.stationId.message}</p>
                      )}
                    </div>

                    {/* Volume allocation */}
                    <div className="space-y-2">
                      <Label className={errorForField?.litersToDispense ? "text-destructive" : ""}>Liters to Dispense *</Label>
                      <Controller
                        control={form.control}
                        name={`allocations.${index}.litersToDispense`}
                        render={({ field }) => (
                          <NumberInput
                            placeholder="e.g. 15,000"
                            value={field.value}
                            onChange={(val: any) => {
                              field.onChange(val);
                              // Auto-calculate transport cost
                              const cost = parseFloat(form.getValues(`allocations.${index}.costPerLiter`) as any) || 0;
                              const liters = parseFloat(val) || 0;
                              form.setValue(`allocations.${index}.transportationCost`, cost * liters, { shouldValidate: true });
                            }}
                            maxDigits={6}
                            className={errorForField?.litersToDispense ? "border-destructive" : ""}
                          />
                        )}
                      />
                      {errorForField?.litersToDispense && (
                        <p className="text-xs text-destructive">{errorForField.litersToDispense.message}</p>
                      )}
                    </div>

                    {/* Cost per liter */}
                    <div className="space-y-2">
                      <Label className={errorForField?.costPerLiter ? "text-destructive" : ""}>Cost Per Liter (₦) *</Label>
                      <Controller
                        control={form.control}
                        name={`allocations.${index}.costPerLiter`}
                        render={({ field }) => (
                          <NumberInput
                            placeholder="e.g. 980.00"
                            value={field.value}
                            onChange={(val: any) => {
                              field.onChange(val);
                              // Auto-calculate transport cost
                              const liters = parseFloat(form.getValues(`allocations.${index}.litersToDispense`) as any) || 0;
                              const cost = parseFloat(val) || 0;
                              form.setValue(`allocations.${index}.transportationCost`, cost * liters, { shouldValidate: true });
                            }}
                            maxDigits={7}
                            className={errorForField?.costPerLiter ? "border-destructive" : ""}
                          />
                        )}
                      />
                      {errorForField?.costPerLiter && (
                        <p className="text-xs text-destructive">{errorForField.costPerLiter.message}</p>
                      )}
                    </div>

                    {/* Transportation Cost */}
                    <div className="space-y-2">
                      <Label className={errorForField?.transportationCost ? "text-destructive" : ""}>Trans. Cost (₦) *</Label>
                      <Controller
                        control={form.control}
                        name={`allocations.${index}.transportationCost`}
                        render={({ field }) => (
                          <NumberInput
                            placeholder="Auto-calculated"
                            value={field.value}
                            onChange={field.onChange}
                            disabled={true}
                            maxDigits={10}
                            className={cn("bg-muted/50 cursor-not-allowed", errorForField?.transportationCost ? "border-destructive" : "")}
                          />
                        )}
                      />
                      {errorForField?.transportationCost && (
                        <p className="text-xs text-destructive">{errorForField.transportationCost.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Submit Block */}
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6 lg:col-span-2">
          {apiError && <p className="text-sm text-red-600 font-medium">{apiError}</p>}

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/waybills")}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-32">
              {form.formState.isSubmitting ? <SpinnerEllipsis /> : "Create Waybill"}
            </Button>
          </div>
        </div>

      </form>

      {/* Add Lookup Modal */}
      <Dialog open={!!lookupDialog} onOpenChange={(open) => !open && setLookupDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New {lookupDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder={`Enter ${lookupDialog?.label} name`}
                value={newLookupName}
                onChange={(e) => setNewLookupName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLookupDialog(null)}>Cancel</Button>
            <Button onClick={handleAddLookup} disabled={!newLookupName.trim() || isAddingLookup}>
              {isAddingLookup ? <SpinnerEllipsis /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

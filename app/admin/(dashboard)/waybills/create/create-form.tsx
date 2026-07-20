"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown, Check, Plus, Trash2, Calculator, FileText, Sparkles } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreateWaybillBaseSchema = z.object({
  number: z.string().min(1, "Waybill number is required").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive("Liters loaded must be greater than 0"),
  truckPlate: z.string().min(1, "Truck plate is required").max(20),
  driverName: z.string().min(1, "Driver name is required").max(100),
  driverPhone: z.string().optional().nullable(),
  supplier: z.string().min(1, "Supplier is required"),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
  allocations: z.array(
    z.object({
      stationId: z.string().min(1, "Station is required"),
      litersToDispense: z.coerce.number().positive("Liters to dispense must be greater than 0"),
      costPerLiter: z.coerce.number().positive("Cost per liter must be greater than 0"),
      transportationCost: z.coerce.number().nonnegative("Transportation cost cannot be negative"),
    })
  ).min(1, "At least one allocation is required"),
});

const CreateWaybillSchema = CreateWaybillBaseSchema.refine((data) => {
  const sum = data.allocations.reduce((acc, a) => acc + Number(a.litersToDispense || 0), 0);
  return Math.abs(sum - data.litersLoaded) < 0.01;
}, {
  message: "The sum of station allocations must equal the total liters loaded.",
  path: ["litersLoaded"]
});

type FormValues = z.infer<typeof CreateWaybillBaseSchema>;
type LookupItem = { id: string; name: string };

export function CreateWaybillForm({
  stations,
  initialSuppliers,
  initialDepots,
  initialTransportCompanies,
  tenantSlug,
}: {
  stations: { id: string; name: string; code: string }[];
  initialSuppliers: LookupItem[];
  initialDepots: LookupItem[];
  initialTransportCompanies: LookupItem[];
  tenantSlug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Lookups State
  const [suppliers, setSuppliers] = useState<LookupItem[]>(initialSuppliers);
  const [depots, setDepots] = useState<LookupItem[]>(initialDepots);
  const [transportCompanies, setTransportCompanies] = useState<LookupItem[]>(initialTransportCompanies);

  // Popover States
  const [openSupplierSelect, setOpenSupplierSelect] = useState(false);
  const [openDepotSelect, setOpenDepotSelect] = useState(false);
  const [openTransporterSelect, setOpenTransporterSelect] = useState(false);

  // Dialog State for adding lookup inline
  const [lookupDialog, setLookupDialog] = useState<{ type: "supplier" | "depot" | "transportCompany"; title: string } | null>(null);
  const [newLookupName, setNewLookupName] = useState("");
  const [isAddingLookup, setIsAddingLookup] = useState(false);

  const { register, handleSubmit, formState, setValue, watch, control } = useForm({
    resolver: zodResolver(CreateWaybillSchema),
    defaultValues: {
      number: "",
      productType: "" as any,
      litersLoaded: 0,
      truckPlate: "",
      driverName: "",
      driverPhone: "",
      supplier: "",
      depot: "",
      transportCompany: "",
      allocations: [
        {
          stationId: "",
          litersToDispense: 0,
          costPerLiter: 0,
          transportationCost: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });

  const watchNumber = watch("number") as string | undefined;
  const watchProductType = watch("productType") as string | undefined;
  const watchLitersLoaded = Number(watch("litersLoaded")) || 0;
  const watchSupplier = watch("supplier") as string | undefined;
  const watchDepot = watch("depot") as string | undefined;
  const watchTransportCompany = watch("transportCompany") as string | undefined;
  const watchAllocations = (watch("allocations") as any[]) || [];

  const firstAllocationStationId = watchAllocations?.[0]?.stationId;

  // Generate reference / waybill number
  const generateNumber = () => {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const selectedStation = stations.find(s => s.id === firstAllocationStationId);
    const stationPart = selectedStation
      ? selectedStation.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase()
      : "STN";
    const productPart = watchProductType || "PMS";
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setValue("number", `WB-${stationPart}-${today}-${productPart}-${randomNum}`, { shouldValidate: true });
  };

  // Auto-generate reference on product type or station change if empty or matches generated template
  useEffect(() => {
    const isGenerated = !watchNumber || /^WB-[A-Z]{3}-\d{8}-[A-Z]{3}-\d{3}$/.test(watchNumber);
    if (isGenerated && watchProductType) {
      generateNumber();
    }
  }, [watchProductType, firstAllocationStationId]);

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
          setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          setValue("supplier", created.name, { shouldValidate: true });
        } else if (lookupDialog.type === "depot") {
          setDepots((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          setValue("depot", created.name, { shouldValidate: true });
        } else if (lookupDialog.type === "transportCompany") {
          setTransportCompanies((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          setValue("transportCompany", created.name, { shouldValidate: true });
        }
        setLookupDialog(null);
        setNewLookupName("");
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create lookup item.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred while creating lookup item.");
    } finally {
      setIsAddingLookup(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ waybill: any }>("/api/tenant/waybills", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push("/admin/waybills");
    router.refresh();
  });

  const totalAllocatedLiters = watchAllocations.reduce((acc, curr) => acc + (Number(curr?.litersToDispense) || 0), 0);
  const remainingLiters = Math.max(0, watchLitersLoaded - totalAllocatedLiters);
  const sumMatches = Math.abs(totalAllocatedLiters - watchLitersLoaded) < 0.01;

  const renderLookupSelect = (
    fieldValue: string | null | undefined,
    onValueChange: (val: string) => void,
    options: LookupItem[],
    placeholder: string,
    type: "supplier" | "depot" | "transportCompany",
    label: string,
    openState: boolean,
    setOpenState: (o: boolean) => void
  ) => (
    <Popover open={openState} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between font-normal ${!fieldValue ? "text-muted-foreground" : ""}`}
        >
          <span className="truncate">{fieldValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="py-2 px-2">
              <p className="text-sm text-muted-foreground text-center">No {label.toLowerCase()} found.</p>
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={(val) => {
                    const actualName = options.find((o) => o.name.toLowerCase() === val.toLowerCase())?.name || val;
                    onValueChange(actualName);
                    setOpenState(false);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  {opt.name}
                  {fieldValue === opt.name && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2 text-sm font-medium cursor-pointer"
              onClick={() => {
                setLookupDialog({ type, title: `Add New ${label}` });
                setOpenState(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New {label}
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
        {/* Header section */}
        <Card className="border-border">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 cursor-pointer"
                onClick={() => router.push("/admin/waybills")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-xl">Create Waybill Manually</CardTitle>
              </div>
            </div>
            {watchNumber && (
              <div className="bg-muted px-4 py-1.5 rounded-full border border-border/50">
                <span className="text-xs font-medium text-muted-foreground mr-2 font-mono">WYB NO:</span>
                <span className="text-sm font-bold font-mono tracking-wider">{watchNumber}</span>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Waybill Metadata */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText size={16} />
                  Waybill Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className={formState.errors.supplier ? "text-destructive" : ""}>
                      Supplier*
                    </Label>
                    {renderLookupSelect(
                      watchSupplier,
                      (val) => setValue("supplier", val, { shouldValidate: true }),
                      suppliers,
                      "Select Supplier...",
                      "supplier",
                      "Supplier",
                      openSupplierSelect,
                      setOpenSupplierSelect
                    )}
                    {formState.errors.supplier && <p className="text-xs text-destructive">{formState.errors.supplier.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depot">Source Depot</Label>
                    {renderLookupSelect(
                      watchDepot,
                      (val) => setValue("depot", val, { shouldValidate: true }),
                      depots,
                      "Select Depot...",
                      "depot",
                      "Depot",
                      openDepotSelect,
                      setOpenDepotSelect
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productType" className={formState.errors.productType ? "text-destructive" : ""}>
                      Product Type*
                    </Label>
                    <Controller
                      control={control}
                      name="productType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger
                            id="productType"
                            className={`w-full ${formState.errors.productType ? "border-destructive" : ""}`}
                          >
                            <SelectValue placeholder="Select product type..." />
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
                    {formState.errors.productType && <p className="text-xs text-destructive">{formState.errors.productType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="litersLoaded" className={formState.errors.litersLoaded ? "text-destructive" : ""}>
                      Liters Loaded*
                    </Label>
                    <Controller
                      control={control}
                      name="litersLoaded"
                      render={({ field }) => (
                        <NumberInput
                          id="litersLoaded"
                          placeholder="e.g. 45000"
                          value={field.value}
                          onChange={field.onChange}
                          className={formState.errors.litersLoaded ? "border-destructive" : ""}
                        />
                      )}
                    />
                    {formState.errors.litersLoaded && <p className="text-xs text-destructive">{formState.errors.litersLoaded.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Logistics Info */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calculator size={16} />
                  Logistics & Partners
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transportCompany">Transport Company</Label>
                    {renderLookupSelect(
                      watchTransportCompany,
                      (val) => setValue("transportCompany", val, { shouldValidate: true }),
                      transportCompanies,
                      "Select Transporter...",
                      "transportCompany",
                      "Transport Company",
                      openTransporterSelect,
                      setOpenTransporterSelect
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="truckPlate" className={formState.errors.truckPlate ? "text-destructive" : ""}>
                      Truck Plate Number*
                    </Label>
                    <Input
                      id="truckPlate"
                      placeholder="e.g. LA-123-XY"
                      {...register("truckPlate")}
                      className={formState.errors.truckPlate ? "border-destructive" : ""}
                    />
                    {formState.errors.truckPlate && <p className="text-xs text-destructive">{formState.errors.truckPlate.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driverName" className={formState.errors.driverName ? "text-destructive" : ""}>
                      Driver Name*
                    </Label>
                    <Input
                      id="driverName"
                      placeholder="e.g. John Doe"
                      {...register("driverName")}
                      className={formState.errors.driverName ? "border-destructive" : ""}
                    />
                    {formState.errors.driverName && <p className="text-xs text-destructive">{formState.errors.driverName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverPhone" className={formState.errors.driverPhone ? "text-destructive" : ""}>
                      Driver Phone Number
                    </Label>
                    <Input
                      id="driverPhone"
                      placeholder="e.g. +234 801 234 5678"
                      {...register("driverPhone")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Station Allocations */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2 border-b border-border/30 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Plus size={16} />
                  Station Allocations
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1 cursor-pointer"
                  onClick={() =>
                    append({
                      stationId: "",
                      litersToDispense: 0,
                      costPerLiter: 0,
                      transportationCost: 0,
                    })
                  }
                >
                  <Plus size={14} /> Add Station
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-5 rounded-xl border border-border bg-muted/10 relative space-y-4 animate-in fade-in duration-300"
                  >
                    {/* Allocation Header */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                        Station Allocation #{index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 px-2.5 rounded-md gap-1 cursor-pointer transition-colors"
                          onClick={() => remove(index)}
                        >
                          <Trash2 size={14} /> Remove
                        </Button>
                      )}
                    </div>

                    {/* Inputs Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">Station*</Label>
                        <Controller
                          control={control}
                          name={`allocations.${index}.stationId`}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="Select station..." />
                              </SelectTrigger>
                              <SelectContent>
                                {stations.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({s.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {formState.errors.allocations?.[index]?.stationId && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            {formState.errors.allocations[index].stationId.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">Expected Liters*</Label>
                        <Controller
                          control={control}
                          name={`allocations.${index}.litersToDispense`}
                          render={({ field }) => (
                            <NumberInput
                              placeholder="Liters"
                              className="h-10"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        {formState.errors.allocations?.[index]?.litersToDispense && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            {formState.errors.allocations[index].litersToDispense.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">Cost/Liter (₦)*</Label>
                        <Controller
                          control={control}
                          name={`allocations.${index}.costPerLiter`}
                          render={({ field }) => (
                            <NumberInput
                              placeholder="Cost"
                              className="h-10"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        {formState.errors.allocations?.[index]?.costPerLiter && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            {formState.errors.allocations[index].costPerLiter.message}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">Transportation Cost (₦)*</Label>
                        <Controller
                          control={control}
                          name={`allocations.${index}.transportationCost`}
                          render={({ field }) => (
                            <NumberInput
                              placeholder="Trans. cost"
                              className="h-10"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        {formState.errors.allocations?.[index]?.transportationCost && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            {formState.errors.allocations[index].transportationCost.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {formState.errors.allocations?.root && (
                  <p className="text-xs text-destructive mt-3 font-medium">{formState.errors.allocations.root.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Summary Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} />
                Waybill Summary
              </h4>

              <div className="bg-muted/30 rounded-xl p-5 border border-dashed border-muted-foreground/20 space-y-5 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span>Waybill No:</span>
                  <span className="font-bold text-foreground font-mono">{watchNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-bold text-foreground">{watchProductType || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Liters Loaded:</span>
                  <span className="font-bold text-foreground">{Number(watchLitersLoaded).toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Liters Allocated:</span>
                  <span className="font-bold text-foreground">{Number(totalAllocatedLiters).toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className={`font-bold ${remainingLiters > 0 ? "text-amber-600" : "text-foreground"}`}>
                    {Number(remainingLiters).toLocaleString()} L
                  </span>
                </div>

                <div className="pt-2 border-t border-dashed">
                  <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-lg bg-background border font-semibold">
                    {sumMatches ? (
                      <>
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-600 text-[11px]">Allocations Match Loaded Liters</span>
                      </>
                    ) : (
                      <>
                        <div className="size-2 rounded-full bg-rose-600 animate-pulse" />
                        <span className="text-rose-600 text-[11px]">Allocations Must Equal Loaded Liters</span>
                      </>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-sans">
                    <p className="font-semibold">Submit Error:</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                )}

                {formState.errors.litersLoaded && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-sans">
                    <p className="font-semibold">Validation Error:</p>
                    <p className="mt-0.5">{formState.errors.litersLoaded.message}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={formState.isSubmitting || !sumMatches}
                    className="w-full h-10 rounded-full gap-2 cursor-pointer font-sans"
                  >
                    {formState.isSubmitting ? (
                      <>
                        <SpinnerEllipsis />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Create Waybill</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-full cursor-pointer font-sans"
                    onClick={() => router.push("/admin/waybills")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Lookup Addition Dialog */}
      {lookupDialog && (
        <Dialog open={!!lookupDialog} onOpenChange={(open) => !open && setLookupDialog(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{lookupDialog.title}</DialogTitle>
              <DialogDescription>
                Add a new {lookupDialog.type === "transportCompany" ? "transport company" : lookupDialog.type} to the system. It will be available for future waybills.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lookupName">Name</Label>
                <Input
                  id="lookupName"
                  value={newLookupName}
                  onChange={(e) => setNewLookupName(e.target.value)}
                  placeholder={`Enter ${lookupDialog.type === "transportCompany" ? "transport company" : lookupDialog.type} name`}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLookupDialog(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddLookup}
                disabled={isAddingLookup || !newLookupName.trim()}
              >
                {isAddingLookup ? <SpinnerEllipsis /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

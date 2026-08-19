"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Schema = z.object({
  name: z.string().min(2).max(100),
  transporterId: z.string().min(1, "Please select a transporter"),
  truckNumber: z.string().optional().or(z.literal("")),
  plateNumber: z.string().min(1, "Plate Number is required"),
  truckBrand: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
  truckType: z.string().min(1, "Truck Type is required"),
  fuelType: z.string().optional().or(z.literal("")),
  capacityLiters: z.coerce.number().positive("Capacity must be greater than 0"),
});

type Values = z.infer<typeof Schema>;

export function CreateTruckForm({
  transporters,
  truck,
}: {
  transporters: { id: string; name: string }[];
  truck?: any;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openTransporterSelect, setOpenTransporterSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: truck?.name || "",
      transporterId: truck?.transporterId || "",
      truckNumber: truck?.truckNumber || "",
      plateNumber: truck?.plateNumber || "",
      truckBrand: truck?.truckBrand || "",
      model: truck?.model || "",
      truckType: truck?.truckType || "",
      fuelType: truck?.fuelType || "",
      capacityLiters: truck?.capacityLiters ? Number(truck.capacityLiters) : 45000,
    },
  });

  const selectedTransporterId = watch("transporterId");
  const selectedTransporter = transporters.find((t) => t.id === selectedTransporterId);
  const watchPlateNumber = watch("plateNumber");
  const watchTruckNumber = watch("truckNumber");
  const watchName = watch("name");

  useEffect(() => {
    if (!truck) {
      if (watchPlateNumber) {
        setValue("name", `TRK-${watchPlateNumber.toUpperCase()}`, { shouldValidate: true });
        if (!watchTruckNumber) {
          setValue("truckNumber", `TN-${Math.floor(100000 + Math.random() * 900000)}`, { shouldValidate: true });
        }
      } else {
        setValue("name", "", { shouldValidate: true });
        setValue("truckNumber", "", { shouldValidate: true });
      }
    }
  }, [watchPlateNumber, watchTruckNumber, setValue, truck]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    if (truck?.id) {
      const res = await apiPatch<{ truck: { id: string } }>(`/api/tenant/fleet/trucks/${truck.id}`, values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      router.push(`/admin/trucks/${truck.id}`);
      router.refresh();
    } else {
      const res = await apiPost<{ truck: { id: string } }>("/api/tenant/fleet/trucks", values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (res.data?.truck.id) {
        router.push(`/admin/trucks`);
        router.refresh();
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.push("/admin/trucks")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              {truck ? "Edit Truck" : "Add Truck"}
            </h2>
            <p className="text-xs text-muted-foreground">Register a new truck in the fleet</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Truck Details
            </CardTitle>
            {watchTruckNumber && (
              <div className="flex gap-2">
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                  {watchName}
                </span>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                  {watchTruckNumber}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <input type="hidden" {...register("name")} />
            <input type="hidden" {...register("truckNumber")} />

            <div className="space-y-2">
              <Label htmlFor="transporterId" className={formState.errors.transporterId ? "text-destructive" : ""}>Transporter / Company*</Label>
              <Popover open={openTransporterSelect} onOpenChange={setOpenTransporterSelect}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id="transporterId"
                    className={`w-full justify-between font-normal ${formState.errors.transporterId ? "border-destructive" : ""}`}
                  >
                    <span className="truncate">
                      {selectedTransporter ? selectedTransporter.name : "Select transporter..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search transporter..." />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty>No transporter found.</CommandEmpty>
                      <CommandGroup>
                        {transporters.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={t.name.toLowerCase()}
                            onSelect={() => {
                              setValue("transporterId", t.id, { shouldValidate: true });
                              setOpenTransporterSelect(false);
                            }}
                            data-checked={selectedTransporterId === t.id}
                          >
                            {t.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("transporterId")} />
              {formState.errors.transporterId && <p className="text-xs text-destructive">{formState.errors.transporterId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plateNumber" className={formState.errors.plateNumber ? "text-destructive" : ""}>Plate Number*</Label>
                <Input 
                  id="plateNumber" 
                  placeholder="e.g. KJA-123-XY" 
                  {...register("plateNumber")}
                  className={formState.errors.plateNumber ? "border-destructive" : ""}
                />
                {formState.errors.plateNumber && <p className="text-xs text-destructive">{formState.errors.plateNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="truckType" className={formState.errors.truckType ? "text-destructive" : ""}>Truck Type*</Label>
                <Select
                  value={watch("truckType")}
                  onValueChange={(val) => setValue("truckType", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="truckType" className={formState.errors.truckType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Truck Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bridger">Bridger (Super Tanker)</SelectItem>
                    <SelectItem value="Articulated Tanker">Articulated Tanker</SelectItem>
                    <SelectItem value="Rigid Tanker">Rigid Tanker</SelectItem>
                    <SelectItem value="Peddler">Peddler (Bobtail)</SelectItem>
                    <SelectItem value="LPG Tanker">LPG Tanker</SelectItem>
                    <SelectItem value="Lube Oil Truck">Lube Oil Truck</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("truckType")} />
                {formState.errors.truckType && <p className="text-xs text-destructive">{formState.errors.truckType.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacityLiters" className={formState.errors.capacityLiters ? "text-destructive" : ""}>Capacity (Liters)*</Label>
                <Input 
                  id="capacityLiters" 
                  type="number"
                  placeholder="e.g. 45000" 
                  {...register("capacityLiters")}
                  className={formState.errors.capacityLiters ? "border-destructive" : ""}
                />
                {formState.errors.capacityLiters && <p className="text-xs text-destructive">{formState.errors.capacityLiters.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuelType" className={formState.errors.fuelType ? "text-destructive" : ""}>Fuel Usage Type</Label>
                <Select
                  value={watch("fuelType")}
                  onValueChange={(val) => setValue("fuelType", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="fuelType" className={formState.errors.fuelType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Fuel Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                    <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                    <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
                    <SelectItem value="LPG">LPG (Gas)</SelectItem>
                    {/* <SelectItem value="ATK">ATK (Aviation Fuel)</SelectItem> */}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("fuelType")} />
                {formState.errors.fuelType && <p className="text-xs text-destructive">{formState.errors.fuelType.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truckBrand" className={formState.errors.truckBrand ? "text-destructive" : ""}>Truck Brand</Label>
                <Input 
                  id="truckBrand" 
                  placeholder="e.g. Mack, MAN Diesel" 
                  {...register("truckBrand")}
                  className={formState.errors.truckBrand ? "border-destructive" : ""}
                />
                {formState.errors.truckBrand && <p className="text-xs text-destructive">{formState.errors.truckBrand.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className={formState.errors.model ? "text-destructive" : ""}>Model</Label>
                <Input 
                  id="model" 
                  placeholder="e.g. Vision" 
                  {...register("model")}
                  className={formState.errors.model ? "border-destructive" : ""}
                />
                {formState.errors.model && <p className="text-xs text-destructive">{formState.errors.model.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 max-w-2xl">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/trucks")}
          className="h-10 rounded-full px-5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={formState.isSubmitting}
          className="h-10 rounded-full px-5 gap-2"
        >
          {formState.isSubmitting ? (
            <>
              <SpinnerEllipsis />
              <span>{truck ? "Updating..." : "Saving..."}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{truck ? "Update Truck" : "Add Truck"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

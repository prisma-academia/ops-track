"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
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
import { ChevronsUpDown, CalendarIcon, CircleCheckIcon } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CreateWaybillSchema = z.object({
  stationId: z.string().min(1, "Station is required"),
  number: z.string().min(1, "Waybill number is required"),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive("Must be positive"),
  truckPlate: z.string().min(1, "Truck plate is required"),
  driverName: z.string().min(1, "Driver name is required"),
  driverPhone: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
  deliveryDatetime: z.string().optional().nullable(),
});

type LookupItem = { id: string; name: string };

export function CreateWaybillForm({ stations }: { stations: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [openStationSelect, setOpenStationSelect] = useState(false);

  // Lookups State
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [depots, setDepots] = useState<LookupItem[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<LookupItem[]>([]);

  // Add Lookup Modal State
  const [lookupDialog, setLookupDialog] = useState<{ isOpen: boolean; type: "supplier" | "depot" | "transportCompany"; label: string } | null>(null);
  const [newLookupName, setNewLookupName] = useState("");
  const [isAddingLookup, setIsAddingLookup] = useState(false);

  // DatePicker State
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  // Lookup Combobox State
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openDepot, setOpenDepot] = useState(false);
  const [openTransport, setOpenTransport] = useState(false);

  const form = useForm<z.infer<typeof CreateWaybillSchema>>({
    resolver: zodResolver(CreateWaybillSchema) as any,
  });

  const watchStationId = form.watch("stationId");

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

  // Auto-generate Waybill Number
  useEffect(() => {
    if (watchStationId) {
      const station = stations.find((s) => s.id === watchStationId);
      if (station) {
        const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        form.setValue("number", `WB-${station.code}-${today}-${randomStr}`, { shouldValidate: true });
      }
    }
  }, [watchStationId, stations, form]);

  // Handle Date/Time Change
  useEffect(() => {
    if (date && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      form.setValue("deliveryDatetime", newDate.toISOString());
    } else {
      form.setValue("deliveryDatetime", null);
    }
  }, [date, selectedTime, form]);

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
          form.setValue("supplier", created.name);
        } else if (lookupDialog.type === "depot") {
          setDepots([...depots, created]);
          form.setValue("depot", created.name);
        } else if (lookupDialog.type === "transportCompany") {
          setTransportCompanies([...transportCompanies, created]);
          form.setValue("transportCompany", created.name);
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

  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = i * 30; // 30 min intervals
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  const renderLookupSelect = (
    fieldValue: string | null | undefined,
    onChange: (value: string) => void,
    options: LookupItem[],
    placeholder: string,
    type: "supplier" | "depot" | "transportCompany",
    label: string,
    openState: boolean,
    setOpenState: (o: boolean) => void
  ) => {
    return (
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
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-8">
          <h3 className="font-semibold text-lg border-b pb-4 text-foreground">General Information</h3>

          {/* Station Selection */}
        <div className="space-y-2">
          <Label className={form.formState.errors.stationId ? "text-destructive" : ""}>
            Receiving Station *
          </Label>
          <Controller
            control={form.control}
            name="stationId"
            render={({ field }) => {
              const selectedStation = stations.find((s) => s.id === field.value);
              const displayLabel = selectedStation
                ? `${selectedStation.name} (${selectedStation.code})`
                : "Select a station...";
              return (
                <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full justify-between font-normal ${
                        form.formState.errors.stationId ? "border-destructive" : ""
                      }`}
                    >
                      <span className="truncate">{displayLabel}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search station..." />
                      <CommandList>
                        <CommandEmpty>No station found.</CommandEmpty>
                        <CommandGroup>
                          {stations.map((s) => {
                            const label = `${s.name} (${s.code})`;
                            return (
                              <CommandItem
                                key={s.id}
                                value={label.toLowerCase()}
                                onSelect={() => {
                                  form.setValue("stationId", s.id, { shouldValidate: true });
                                  setOpenStationSelect(false);
                                }}
                                data-checked={field.value === s.id}
                              >
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              );
            }}
          />
          {form.formState.errors.stationId && (
            <p className="text-xs text-destructive">{form.formState.errors.stationId.message}</p>
          )}
        </div>

        {/* Waybill & Product */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label className={form.formState.errors.number ? "text-destructive" : ""}>Waybill Number *</Label>
            <Input
              placeholder="e.g. WB-998811"
              disabled
              {...form.register("number")}
              className={form.formState.errors.number ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">Auto-generated</p>
          </div>

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
        </div>

        {/* Liters & Truck */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Liters Dispatched *</Label>
            <Input
              type="number"
              placeholder="e.g. 33000"
              {...form.register("litersLoaded")}
            />
          </div>
          <div className="space-y-2">
            <Label>Truck Plate Number *</Label>
            <Input
              placeholder="e.g. LAG-901-AA"
              {...form.register("truckPlate")}
            />
          </div>
        </div>

        {/* Driver */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Driver Name *</Label>
            <Input
              placeholder="e.g. Alabi Kazeem"
              {...form.register("driverName")}
            />
          </div>
          <div className="space-y-2">
            <Label>Driver Phone Number</Label>
            <Input
              placeholder="e.g. +2348012345678"
              {...form.register("driverPhone")}
            />
          </div>
        </div>

        </div>

        {/* Column 2: Logistics & Submit */}
        <div className="space-y-8">
          <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-8">
            <h3 className="font-semibold text-lg border-b pb-4 text-foreground">Logistics & Supply Information</h3>

        {/* Lookups */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Controller
              control={form.control}
              name="supplier"
              render={({ field }) => renderLookupSelect(field.value, field.onChange, suppliers, "Select Supplier", "supplier", "Supplier", openSupplier, setOpenSupplier)}
            />
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

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Transport Company</Label>
            <Controller
              control={form.control}
              name="transportCompany"
              render={({ field }) => renderLookupSelect(field.value, field.onChange, transportCompanies, "Select Transporter", "transportCompany", "Transport Company", openTransport, setOpenTransport)}
            />
          </div>

          <div className="space-y-2">
            <Label>Expected Delivery Date/Time</Label>
            <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date && selectedTime ? (
                    `${date.toLocaleDateString("en-GB")} at ${selectedTime}`
                  ) : (
                    <span>Pick date & time</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Card className="gap-0 p-0 border-0 shadow-none w-full max-w-none">
                  <CardHeader className="flex h-max items-center justify-start border-b px-4 py-3">
                    <CardTitle className="text-sm">Select Delivery Time</CardTitle>
                  </CardHeader>
                  <CardContent className="relative p-0 flex flex-col md:flex-row h-64">
                    <div className="p-4 flex-1">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        defaultMonth={date}
                        showOutsideDays={false}
                      />
                    </div>
                    <div className="border-t md:border-t-0 md:border-l w-full md:w-32 h-full flex-shrink-0">
                      <ScrollArea className="h-full">
                        <div className="flex flex-col gap-2 p-2">
                          {timeSlots.map((time) => (
                            <Button
                              key={time}
                              variant={selectedTime === time ? "default" : "ghost"}
                              onClick={() => setSelectedTime(time)}
                              className="w-full text-xs shadow-none justify-center"
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 border-t px-4 py-3">
                    <div className="flex w-full items-center gap-2 text-xs">
                      {date && selectedTime ? (
                        <>
                          <CircleCheckIcon className="size-4 shrink-0 text-emerald-500" />
                          <span className="text-xs">
                            Expected: <span className="font-medium">{date.toLocaleDateString("en-GB")} {selectedTime}</span>
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Select date and time</span>
                      )}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenDatePicker(false);
                      }}
                      disabled={!date || !selectedTime}
                      className="w-full"
                      size="sm"
                    >
                      Confirm
                    </Button>
                  </CardFooter>
                </Card>
              </PopoverContent>
            </Popover>
          </div>
        </div>

          </div>

          <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-6">
            {apiError && <p className="text-sm text-red-600 font-medium">{apiError}</p>}

            <div className="flex items-center justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push("/admin/waybills")}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-32">
                {form.formState.isSubmitting ? <SpinnerEllipsis /> : "Create Dispatch"}
              </Button>
            </div>
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

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const Schema = z.object({
  orderId: z.string().optional().or(z.literal("")),
  transporterId: z.string().min(1, "Please select a transporter"),
  truckId: z.string().min(1, "Please select a truck"),
  driverId: z.string().optional().or(z.literal("")),
  destination: z.string().min(1, "Destination is required"),
  transportType: z.enum(["EXTERNAL", "INTERNAL"]),
  ratePerLiter: z.coerce.number().positive("Rate per liter must be > 0"),
  litersCarried: z.coerce.number().positive("Liters carried must be > 0"),
});

type Values = z.infer<typeof Schema>;

export function CreateTransportForm({
  transporters,
  trucks,
  drivers,
  orders,
}: {
  transporters: { id: string; name: string }[];
  trucks: { id: string; name: string; transporterId: string }[];
  drivers: { id: string; firstName: string; lastName: string; transporterId: string }[];
  orders: { id: string; reference: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const [openOrderSelect, setOpenOrderSelect] = useState(false);
  const [openTransporterSelect, setOpenTransporterSelect] = useState(false);
  const [openTruckSelect, setOpenTruckSelect] = useState(false);
  const [openDriverSelect, setOpenDriverSelect] = useState(false);
  const [openTypeSelect, setOpenTypeSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      orderId: "",
      transporterId: "",
      truckId: "",
      driverId: "",
      destination: "",
      transportType: "INTERNAL" as any,
      ratePerLiter: 0,
      litersCarried: 45000,
    },
  });

  const selectedOrderId = watch("orderId");
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  
  const selectedTransporterId = watch("transporterId");
  const selectedTransporter = transporters.find((t) => t.id === selectedTransporterId);
  
  const filteredTrucks = trucks.filter(t => t.transporterId === selectedTransporterId);
  const selectedTruckId = watch("truckId");
  const selectedTruck = filteredTrucks.find((t) => t.id === selectedTruckId);
  
  const filteredDrivers = drivers.filter(d => d.transporterId === selectedTransporterId);
  const selectedDriverId = watch("driverId");
  const selectedDriver = filteredDrivers.find((d) => d.id === selectedDriverId);
  
  const selectedType = watch("transportType");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    const res = await apiPost<{ transport: { id: string } }>("/api/tenant/fleet/transports", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.transport.id) {
      router.push(`/admin/fleet/transports`);
      router.refresh();
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
            onClick={() => router.push("/admin/fleet/transports")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Dispatch Transport
            </h2>
            <p className="text-xs text-muted-foreground">Create a new transport trip</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderId" className={formState.errors.orderId ? "text-destructive" : ""}>Link to Order (Optional)</Label>
                <Popover open={openOrderSelect} onOpenChange={setOpenOrderSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="orderId"
                      className={`w-full justify-between font-normal ${formState.errors.orderId ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedOrder ? (selectedOrder.reference || "Unnamed Order") : "Select order..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search order..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No order found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setValue("orderId", "", { shouldValidate: true });
                              setOpenOrderSelect(false);
                            }}
                          >
                            None
                          </CommandItem>
                          {orders.map((o) => (
                            <CommandItem
                              key={o.id}
                              value={o.reference?.toLowerCase() || o.id}
                              onSelect={() => {
                                setValue("orderId", o.id, { shouldValidate: true });
                                setOpenOrderSelect(false);
                              }}
                              data-checked={selectedOrderId === o.id}
                            >
                              {o.reference || "Unnamed Order"}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("orderId")} />
                {formState.errors.orderId && <p className="text-xs text-destructive">{formState.errors.orderId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportType" className={formState.errors.transportType ? "text-destructive" : ""}>Transport Type*</Label>
                <Popover open={openTypeSelect} onOpenChange={setOpenTypeSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="transportType"
                      className={`w-full justify-between font-normal ${formState.errors.transportType ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedType || "Select type..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandGroup>
                          {["INTERNAL", "EXTERNAL"].map((t) => (
                            <CommandItem
                              key={t}
                              value={t.toLowerCase()}
                              onSelect={() => {
                                setValue("transportType", t as any, { shouldValidate: true });
                                setOpenTypeSelect(false);
                              }}
                              data-checked={selectedType === t}
                            >
                              {t}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("transportType")} />
                {formState.errors.transportType && <p className="text-xs text-destructive">{formState.errors.transportType.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className={formState.errors.destination ? "text-destructive" : ""}>Destination*</Label>
              <Input 
                id="destination" 
                placeholder="e.g. Lagos Mainland Station" 
                {...register("destination")}
                className={formState.errors.destination ? "border-destructive" : ""}
              />
              {formState.errors.destination && <p className="text-xs text-destructive">{formState.errors.destination.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ratePerLiter" className={formState.errors.ratePerLiter ? "text-destructive" : ""}>Rate per Liter (₦)*</Label>
                <Input 
                  id="ratePerLiter" 
                  type="number"
                  placeholder="e.g. 15" 
                  {...register("ratePerLiter")}
                  className={formState.errors.ratePerLiter ? "border-destructive" : ""}
                />
                {formState.errors.ratePerLiter && <p className="text-xs text-destructive">{formState.errors.ratePerLiter.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="litersCarried" className={formState.errors.litersCarried ? "text-destructive" : ""}>Volume Carried (L)*</Label>
                <Input 
                  id="litersCarried" 
                  type="number"
                  placeholder="e.g. 45000" 
                  {...register("litersCarried")}
                  className={formState.errors.litersCarried ? "border-destructive" : ""}
                />
                {formState.errors.litersCarried && <p className="text-xs text-destructive">{formState.errors.litersCarried.message}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-6">
              <h3 className="text-sm font-semibold mb-4">Assign Truck & Driver</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transporterId" className={formState.errors.transporterId ? "text-destructive" : ""}>Transporter*</Label>
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
                                  setValue("truckId", "", { shouldValidate: false });
                                  setValue("driverId", "", { shouldValidate: false });
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
                    <Label htmlFor="truckId" className={formState.errors.truckId ? "text-destructive" : ""}>Truck*</Label>
                    <Popover open={openTruckSelect} onOpenChange={setOpenTruckSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          id="truckId"
                          disabled={!selectedTransporterId}
                          className={`w-full justify-between font-normal ${formState.errors.truckId ? "border-destructive" : ""}`}
                        >
                          <span className="truncate">
                            {selectedTruck ? selectedTruck.name : "Select truck..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search truck..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No truck found.</CommandEmpty>
                            <CommandGroup>
                              {filteredTrucks.map((t) => (
                                <CommandItem
                                  key={t.id}
                                  value={t.name.toLowerCase()}
                                  onSelect={() => {
                                    setValue("truckId", t.id, { shouldValidate: true });
                                    setOpenTruckSelect(false);
                                  }}
                                  data-checked={selectedTruckId === t.id}
                                >
                                  {t.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <input type="hidden" {...register("truckId")} />
                    {formState.errors.truckId && <p className="text-xs text-destructive">{formState.errors.truckId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverId" className={formState.errors.driverId ? "text-destructive" : ""}>Driver (Optional)</Label>
                    <Popover open={openDriverSelect} onOpenChange={setOpenDriverSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          id="driverId"
                          disabled={!selectedTransporterId}
                          className={`w-full justify-between font-normal ${formState.errors.driverId ? "border-destructive" : ""}`}
                        >
                          <span className="truncate">
                            {selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : "Select driver..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search driver..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No driver found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setValue("driverId", "", { shouldValidate: true });
                                  setOpenDriverSelect(false);
                                }}
                              >
                                None
                              </CommandItem>
                              {filteredDrivers.map((d) => (
                                <CommandItem
                                  key={d.id}
                                  value={`${d.firstName} ${d.lastName}`.toLowerCase()}
                                  onSelect={() => {
                                    setValue("driverId", d.id, { shouldValidate: true });
                                    setOpenDriverSelect(false);
                                  }}
                                  data-checked={selectedDriverId === d.id}
                                >
                                  {`${d.firstName} ${d.lastName}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <input type="hidden" {...register("driverId")} />
                    {formState.errors.driverId && <p className="text-xs text-destructive">{formState.errors.driverId.message}</p>}
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 max-w-3xl">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/fleet/transports")}
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
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Dispatch Transport</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

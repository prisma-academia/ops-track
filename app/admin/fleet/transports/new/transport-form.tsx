"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown, Plus, Trash2, SplitSquareHorizontal, Truck, AlertTriangle, Droplet } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";


const Schema = z.object({
  orderId: z.string().min(1, "Order is required"),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]).optional().nullable(),
  invitationId: z.string().optional().nullable(),
  assignments: z.array(z.object({
    transporterId: z.string().min(1, "Please select a transporter"),
    truckId: z.string().min(1, "Please select a truck"),
    driverId: z.string().min(1, "Please select a driver"),
    destination: z.string().min(1, "Destination is required"),
    ratePerLiter: z.coerce.number().min(1, "Rate is required"),
    litersCarried: z.coerce.number().min(1, "Volume is required"),
  })).min(1, "At least one truck assignment is required"),
});

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

type Values = z.infer<typeof Schema>;

export function CreateTransportForm({
  transporters,
  trucks,
  drivers,
  orders,
  preselectedInvitation,
}: {
  transporters: { id: string; name: string }[];
  trucks: { id: string; name: string; transporterId: string; capacityLiters?: any }[];
  drivers: { id: string; firstName: string; lastName: string; transporterId: string }[];
  orders: { id: string; reference: string | null; productType: any; litersOrdered: number | string; sourceDepot?: string | null; transports: { litersCarried: number | string }[] }[];
  preselectedInvitation?: any;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openOrderSelect, setOpenOrderSelect] = useState(false);
  const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({});

  const togglePopover = (key: string, isOpen: boolean) => {
    setOpenStates(prev => ({ ...prev, [key]: isOpen }));
  };



  const { register, handleSubmit, formState, setValue, watch, control } = useForm<Values>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      orderId: preselectedInvitation?.orderId || "",
      productType: (preselectedInvitation?.order?.productType as any) || "PMS",
      invitationId: preselectedInvitation?.id || null,
      assignments: [{
        transporterId: preselectedInvitation?.transporterId || "",
        truckId: "",
        driverId: "",
        destination: preselectedInvitation?.destination || "",
        ratePerLiter: "" as any,
        litersCarried: preselectedInvitation?.litersRequested || ("" as any),
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "assignments",
  });

  const selectedOrderId = watch("orderId");
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const selectedProductType = watch("productType");

  const assignmentsWatch = watch("assignments");
  
  const targetVolume = preselectedInvitation 
    ? Number(preselectedInvitation.litersRequested || 0) 
    : (selectedOrder ? Number(selectedOrder.litersOrdered || 0) : 0);

  const previouslyTransported = preselectedInvitation 
    ? 0 
    : (selectedOrder ? selectedOrder.transports.reduce((sum, t) => sum + Number(t.litersCarried), 0) : 0);

  const currentlyAllocated = assignmentsWatch.reduce((sum, a) => sum + (Number(a.litersCarried) || 0), 0);
  const totalRequested = previouslyTransported + currentlyAllocated;
  const isOverAllocated = (selectedOrderId || preselectedInvitation) ? totalRequested > targetVolume : false;
  const remainingVolume = Math.max(0, targetVolume - totalRequested);

  const availableOrders = orders.filter((o) => {
    const prev = o.transports.reduce((sum, t) => sum + Number(t.litersCarried), 0);
    return Number(o.litersOrdered) - prev > 0 || o.id === selectedOrderId;
  });

  useEffect(() => {
    if (selectedOrderId) {
      if (selectedOrder) {
        if (selectedOrder.productType) setValue("productType", selectedOrder.productType, { shouldValidate: true });
      }
    }
  }, [selectedOrderId, orders, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ transports: { id: string }[] }>("/api/tenant/fleet/transports/fulfill", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    toast.success("Transport(s) dispatched successfully");
    router.push(`/admin/fleet/transports`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      <Card className="mb-6 shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => router.push("/admin/fleet/transports")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                Dispatch Transport
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Assign trucks and optionally fulfill station requests.</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl">
        <div className="xl:col-span-2 space-y-6">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          {isOverAllocated && (
            <div className="mx-6 mt-6 p-3 text-sm font-medium rounded-md bg-destructive/15 text-destructive border border-destructive/20 flex items-center">
              Total dispatched volume ({totalRequested.toLocaleString()}L) exceeds the ordered volume ({targetVolume.toLocaleString()}L).
            </div>
          )}

          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Source Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="orderId" className={formState.errors.orderId ? "text-destructive" : ""}>Link to Order*</Label>
                <Popover open={openOrderSelect} onOpenChange={setOpenOrderSelect}>
                  <PopoverTrigger asChild>
                    <Button disabled={!!preselectedInvitation} type="button" variant="outline" id="orderId" className={`w-full justify-between font-normal ${formState.errors.orderId ? "border-destructive" : ""}`}>
                      <span className="truncate">
                        {selectedOrder 
                          ? `${selectedOrder.sourceDepot || "Depot"} - ${selectedOrder.reference || "Unnamed Order"}` 
                          : preselectedInvitation?.order
                            ? `${preselectedInvitation.order.sourceDepot || "Depot"} - ${preselectedInvitation.order.reference || "Unnamed Order"}`
                            : "Select order..."}
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
                          {availableOrders.map((o) => (
                            <CommandItem key={o.id} value={o.reference?.toLowerCase() || o.id} onSelect={() => { setValue("orderId", o.id, { shouldValidate: true }); setOpenOrderSelect(false); }}>
                              {o.sourceDepot || "Depot"} - {o.reference || "Unnamed Order"} ({Number(o.litersOrdered).toLocaleString()}L) - {o.productType}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formState.errors.orderId && <p className="text-xs text-destructive">{formState.errors.orderId.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label>Product Type</Label>
                <Input value={selectedProductType || ""} disabled className="bg-muted" />
              </div>
            </div>

          </CardContent>
        </Card>

        {fields.map((field, index) => {
          const transporterId = watch(`assignments.${index}.transporterId`);
          const truckId = watch(`assignments.${index}.truckId`);
          const driverId = watch(`assignments.${index}.driverId`);
          const destination = watch(`assignments.${index}.destination`);
          const rL = watch(`assignments.${index}.ratePerLiter`) || 0;
          const lC = watch(`assignments.${index}.litersCarried`) || 0;
          const rowCost = Number(rL) * Number(lC);

          const fieldErrors = formState.errors.assignments?.[index];

          const filteredTrucks = trucks.filter(t => t.transporterId === transporterId);
          const filteredDrivers = drivers.filter(d => d.transporterId === transporterId);

          return (
            <Card key={field.id} className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs relative overflow-visible">
              {fields.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Truck Assignment #{index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={fieldErrors?.transporterId ? "text-destructive" : ""}>Transporter*</Label>
                    <Popover open={openStates[`transporter-${index}`]} onOpenChange={(val) => togglePopover(`transporter-${index}`, val)}>
                      <PopoverTrigger asChild>
                        <Button disabled={!!preselectedInvitation} type="button" variant="outline" className={`w-full justify-between font-normal ${fieldErrors?.transporterId ? "border-destructive" : ""}`}>
                          <span className="truncate">{transporters.find(t => t.id === transporterId)?.name || "Select..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No transporter found.</CommandEmpty>
                            <CommandGroup>
                              {transporters.map((t) => (
                                <CommandItem key={t.id} value={t.name.toLowerCase()} onSelect={() => { 
                                  setValue(`assignments.${index}.transporterId`, t.id, { shouldValidate: true }); 
                                  setValue(`assignments.${index}.truckId`, "", { shouldValidate: false }); 
                                  setValue(`assignments.${index}.driverId`, "", { shouldValidate: false }); 
                                  togglePopover(`transporter-${index}`, false); 
                                }}>
                                  {t.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldErrors?.transporterId && <p className="text-xs text-destructive">{fieldErrors.transporterId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className={fieldErrors?.truckId ? "text-destructive" : ""}>Truck*</Label>
                    <Popover open={openStates[`truck-${index}`]} onOpenChange={(val) => togglePopover(`truck-${index}`, val)}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" disabled={!transporterId} className={`w-full justify-between font-normal ${fieldErrors?.truckId ? "border-destructive" : ""}`}>
                          <span className="truncate">{trucks.find(t => t.id === truckId)?.name || "Select truck..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No truck found.</CommandEmpty>
                            <CommandGroup>
                              {filteredTrucks.map((t) => (
                                <CommandItem key={t.id} value={t.name.toLowerCase()} onSelect={() => { setValue(`assignments.${index}.truckId`, t.id, { shouldValidate: true }); togglePopover(`truck-${index}`, false); }}>
                                  {t.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldErrors?.truckId && <p className="text-xs text-destructive">{fieldErrors.truckId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className={fieldErrors?.driverId ? "text-destructive" : ""}>Driver*</Label>
                    <Popover open={openStates[`driver-${index}`]} onOpenChange={(val) => togglePopover(`driver-${index}`, val)}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" disabled={!transporterId} className={`w-full justify-between font-normal ${fieldErrors?.driverId ? "border-destructive" : ""}`}>
                          <span className="truncate">{drivers.find(d => d.id === driverId) ? `${drivers.find(d => d.id === driverId)?.firstName} ${drivers.find(d => d.id === driverId)?.lastName}` : "Select driver..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No driver found.</CommandEmpty>
                            <CommandGroup>
                              {filteredDrivers.map((d) => (
                                <CommandItem key={d.id} value={`${d.firstName} ${d.lastName}`.toLowerCase()} onSelect={() => { setValue(`assignments.${index}.driverId`, d.id, { shouldValidate: true }); togglePopover(`driver-${index}`, false); }}>
                                  {`${d.firstName} ${d.lastName}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldErrors?.driverId && <p className="text-xs text-destructive">{fieldErrors.driverId.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={fieldErrors?.destination ? "text-destructive" : ""}>Primary Destination State*</Label>
                    <Popover open={openStates[`dest-${index}`]} onOpenChange={(val) => togglePopover(`dest-${index}`, val)}>
                      <PopoverTrigger asChild>
                        <Button disabled={!!preselectedInvitation} type="button" variant="outline" className={`w-full justify-between font-normal ${fieldErrors?.destination ? "border-destructive" : ""}`}>
                          <span className="truncate">{destination || "Select state..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {NIGERIAN_STATES.map((state) => (
                                <CommandItem key={state} value={state.toLowerCase()} onSelect={() => { setValue(`assignments.${index}.destination`, state, { shouldValidate: true }); togglePopover(`dest-${index}`, false); }}>
                                  {state}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {fieldErrors?.destination && <p className="text-xs text-destructive">{fieldErrors.destination.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className={fieldErrors?.litersCarried ? "text-destructive" : ""}>Assigned Volume (L)*</Label>
                    <Controller
                      control={control}
                      name={`assignments.${index}.litersCarried`}
                      render={({ field }) => (
                          <FormattedNumberInput 
                            placeholder="45000" 
                            {...field}
                            className={fieldErrors?.litersCarried ? "border-destructive" : ""} 
                            prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                          />
                      )}
                    />
                    {fieldErrors?.litersCarried && <p className="text-xs text-destructive">{String(fieldErrors.litersCarried.message)}</p>}
                    {(() => {
                      const selectedTruck = trucks.find(t => t.id === truckId);
                      const truckCapacity = selectedTruck?.capacityLiters ? Number(selectedTruck.capacityLiters) : 0;
                      if (truckCapacity > 0 && Number(lC) > truckCapacity) {
                        return (
                          <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Volume exceeds truck capacity ({truckCapacity.toLocaleString()}L).
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label className={fieldErrors?.ratePerLiter ? "text-destructive" : ""}>Transport Rate (₦/L)*</Label>
                    <Controller
                      control={control}
                      name={`assignments.${index}.ratePerLiter`}
                      render={({ field }) => (
                        <FormattedNumberInput 
                          placeholder="15" 
                          {...field}
                          className={fieldErrors?.ratePerLiter ? "border-destructive" : ""} 
                          prefixText="₦"
                        />
                      )}
                    />
                    {fieldErrors?.ratePerLiter && <p className="text-xs text-destructive">{String(fieldErrors.ratePerLiter.message)}</p>}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-sm text-muted-foreground border-t border-border mt-4">
                  <div className="flex flex-col items-end w-full">
                    <span className="font-semibold text-xs">Trip Transport Cost:</span>
                    <span className="font-mono text-primary font-bold">₦{rowCost.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!preselectedInvitation && (
          <Button 
            type="button" 
            variant="secondary" 
            className="w-full py-6 font-semibold shadow-sm"
            onClick={() => {
              if (selectedOrderId && remainingVolume <= 0) {
                toast.error("Cannot add another truck: Order volume has been fully allocated.");
                return;
              }
              append({
                transporterId: "",
                truckId: "",
                driverId: "",
                destination: "",
                ratePerLiter: "" as any,
                litersCarried: "" as any
              });
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Truck Assignment
          </Button>
        )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {formState.errors.assignments?.root && <p className="text-sm text-red-600">{formState.errors.assignments.root.message}</p>}
        </div>
        
        {/* Right Sidebar for Stats */}
        <div className="xl:col-span-1 space-y-6">
          {(selectedOrderId || preselectedInvitation) && (
            <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs sticky top-6 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Order Volume Tracker</CardTitle>
                {selectedProductType && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {selectedProductType}
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Vertical Indicators Summary matching churn-rate-summary */}
                <div className="space-y-3 pb-2">
                  {/* Requested / Total Target */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-blue-500 rounded-xs shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {preselectedInvitation ? "Requested Volume" : "Total Order Target"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {targetVolume.toLocaleString()}L
                    </span>
                  </div>

                  {/* Assign */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-amber-500 rounded-xs shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Assigned Volume
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                      {currentlyAllocated.toLocaleString()}L
                    </span>
                  </div>

                  {/* Remaining */}
                  <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${remainingVolume === 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40" : "bg-stone-50/60 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800"}`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-xs shrink-0 ${remainingVolume === 0 ? "bg-emerald-500" : "bg-stone-400"}`} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Remaining Volume
                      </span>
                    </div>
                    <span className={`font-mono font-bold text-sm ${remainingVolume === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-stone-700 dark:text-stone-300"}`}>
                      {remainingVolume.toLocaleString()}L
                    </span>
                  </div>
                </div>

                {/* Single Bar Stacked Chart matching churn-rate-chart design */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs font-mono text-muted-foreground font-medium">
                    <span>Allocation Progress</span>
                    <span>{Math.min(100, Math.round((totalRequested / (targetVolume || 1)) * 100))}%</span>
                  </div>

                  <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex p-0.5 shadow-inner border border-stone-200 dark:border-stone-700 gap-0.5">
                    {previouslyTransported > 0 && (
                      <div 
                        className="h-full bg-blue-500 rounded-xs transition-all duration-500" 
                        style={{ width: `${Math.min(100, (previouslyTransported / (targetVolume || 1)) * 100)}%` }}
                        title={`Prior Dispatched: ${previouslyTransported.toLocaleString()} L`}
                      />
                    )}
                    {currentlyAllocated > 0 && (
                      <div 
                        className="h-full bg-amber-500 rounded-xs transition-all duration-500" 
                        style={{ width: `${Math.min(100, (currentlyAllocated / (targetVolume || 1)) * 100)}%` }}
                        title={`Assigned in Form: ${currentlyAllocated.toLocaleString()} L`}
                      />
                    )}
                    {remainingVolume > 0 && (
                      <div 
                        className="h-full bg-stone-300 dark:bg-stone-600 rounded-xs transition-all duration-500" 
                        style={{ width: `${Math.min(100, (remainingVolume / (targetVolume || 1)) * 100)}%` }}
                        title={`Remaining: ${remainingVolume.toLocaleString()} L`}
                      />
                    )}
                    {remainingVolume === 0 && totalRequested >= targetVolume && (
                      <div 
                        className="h-full bg-emerald-500 rounded-xs transition-all duration-500" 
                        style={{ width: "100%" }}
                        title="Fully Allocated"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="max-w-6xl pt-6 mt-8 border-t border-border flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/fleet/transports")} className="h-10 rounded-full px-5">
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting || isOverAllocated} className="h-10 rounded-full px-5 gap-2 min-w-[140px]">
          {formState.isSubmitting ? (
            <><SpinnerEllipsis /><span>Saving...</span></>
          ) : (
            <><Save className="h-4 w-4" /><span>Dispatch {fields.length} {fields.length === 1 ? 'Truck' : 'Trucks'}</span></>
          )}
        </Button>
      </div>
    </form>
  );
}

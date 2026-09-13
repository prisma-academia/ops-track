"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { formatShortCurrency, formatHumanReadableDate } from "@/lib/utils";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, ChevronsUpDown, Store, UserCircle, Droplet, Truck, Package2 } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BaseSchema = z.object({
  recipientType: z.enum(["CUSTOMER", "STATION"]),
  customerId: z.string().optional(),
  stationId: z.string().optional(),
  transportCostBorneBy: z.enum(["CLIENT", "COMPANY"], {
    error: "Please select who bears the transport cost",
  }),
  transportId: z.string().min(1, "Please select a transport"),
  litersDespatched: z.coerce.number().positive("Liters despatched must be > 0"),
  litersReceived: z.union([z.coerce.number().positive(), z.literal(""), z.undefined()]).transform(v => (v === "" || v === undefined ? null : Number(v))).optional().nullable(),
  amountPerLiter: z.coerce.number().positive("Amount per liter must be > 0"),
  transportCostPerLiter: z.coerce.number().min(0, "Transport cost must be >= 0").optional().default(0),
});

type Values = z.infer<typeof BaseSchema>;

type CreateSaleFormProps = {
  customers: { id: string; name: string }[];
  stations: { id: string; name: string; code: string; state?: string | null; lga?: string | null; organization?: { name: string } | null }[];
  transports: {
    id: string;
    destination: string;
    litersCarried: any;
    ratePerLiter: any;
    status: string;
    createdAt?: string | Date;
    order?: {
      reference: string | null;
      productType: string;
      litersOrdered: any;
      supplier: string | null;
      sourceDepot: string | null;
      status: string;
    } | null;
    deliveries?: { litersDespatched: any }[];
    truck: { name: string; plateNumber: string | null; capacityLiters: any };
    transporter: { name: string };
  }[];
  preselectedTransportId?: string;
};

type TransportOption = CreateSaleFormProps["transports"][number];

function getTransportVolumes(transport: TransportOption) {
  const carried = Number(transport.litersCarried || 0);
  const distributed = (transport.deliveries || []).reduce(
    (acc, sale) => acc + Number(sale.litersDespatched || 0),
    0
  );
  const available = Math.max(0, carried - distributed);
  return { carried, distributed, available };
}

function TripSummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function TripSummaryCard({
  transport,
  dispatchVolume,
}: {
  transport: TransportOption | undefined;
  dispatchVolume: number;
}) {
  if (!transport) {
    return (
      <Card className="border-dashed border-2 border-border/60 bg-muted/10 sticky top-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[320px] px-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/50">
            <Truck className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No trip selected</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-[220px]">
            Choose an order or transport trip to review available volume and trip details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { carried, distributed, available } = getTransportVolumes(transport);
  const dispatching = Math.max(0, dispatchVolume || 0);
  const remainingAfter = Math.max(0, available - dispatching);
  const utilization = carried > 0 ? Math.min(100, Math.round((distributed / carried) * 100)) : 0;
  const afterDispatchUtilization =
    carried > 0 ? Math.min(100, Math.round(((distributed + dispatching) / carried) * 100)) : 0;
  const truckLabel = transport.truck.plateNumber || transport.truck.name;

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-xs sticky top-6 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trip Summary
            </CardTitle>
          </div>
          {transport.order?.productType ? (
            <Badge variant="outline" className="font-mono text-[10px] uppercase shrink-0">
              {transport.order.productType}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Package2 className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</span>
          </div>
          <TripSummaryRow
            label="Reference"
            value={
              <span className="font-mono text-xs">
                {transport.order?.reference || "Unlinked"}
              </span>
            }
          />
          {transport.order?.sourceDepot ? (
            <TripSummaryRow label="Depot" value={transport.order.sourceDepot} />
          ) : null}
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transport</span>
          </div>
          <TripSummaryRow label="Destination" value={transport.destination} />
          <TripSummaryRow label="Transporter" value={transport.transporter.name} />
          <TripSummaryRow label="Truck" value={truckLabel} />
          <TripSummaryRow
            label="Status"
            value={
              <Badge variant="secondary" className="text-[10px] uppercase">
                {transport.status.replace(/_/g, " ")}
              </Badge>
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Volume on trip</span>
            <span>{utilization}% allocated</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border border-border/50 bg-muted/40">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-300"
              style={{ width: `${utilization}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/80 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Carried</span>
              <span className="font-mono text-sm font-semibold">{carried.toLocaleString()} L</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <span className="text-xs text-muted-foreground">Already distributed</span>
              <span className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                {distributed.toLocaleString()} L
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-emerald-200/70 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <span className="text-xs text-muted-foreground">Available now</span>
              <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {available.toLocaleString()} L
              </span>
            </div>
          </div>

          {dispatching > 0 ? (
            <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">This dispatch</span>
                <span className="font-mono font-semibold text-primary">{dispatching.toLocaleString()} L</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Remaining after</span>
                <span className={`font-mono font-semibold ${remainingAfter === 0 ? "text-emerald-600" : "text-foreground"}`}>
                  {remainingAfter.toLocaleString()} L
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${afterDispatchUtilization}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function CreateSaleForm({
  customers,
  stations,
  transports,
  preselectedTransportId,
}: CreateSaleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const [openCustomerSelect, setOpenCustomerSelect] = useState(false);
  const [openStationSelect, setOpenStationSelect] = useState(false);
  const [openTransportSelect, setOpenTransportSelect] = useState(false);
  const [rateMode, setRateMode] = useState<"PER_LITER" | "FLAT">("PER_LITER");
  const [flatTransportFee, setFlatTransportFee] = useState<number>(0);

  const FormSchema = BaseSchema.superRefine((data, ctx) => {
    if (data.recipientType === "CUSTOMER" && !data.customerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a customer", path: ["customerId"] });
    }
    if (data.recipientType === "STATION" && !data.stationId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a station", path: ["stationId"] });
    }
    if (data.transportId) {
      const transport = transports.find((t) => t.id === data.transportId);
      if (transport) {
        const carried = Number(transport.litersCarried || 0);
        const distributed = (transport.deliveries || []).reduce((acc: number, s: any) => acc + Number(s.litersDespatched || 0), 0);
        const available = Math.max(0, carried - distributed);
        if (data.litersDespatched > available) {
          ctx.addIssue({ 
            code: z.ZodIssueCode.custom, 
            message: `Volume exceeds transport's available quantity (${available.toLocaleString()} L)`, 
            path: ["litersDespatched"] 
          });
        }
      }
    }
  });

  const { register, handleSubmit, formState, setValue, watch, control } = useForm<Values>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      recipientType: "STATION",
      customerId: "",
      stationId: "",
      transportCostBorneBy: "COMPANY",
      transportId: preselectedTransportId || "",
      litersDespatched: 0,
      litersReceived: null,
      amountPerLiter: 0,
      transportCostPerLiter: 0,
    },
  });

  const recipientType = watch("recipientType");
  const transportCostBorneBy = watch("transportCostBorneBy");
  const selectedCustomerId = watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  
  const selectedStationId = watch("stationId");
  const selectedStation = stations.find((s) => s.id === selectedStationId);
  
  const selectedTransportId = watch("transportId");
  const selectedTransport = transports.find((t) => t.id === selectedTransportId);
  const litersDespatched = watch("litersDespatched");

  // Keep per-litre transport cost synchronized when in flat fee mode
  useEffect(() => {
    if (rateMode === "FLAT") {
      const perLiter = litersDespatched > 0 && flatTransportFee > 0 ? flatTransportFee / litersDespatched : 0;
      setValue("transportCostPerLiter", perLiter, { shouldValidate: true });
    }
  }, [litersDespatched, rateMode, flatTransportFee, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    const calculatedRatePerLiter = rateMode === "FLAT"
      ? (values.litersDespatched > 0 && flatTransportFee > 0 ? flatTransportFee / values.litersDespatched : 0)
      : (values.transportCostPerLiter || 0);
    
    const payload = {
      ...values,
      litersReceived: null,
      transportCostPerLiter: calculatedRatePerLiter,
      // Clear out the unused relation
      customerId: values.recipientType === "CUSTOMER" ? values.customerId : undefined,
      stationId: values.recipientType === "STATION" ? values.stationId : undefined,
    };
    
    const res = await apiPost<{ delivery?: { id: string }, Delivery?: { id: string } }>("/api/tenant/fleet/deliveries", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    const createdId = res.data?.delivery?.id || res.data?.Delivery?.id;
    if (createdId) {
      if (preselectedTransportId) {
        // Go back to transport details
        router.push(`/admin/transports/${preselectedTransportId}`);
      } else {
        router.push(`/admin/deliveries`);
      }
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
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Log Distribution / delivery
            </h2>
            <p className="text-xs text-muted-foreground">Record fuel distribution to stations or external clients.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Distribution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recipient Type Toggle */}
              <div className="space-y-3">
                <Label>Recipient Type</Label>
                <Controller
                  control={control}
                  name="recipientType"
                  render={({ field }) => (
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <Label 
                        htmlFor="r-station" 
                        className="flex cursor-pointer flex-row items-start justify-between rounded-lg border p-4 hover:bg-accent/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-base">Managed Stations</span>
                          </div>
                          <span className="text-sm text-muted-foreground font-normal">Internal transfer to a station</span>
                        </div>
                        <RadioGroupItem value="STATION" id="r-station" className="mt-1" />
                      </Label>

                      <Label 
                        htmlFor="r-customer" 
                        className="flex cursor-pointer flex-row items-start justify-between rounded-lg border p-4 hover:bg-accent/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-base">B2B Clients</span>
                          </div>
                          <span className="text-sm text-muted-foreground font-normal">delivery to a third-party customer</span>
                        </div>
                        <RadioGroupItem value="CUSTOMER" id="r-customer" className="mt-1" />
                      </Label>
                    </RadioGroup>
                  )}
                />
              </div>

              {recipientType === "CUSTOMER" ? (
                <div className="space-y-2">
                  <Label htmlFor="customerId" className={formState.errors.customerId ? "text-destructive" : ""}>Client*</Label>
                  <Popover open={openCustomerSelect} onOpenChange={setOpenCustomerSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="customerId"
                        className={`w-full justify-between font-normal ${formState.errors.customerId ? "border-destructive" : ""}`}
                      >
                        <span className="truncate">
                          {selectedCustomer ? selectedCustomer.name : "Select client..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search client..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.name} ${c.id}`.toLowerCase()}
                                onSelect={() => {
                                  setValue("customerId", c.id, { shouldValidate: true });
                                  setOpenCustomerSelect(false);
                                }}
                                data-checked={selectedCustomerId === c.id}
                              >
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-sm">{c.name}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5">External Client</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formState.errors.customerId && <p className="text-xs text-destructive">{formState.errors.customerId.message}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="stationId" className={formState.errors.stationId ? "text-destructive" : ""}>Station*</Label>
                  <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="stationId"
                        className={`w-full justify-between font-normal ${formState.errors.stationId ? "border-destructive" : ""}`}
                      >
                        <span className="truncate">
                          {selectedStation ? (
                            selectedStation.organization?.name
                              ? `${selectedStation.name} • ${selectedStation.organization.name}${selectedStation.state ? ` (${[selectedStation.lga, selectedStation.state].filter(Boolean).join(", ")})` : ""}`
                              : `${selectedStation.name}${[selectedStation.lga, selectedStation.state].filter(Boolean).length ? ` (${[selectedStation.lga, selectedStation.state].filter(Boolean).join(", ")})` : ""}`
                          ) : "Select station..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search station, state, or LGA..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>No station found.</CommandEmpty>
                          <CommandGroup>
                            {stations.map((s) => {
                              const locationInfo = [s.lga, s.state].filter(Boolean).join(", ");
                              return (
                                <CommandItem
                                  key={s.id}
                                  value={`${s.name} ${s.organization?.name || ''} ${s.state || ''} ${s.lga || ''} ${s.code} ${s.id}`.toLowerCase()}
                                  onSelect={() => {
                                    setValue("stationId", s.id, { shouldValidate: true });
                                    setOpenStationSelect(false);
                                  }}
                                  data-checked={selectedStationId === s.id}
                                  className="py-2"
                                >
                                  <div className="flex flex-col text-left gap-0.5 w-full">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-sm truncate">{s.name}</span>
                                      {locationInfo && (
                                        <span className="text-[11px] text-muted-foreground/80 font-medium shrink-0">
                                          {locationInfo}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {s.organization?.name || "No Organization"}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formState.errors.stationId && <p className="text-xs text-destructive">{formState.errors.stationId.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="transportId" className={formState.errors.transportId ? "text-destructive" : ""}>Order / Trip*</Label>
                <Popover open={openTransportSelect} onOpenChange={setOpenTransportSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="transportId"
                      className={`w-full justify-between font-normal ${formState.errors.transportId ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedTransport ? (
                          `${selectedTransport.order?.reference || 'No Ref'}${selectedTransport.order?.sourceDepot ? ` • ${selectedTransport.order.sourceDepot}` : ''} → ${selectedTransport.destination}${selectedTransport.createdAt ? ` (${formatHumanReadableDate(selectedTransport.createdAt)})` : ''}`
                        ) : "Select transport..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search transport..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No transport found.</CommandEmpty>
                        <CommandGroup>
                          {transports.map((t) => {
                            const carried = Number(t.litersCarried || 0);
                            const distributed = (t.deliveries || []).reduce((acc: number, s: any) => acc + Number(s.litersDespatched || 0), 0);
                            const available = Math.max(0, carried - distributed);
                            return (
                              <CommandItem
                                key={t.id}
                                value={`${t.order?.reference || ''} ${t.order?.sourceDepot || ''} ${t.destination} ${t.truck.plateNumber || ''} ${t.truck.name} ${t.transporter?.name || ''} ${t.id}`.toLowerCase()}
                                onSelect={() => {
                                  setValue("transportId", t.id, { shouldValidate: true });
                                  setOpenTransportSelect(false);
                                }}
                                data-checked={selectedTransportId === t.id}
                                className="py-2.5"
                              >
                                <div className="flex flex-col text-left gap-1 w-full">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm truncate">
                                      {t.order?.reference ? `${t.order.reference} • ` : ""}
                                      {t.order?.sourceDepot ? `${t.order.sourceDepot} → ` : ""}
                                      {t.destination}
                                    </span>
                                    <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                                      {available.toLocaleString()} L avail.
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="truncate">
                                      {t.truck.plateNumber || t.truck.name} • {t.transporter.name}
                                    </span>
                                    {t.createdAt && (
                                      <span className="text-[10px] text-muted-foreground/80 shrink-0 ml-2 font-mono">
                                        {formatHumanReadableDate(t.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formState.errors.transportId && <p className="text-xs text-destructive">{formState.errors.transportId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="litersDespatched" className={formState.errors.litersDespatched ? "text-destructive" : ""}>Volume Despatched (L)*</Label>
                  <Controller
                    control={control}
                    name="litersDespatched"
                    render={({ field }) => (
                      <FormattedNumberInput 
                        id="litersDespatched" 
                        placeholder="e.g. 10000" 
                        {...field}
                        className={formState.errors.litersDespatched ? "border-destructive" : ""}
                        prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                      />
                    )}
                  />
                  {formState.errors.litersDespatched && <p className="text-xs text-destructive">{formState.errors.litersDespatched.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPerLiter" className={formState.errors.amountPerLiter ? "text-destructive" : ""}>Selling Price per Liter (₦)*</Label>
                  <Controller
                    control={control}
                    name="amountPerLiter"
                    render={({ field }) => (
                      <FormattedNumberInput 
                        id="amountPerLiter" 
                        placeholder="e.g. 1200" 
                        {...field}
                        className={formState.errors.amountPerLiter ? "border-destructive" : ""}
                        prefixText="₦"
                      />
                    )}
                  />
                  {formState.errors.amountPerLiter && <p className="text-xs text-destructive">{formState.errors.amountPerLiter.message}</p>}
                </div>
              </div>

              <div className="space-y-5 border-t border-border/50 pt-5 mt-2">
                <div className="space-y-3">
                  <Label className={formState.errors.transportCostBorneBy ? "text-destructive" : ""}>Transport Cost Borne By*</Label>
                  <Controller
                    control={control}
                    name="transportCostBorneBy"
                    render={({ field }) => (
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <Label 
                          htmlFor="tc-company" 
                          className="flex cursor-pointer flex-row items-center justify-between rounded-lg border p-4 hover:bg-accent/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">Company</span>
                              <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0">
                                Default
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-normal">Absorbed by the company</span>
                          </div>
                          <RadioGroupItem value="COMPANY" id="tc-company" />
                        </Label>

                        <Label 
                          htmlFor="tc-client" 
                          className="flex cursor-pointer flex-row items-center justify-between rounded-lg border p-4 hover:bg-accent/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm">Client</span>
                            <span className="text-xs text-muted-foreground font-normal">Charged to the customer / self-transport</span>
                          </div>
                          <RadioGroupItem value="CLIENT" id="tc-client" />
                        </Label>
                      </RadioGroup>
                    )}
                  />
                  {formState.errors.transportCostBorneBy && <p className="text-xs text-destructive">{formState.errors.transportCostBorneBy.message}</p>}
                </div>

                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="transportRate" className={formState.errors.transportCostPerLiter ? "text-destructive" : ""}>
                      Transport Rate ({rateMode === "PER_LITER" ? "₦ / Litre" : "Flat Fee Total"})
                    </Label>
                    {rateMode === "FLAT" && litersDespatched > 0 && flatTransportFee > 0 && (
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        ≈ ₦{(flatTransportFee / litersDespatched).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / L
                      </span>
                    )}
                  </div>

                  <div className="flex rounded-md shadow-xs">
                    <div className="relative flex-1">
                      <FormattedNumberInput 
                        id="transportRate" 
                        placeholder={rateMode === "PER_LITER" ? "e.g. 50" : "e.g. 100,000"} 
                        value={rateMode === "PER_LITER" ? (watch("transportCostPerLiter") || "") : (flatTransportFee || "")}
                        onChange={(e: any) => {
                          const val = Number(e.target.value || 0);
                          if (rateMode === "PER_LITER") {
                            setValue("transportCostPerLiter", val, { shouldValidate: true });
                          } else {
                            setFlatTransportFee(val);
                            const perLiter = litersDespatched > 0 ? val / litersDespatched : 0;
                            setValue("transportCostPerLiter", perLiter, { shouldValidate: true });
                          }
                        }}
                        className={`rounded-r-none ${formState.errors.transportCostPerLiter ? "border-destructive" : ""}`}
                        prefixText="₦"
                      />
                    </div>
                    <Select
                      value={rateMode}
                      onValueChange={(val: "PER_LITER" | "FLAT") => {
                        setRateMode(val);
                        if (val === "FLAT") {
                          const currentRate = watch("transportCostPerLiter") || 0;
                          const initialFlat = currentRate * (litersDespatched || 1);
                          setFlatTransportFee(initialFlat);
                        } else {
                          const perLiter = litersDespatched > 0 ? flatTransportFee / litersDespatched : flatTransportFee;
                          setValue("transportCostPerLiter", Number(perLiter.toFixed(2)), { shouldValidate: true });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[230px] rounded-l-none border-l-0 bg-muted/40 hover:bg-muted/70 text-xs font-medium shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" position="popper">
                        <SelectItem value="PER_LITER" className="text-xs">
                          Per Litre
                        </SelectItem>
                        <SelectItem value="FLAT" className="text-xs">
                          Flat Fee
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rateMode === "FLAT" && (!litersDespatched || litersDespatched <= 0) && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Enter volume despatched above to compute the rate per litre.
                    </p>
                  )}
                  {formState.errors.transportCostPerLiter && <p className="text-xs text-destructive">{formState.errors.transportCostPerLiter.message}</p>}
                </div>
              </div>

            </CardContent>
            </Card>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                className="h-10 rounded-full px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formState.isSubmitting}
                className="h-10 rounded-full px-5 gap-2 min-w-[120px]"
              >
                {formState.isSubmitting ? (
                  <>
                    <SpinnerEllipsis />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Log delivery</span>
                  </>
                )}
              </Button>
            </div>
        </div>

        <div className="space-y-6">
          <TripSummaryCard transport={selectedTransport} dispatchVolume={Number(litersDespatched || 0)} />
        </div>
      </div>
    </form>
  );
}

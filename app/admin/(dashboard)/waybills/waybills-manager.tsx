"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
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
import { DataTableToolbar } from "@/components/data-table-toolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, AlertCircle, Truck, User, Eye, ChevronsUpDown } from "lucide-react";
import { WaybillsTable, type WaybillRow } from "./table";

const CreateWaybillSchema = z.object({
  stationId: z.string().min(1),
  number: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive(),
  truckPlate: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  pictures: z.array(z.string()).default([]),
});

const DeliverWaybillSchema = z.object({
  litersReceived: z.coerce.number().positive(),
  gpsLatitude: z.coerce.number().optional().nullable(),
  gpsLongitude: z.coerce.number().optional().nullable(),
  pictures: z.array(z.string()).default([]),
});

export function WaybillsManager({
  initialWaybills,
  stations,
}: {
  initialWaybills: WaybillRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [waybills] = useState<WaybillRow[]>(initialWaybills);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillRow | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openStationSelect, setOpenStationSelect] = useState(false);

  function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const day = date.getDate();
    const suffix = day > 3 && day < 21 ? "th" : ["th","st","nd","rd"][(day % 10) < 4 ? day % 10 : 0];
    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${months[date.getMonth()]} ${day}${suffix} ${date.getFullYear()} ${hours}:${mins}${ampm}`;
  }

  const createForm = useForm({
    resolver: zodResolver(CreateWaybillSchema),
  });

  const deliverForm = useForm({
    resolver: zodResolver(DeliverWaybillSchema),
  });

  const handleCreateWaybill = createForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/waybills", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleDeliverWaybill = deliverForm.handleSubmit(async (values) => {
    if (!selectedWaybill) return;
    setApiError(null);
    const res = await apiPatch(`/api/tenant/waybills/${selectedWaybill.id}`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedWaybill(null);
    setApiError(null);
    createForm.reset();
    deliverForm.reset();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Dispatches & Waybills"
        description="Track fuel distribution movements from depots to retail stations."
        action={
          <Button onClick={() => setActiveDialog("create")}>
            <Plus size={16} className="mr-1" /> New Dispatch
          </Button>
        }
      />

      <WaybillsTable
        data={waybills}
        onViewDetails={(w) => {
          setSelectedWaybill(w);
          setActiveDialog("details");
        }}
        onConfirmDelivery={(w) => {
          setSelectedWaybill(w);
          setActiveDialog("deliver");
        }}
      />

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* 1. Create Waybill Modal */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New Fuel Dispatch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWaybill} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="w_stat" className={createForm.formState.errors.stationId ? "text-destructive" : ""}>
                  Target Retail Station *
                </Label>
                <Controller
                  control={createForm.control}
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
                              createForm.formState.errors.stationId ? "border-destructive" : ""
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
                                        createForm.setValue("stationId", s.id, { shouldValidate: true });
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
                {createForm.formState.errors.stationId && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.stationId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="w_num" className={createForm.formState.errors.number ? "text-destructive" : ""}>
                    Waybill Number *
                  </Label>
                  <Input
                    id="w_num"
                    placeholder="e.g. WB-998811"
                    {...createForm.register("number")}
                    className={createForm.formState.errors.number ? "border-destructive" : ""}
                  />
                  {createForm.formState.errors.number && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.number.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="w_prod" className={createForm.formState.errors.productType ? "text-destructive" : ""}>
                    Product Type *
                  </Label>
                  <Controller
                    control={createForm.control}
                    name="productType"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="w_prod" className={createForm.formState.errors.productType ? "border-destructive w-full" : "w-full"}>
                          <SelectValue placeholder="Select..." />
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
                  {createForm.formState.errors.productType && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.productType.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="w_lit" className={createForm.formState.errors.litersLoaded ? "text-destructive" : ""}>
                    Liters Dispatched *
                  </Label>
                  <Input
                    id="w_lit"
                    type="number"
                    placeholder="e.g. 33000"
                    {...createForm.register("litersLoaded")}
                    className={createForm.formState.errors.litersLoaded ? "border-destructive" : ""}
                  />
                  {createForm.formState.errors.litersLoaded && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.litersLoaded.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="w_plat" className={createForm.formState.errors.truckPlate ? "text-destructive" : ""}>
                    Truck Plate Number *
                  </Label>
                  <Input
                    id="w_plat"
                    placeholder="e.g. LAG-901-AA"
                    {...createForm.register("truckPlate")}
                    className={createForm.formState.errors.truckPlate ? "border-destructive" : ""}
                  />
                  {createForm.formState.errors.truckPlate && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.truckPlate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="w_driv" className={createForm.formState.errors.driverName ? "text-destructive" : ""}>
                    Driver Name *
                  </Label>
                  <Input
                    id="w_driv"
                    placeholder="e.g. Alabi Kazeem"
                    {...createForm.register("driverName")}
                    className={createForm.formState.errors.driverName ? "border-destructive" : ""}
                  />
                  {createForm.formState.errors.driverName && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.driverName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="w_driv_phone" className={createForm.formState.errors.driverPhone ? "text-destructive" : ""}>
                    Driver Phone Number
                  </Label>
                  <Input
                    id="w_driv_phone"
                    placeholder="e.g. +2348012345678"
                    {...createForm.register("driverPhone")}
                    className={createForm.formState.errors.driverPhone ? "border-destructive" : ""}
                  />
                  {createForm.formState.errors.driverPhone && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.driverPhone.message as string}</p>
                  )}
                </div>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Dispatch Truck</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Deliver Waybill Modal */}
      {activeDialog === "deliver" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Confirm Dispatch Delivery</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDeliverWaybill} className="space-y-4">
              <div className="bg-stone-50 border p-3 rounded-lg text-xs space-y-1 dark:bg-stone-900/20 dark:border-stone-800">
                <p>
                  <strong>Waybill No:</strong> {selectedWaybill?.number}
                </p>
                <p>
                  <strong>Destination:</strong> {selectedWaybill?.station.name}
                </p>
                <p>
                  <strong>Expected Vol:</strong> {selectedWaybill ? Number(selectedWaybill.litersLoaded).toLocaleString() : 0} L
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="d_rec" className={deliverForm.formState.errors.litersReceived ? "text-destructive" : ""}>
                  Actual Liters Discharged / Received *
                </Label>
                <Input
                  id="d_rec"
                  type="number"
                  placeholder="e.g. 32980"
                  {...deliverForm.register("litersReceived")}
                  className={deliverForm.formState.errors.litersReceived ? "border-destructive" : ""}
                />
                {deliverForm.formState.errors.litersReceived && (
                  <p className="text-xs text-destructive">{deliverForm.formState.errors.litersReceived.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="d_lat" className={deliverForm.formState.errors.gpsLatitude ? "text-destructive" : ""}>
                    Discharge GPS Latitude
                  </Label>
                  <Input
                    id="d_lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 6.45"
                    {...deliverForm.register("gpsLatitude")}
                    className={deliverForm.formState.errors.gpsLatitude ? "border-destructive" : ""}
                  />
                  {deliverForm.formState.errors.gpsLatitude && (
                    <p className="text-xs text-destructive">{deliverForm.formState.errors.gpsLatitude.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d_lng" className={deliverForm.formState.errors.gpsLongitude ? "text-destructive" : ""}>
                    Discharge GPS Longitude
                  </Label>
                  <Input
                    id="d_lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 3.42"
                    {...deliverForm.register("gpsLongitude")}
                    className={deliverForm.formState.errors.gpsLongitude ? "border-destructive" : ""}
                  />
                  {deliverForm.formState.errors.gpsLongitude && (
                    <p className="text-xs text-destructive">{deliverForm.formState.errors.gpsLongitude.message}</p>
                  )}
                </div>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Log Received Fuel</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {/* ==========================================
          WAYBILL DETAILS DIALOG
      ========================================== */}
      {activeDialog === "details" && selectedWaybill && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Waybill Record Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Compact Unified Details Card */}
              <div className="bg-muted/10 border border-border/40 rounded-xl p-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Waybill & Status */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">Waybill</span>
                      <span className="font-bold text-foreground font-mono text-sm">{selectedWaybill.number}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          selectedWaybill.status === "DISPATCHED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {selectedWaybill.status}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono font-bold">
                        {selectedWaybill.productType}
                      </Badge>
                    </div>
                  </div>

                  {/* Destination & Logistics */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/40 md:pl-4 pt-2 md:pt-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">Destination</span>
                      <span className="font-semibold text-foreground truncate block" title={selectedWaybill.station.name}>
                        {selectedWaybill.station.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">({selectedWaybill.station.code})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">Logistics</span>
                      <span className="font-medium text-foreground block truncate" title={selectedWaybill.driverName}>
                        {selectedWaybill.driverName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        {selectedWaybill.truckPlate}{selectedWaybill.driverPhone ? ` · ${selectedWaybill.driverPhone}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Volumes & Variance */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/40 md:pl-4 pt-2 md:pt-0">
                    <div className="flex justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">Loaded</span>
                        <span className="font-semibold text-foreground font-mono">
                          {Number(selectedWaybill.litersLoaded).toLocaleString()} L
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">Received</span>
                        <span className="font-semibold text-foreground font-mono">
                          {selectedWaybill.litersReceived != null ? (
                            <span className="text-emerald-600 font-bold">
                              {Number(selectedWaybill.litersReceived).toLocaleString()} L
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">Awaiting</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {selectedWaybill.litersReceived != null && (
                      <div className="pt-1 border-t border-border/40">
                        {(() => {
                          const variance = Number(selectedWaybill.litersLoaded) - Number(selectedWaybill.litersReceived);
                          return (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground font-medium">Variance:</span>
                              <span className={`flex items-center gap-1 font-bold font-mono ${
                                variance !== 0 ? "text-rose-500" : "text-emerald-500"
                              }`}>
                                {variance !== 0 ? <AlertCircle size={9} /> : <CheckCircle2 size={9} />}
                                {variance.toLocaleString()} L
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dispatch → Delivery Timeline */}
              <div className="space-y-3">
                <span className="text-xs text-muted-foreground block font-medium">Dispatch Timeline</span>
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                  {/* Dispatched node */}
                  <div className="relative">
                    <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
                    <div>
                      <span className="text-sm font-semibold block">Fuel Dispatched</span>
                      <span className="text-xs text-muted-foreground block">
                        Truck <strong>{selectedWaybill.truckPlate}</strong> loaded with{" "}
                        <strong>{Number(selectedWaybill.litersLoaded).toLocaleString()} L</strong> of{" "}
                        <strong>{selectedWaybill.productType}</strong>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(selectedWaybill.dispatchedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Delivered node */}
                  <div className="relative">
                    {selectedWaybill.status === "DELIVERED" ? (
                      <>
                        <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-emerald-600 border-2 border-background" />
                        <div>
                          <span className="text-sm font-semibold text-emerald-600 block">Delivery Confirmed</span>
                          <span className="text-xs text-muted-foreground block">
                            <strong>{Number(selectedWaybill.litersReceived).toLocaleString()} L</strong> received at{" "}
                            <strong>{selectedWaybill.station.name}</strong>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDate(selectedWaybill.deliveredAt)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-amber-500 border-2 border-background" />
                        <div>
                          <span className="text-sm font-semibold text-amber-500 block">Awaiting Delivery</span>
                          <span className="text-xs text-muted-foreground block">
                            Truck is en route to <strong>{selectedWaybill.station.name}</strong>. Confirm delivery upon arrival.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter showCloseButton={true} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

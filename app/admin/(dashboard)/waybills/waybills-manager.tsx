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
import SpinnerEllipsis from "@/components/spinner-ellipsis";

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
  deliveryDatetime: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
});

export function WaybillsManager({
  initialWaybills,
  stations,
}: {
  initialWaybills: WaybillRow[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const waybills = initialWaybills;
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillRow | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openStationSelect, setOpenStationSelect] = useState(false);

  const createForm = useForm({
    resolver: zodResolver(CreateWaybillSchema),
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

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedWaybill(null);
    setApiError(null);
    createForm.reset();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Dispatches"
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
          router.push(`/admin/waybills/${w.id}`);
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
                  Receiving Station *
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="w_supplier" className={createForm.formState.errors.supplier ? "text-destructive" : ""}>
                    Supplier
                  </Label>
                  <Input
                    id="w_supplier"
                    placeholder="e.g. NNPC"
                    {...createForm.register("supplier")}
                    className={createForm.formState.errors.supplier ? "border-destructive" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="w_depot" className={createForm.formState.errors.depot ? "text-destructive" : ""}>
                    Depot
                  </Label>
                  <Input
                    id="w_depot"
                    placeholder="e.g. Apapa Depot"
                    {...createForm.register("depot")}
                    className={createForm.formState.errors.depot ? "border-destructive" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="w_trans" className={createForm.formState.errors.transportCompany ? "text-destructive" : ""}>
                    Transport Company
                  </Label>
                  <Input
                    id="w_trans"
                    placeholder="e.g. Dangote Trans"
                    {...createForm.register("transportCompany")}
                    className={createForm.formState.errors.transportCompany ? "border-destructive" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="w_del_date" className={createForm.formState.errors.deliveryDatetime ? "text-destructive" : ""}>
                    Expected Delivery Date/Time
                  </Label>
                  <Input
                    id="w_del_date"
                    type="datetime-local"
                    {...createForm.register("deliveryDatetime")}
                    className={createForm.formState.errors.deliveryDatetime ? "border-destructive" : ""}
                  />
                </div>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit" disabled={createForm.formState.isSubmitting} className="gap-2">
                  {createForm.formState.isSubmitting ? (
                    <>
                      <SpinnerEllipsis />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    "Dispatch Truck"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* (Waybill Details Modal has been removed and replaced with a full page view) */}
    </div>
  );
}

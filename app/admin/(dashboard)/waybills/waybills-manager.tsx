"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Truck, Plus, CheckCircle2, AlertCircle } from "lucide-react";

const CreateWaybillSchema = z.object({
  stationId: z.string().min(1),
  number: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive(),
  truckPlate: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
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
  initialWaybills: any[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [waybills] = useState<any[]>(initialWaybills);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {waybills.length === 0 ? (
          <Card className="col-span-3 p-8 text-center text-stone-500 text-sm">
            No waybills or dispatches recorded yet.
          </Card>
        ) : (
          waybills.map((w) => {
            const pending = w.status === "DISPATCHED";
            const variance = w.litersReceived ? Number(w.litersLoaded) - Number(w.litersReceived) : 0;

            return (
              <Card
                key={w.id}
                className={`shadow-sm border-l-4 ${
                  pending ? "border-l-amber-500" : "border-l-emerald-500"
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{w.number}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            pending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        Station: {w.station.name} ({w.station.code})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      {w.productType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y py-2.5">
                    <div>
                      <span className="text-stone-500">Truck Plate:</span>
                      <p className="font-medium">{w.truckPlate}</p>
                    </div>
                    <div>
                      <span className="text-stone-500">Driver Name:</span>
                      <p className="font-medium">{w.driverName}</p>
                    </div>
                    <div className="mt-1">
                      <span className="text-stone-500">Liters Loaded:</span>
                      <p className="font-bold text-sm text-stone-800">
                        {Number(w.litersLoaded).toLocaleString()} L
                      </p>
                    </div>
                    {w.litersReceived && (
                      <div className="mt-1">
                        <span className="text-stone-500">Liters Received:</span>
                        <p className="font-bold text-sm text-emerald-600">
                          {Number(w.litersReceived).toLocaleString()} L
                        </p>
                      </div>
                    )}
                  </div>

                  {pending ? (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="xs"
                        onClick={() => {
                          setSelectedWaybill(w);
                          setActiveDialog("deliver");
                        }}
                      >
                        Confirm Delivery
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-1 text-[10px] text-stone-400">
                      <span>Delivered: {w.deliveredAt ? new Date(w.deliveredAt).toLocaleDateString() : ""}</span>
                      {w.litersReceived && (
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            variance !== 0 ? "text-rose-500" : "text-emerald-500"
                          }`}
                        >
                          {variance !== 0 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                          Var: {variance.toLocaleString()} L
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* 1. Create Waybill Modal */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Fuel Dispatch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWaybill} className="space-y-4">
              <FormField
                label="Target Retail Station"
                htmlFor="w_stat"
                error={createForm.formState.errors.stationId?.message}
              >
                <select
                  id="w_stat"
                  className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...createForm.register("stationId")}
                >
                  <option value="">Select Station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Waybill Number"
                  htmlFor="w_num"
                  error={createForm.formState.errors.number?.message}
                >
                  <TextInput id="w_num" placeholder="e.g. WB-998811" {...createForm.register("number")} />
                </FormField>

                <FormField
                  label="Product Type"
                  htmlFor="w_prod"
                  error={createForm.formState.errors.productType?.message}
                >
                  <select
                    id="w_prod"
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                    {...createForm.register("productType")}
                  >
                    <option value="">Select...</option>
                    <option value="PMS">PMS (Petrol)</option>
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="DPK">DPK (Kerosene)</option>
                    <option value="LPG">LPG (Gas)</option>
                  </select>
                </FormField>
              </div>

              <FormField
                label="Liters Loaded"
                htmlFor="w_lit"
                error={createForm.formState.errors.litersLoaded?.message}
              >
                <TextInput id="w_lit" type="number" placeholder="e.g. 33000" {...createForm.register("litersLoaded")} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Truck Plate Number"
                  htmlFor="w_plat"
                  error={createForm.formState.errors.truckPlate?.message}
                >
                  <TextInput id="w_plat" placeholder="e.g. LAG-901-AA" {...createForm.register("truckPlate")} />
                </FormField>

                <FormField
                  label="Driver Name"
                  htmlFor="w_driv"
                  error={createForm.formState.errors.driverName?.message}
                >
                  <TextInput id="w_driv" placeholder="e.g. Alabi Kazeem" {...createForm.register("driverName")} />
                </FormField>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Dispatch Delivery</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDeliverWaybill} className="space-y-4">
              <div className="bg-stone-50 border p-3 rounded-lg text-xs space-y-1">
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

              <FormField
                label="Actual Liters Discharged / Received"
                htmlFor="d_rec"
                error={deliverForm.formState.errors.litersReceived?.message}
              >
                <TextInput id="d_rec" type="number" placeholder="e.g. 32980" {...deliverForm.register("litersReceived")} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Discharge GPS Latitude"
                  htmlFor="d_lat"
                  error={deliverForm.formState.errors.gpsLatitude?.message}
                >
                  <TextInput id="d_lat" type="number" step="any" placeholder="e.g. 6.45" {...deliverForm.register("gpsLatitude")} />
                </FormField>

                <FormField
                  label="Discharge GPS Longitude"
                  htmlFor="d_lng"
                  error={deliverForm.formState.errors.gpsLongitude?.message}
                >
                  <TextInput id="d_lng" type="number" step="any" placeholder="e.g. 3.42" {...deliverForm.register("gpsLongitude")} />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Log Received Fuel</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

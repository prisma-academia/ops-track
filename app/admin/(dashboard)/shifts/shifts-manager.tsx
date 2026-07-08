"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatHumanReadableDate } from "@/lib/utils";

const StartShiftSchema = z.object({
  stationId: z.string().min(1, "Please select a station"),
  pumpId: z.string().min(1, "Please select a pump"),
  nozzleId: z.string().min(1, "Please select a nozzle"),
  attendantId: z.string().min(1, "Please select an attendant"),
  openingMeter: z.coerce.number().nonnegative("Opening meter must be non-negative"),
  shiftDate: z.string().min(1, "Please select a shift date"),
});

const CloseShiftSchema = z.object({
  closingMeter: z.coerce.number().nonnegative("Closing meter must be non-negative"),
  declaredCash: z.coerce.number().nonnegative("Cash must be non-negative"),
  declaredPos: z.coerce.number().nonnegative("POS must be non-negative"),
  declaredTransfer: z.coerce.number().nonnegative("Transfer must be non-negative"),
});

export function ShiftsManager({
  shifts,
  stations,
  tenantUsers,
  activeStationId,
}: {
  shifts: any[];
  stations: any[];
  tenantUsers: any[];
  activeStationId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("active");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedCloseShift, setSelectedCloseShift] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultStationId = activeStationId && activeStationId !== "all" ? activeStationId : "";

  const startShiftForm = useForm({
    resolver: zodResolver(StartShiftSchema),
    defaultValues: {
      stationId: defaultStationId,
      pumpId: "",
      nozzleId: "",
      attendantId: "",
      openingMeter: 0,
      shiftDate: new Date().toISOString().split("T")[0],
    },
  });

  const closeShiftForm = useForm({
    resolver: zodResolver(CloseShiftSchema),
    defaultValues: {
      closingMeter: 0,
      declaredCash: 0,
      declaredPos: 0,
      declaredTransfer: 0,
    },
  });

  const handleStartShift = startShiftForm.handleSubmit(async (values) => {
    setApiError(null);
    const { stationId, pumpId, ...payload } = values;
    const res = await apiPost(`/api/tenant/stations/${stationId}/shifts`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleCloseShift = closeShiftForm.handleSubmit(async (values) => {
    if (!selectedCloseShift) return;
    setApiError(null);
    const stationId = selectedCloseShift.nozzle.pump.station.id;
    const res = await apiPost(
      `/api/tenant/stations/${stationId}/shifts/${selectedCloseShift.id}/close`,
      values
    );
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleReconcileShift = async (shift: any) => {
    const stationId = shift.nozzle.pump.station.id;
    const res = await apiPost(`/api/tenant/stations/${stationId}/shifts/${shift.id}/reconcile`, {});
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedCloseShift(null);
    setApiError(null);
    startShiftForm.reset({
      stationId: defaultStationId,
      pumpId: "",
      nozzleId: "",
      attendantId: "",
      openingMeter: 0,
      shiftDate: new Date().toISOString().split("T")[0],
    });
    closeShiftForm.reset();
    router.refresh();
  };

  const watchedStationId = startShiftForm.watch("stationId");
  const selectedStation = stations.find((s) => s.id === watchedStationId);
  const availablePumps = selectedStation?.pumps || [];

  const watchedPumpId = startShiftForm.watch("pumpId");
  const selectedPump = availablePumps.find((p: any) => p.id === watchedPumpId);
  const availableNozzles = selectedPump?.nozzles || [];

  const activeShifts = shifts.filter((s) => s.closingMeter === null);
  const historicalShifts = shifts.filter((s) => s.closingMeter !== null);

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Shift Reports"
        description="Monitor active dispenser shifts, closing declarations, cash variances, and reconciliation logs."
        action={
          <Button onClick={() => setActiveDialog("startShift")}>
            <Plus size={16} className="mr-1" /> Start Shift
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Shifts ({activeShifts.length})
          </TabsTrigger>
          <TabsTrigger value="historical">
            Shift History ({historicalShifts.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Shifts */}
        <TabsContent value="active" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeShifts.length === 0 ? (
              <Card className="col-span-full p-6 text-center text-muted-foreground text-sm">
                No active attendant shifts running.
              </Card>
            ) : (
              activeShifts.map((shift) => (
                <Card key={shift.id} className="relative overflow-hidden border-amber-500/20 bg-card text-card-foreground">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-bl font-bold uppercase tracking-wider">
                    Ongoing
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex flex-col">
                      <span>
                        {shift.attendant
                          ? `${shift.attendant.firstName ?? ""} ${shift.attendant.lastName ?? ""}`.trim()
                          : "Unknown"}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground font-mono mt-0.5">
                        {shift.nozzle.pump.station.name} ({shift.nozzle.pump.station.code})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 text-sm">
                    <div className="border-t pt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pump / Nozzle:</span>
                        <span className="font-semibold">
                          {shift.nozzle.pump.name} — {shift.nozzle.name} ({shift.nozzle.pump.tank.productType})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Opening Meter:</span>
                        <span className="font-mono font-bold">
                          {Number(shift.openingMeter).toLocaleString()} L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started Date:</span>
                        <span>{formatHumanReadableDate(shift.shiftDate)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedCloseShift(shift);
                          setActiveDialog("closeShift");
                        }}
                      >
                        Close Shift & Enter Readings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Shift History */}
        <TabsContent value="historical" className="mt-4">
          <Card className="overflow-hidden shadow-sm bg-card border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase">Date</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase">Station</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase">Attendant</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase">Dispenser (Nozzle)</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-right">Meters (Op/Cl)</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-right">Liters Sold</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-right">Declarations (Cash/POS/Trans)</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-center">Reconciliation Status</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-right">Cash Variance</th>
                    <th className="px-6 py-3 font-bold text-muted-foreground text-xs uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historicalShifts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-6 text-center text-muted-foreground">
                        No shift logs found.
                      </td>
                    </tr>
                  ) : (
                    historicalShifts.map((shift: any) => {
                      const reconciled = !!shift.reconciledAt;
                      return (
                        <tr key={shift.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3 whitespace-nowrap">{formatHumanReadableDate(shift.shiftDate)}</td>
                          <td className="px-6 py-3">
                            <span className="font-semibold text-foreground">{shift.nozzle.pump.station.name}</span>
                            <span className="text-[10px] text-muted-foreground block font-mono">{shift.nozzle.pump.station.code}</span>
                          </td>
                          <td className="px-6 py-3 font-medium">
                            {shift.attendant ? `${shift.attendant.firstName ?? ""} ${shift.attendant.lastName ?? ""}`.trim() : "Unknown"}
                          </td>
                          <td className="px-6 py-3">
                            {shift.nozzle.pump.name} — {shift.nozzle.name} ({shift.nozzle.pump.tank.productType})
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-xs">
                            {Number(shift.openingMeter).toLocaleString()} / {Number(shift.closingMeter).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-foreground">
                            {Number(shift.litersSold).toLocaleString()} L
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-xs">
                            {`${Number(shift.declaredCash).toLocaleString()} / ${Number(shift.declaredPos).toLocaleString()} / ${Number(shift.declaredTransfer).toLocaleString()}`}
                          </td>
                          <td className="px-6 py-3 text-center text-xs">
                            {reconciled ? (
                              <span className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 size={12} />
                                Reconciled by {shift.reconciledBy?.firstName ?? "Yes"}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded font-bold uppercase">
                                Closed
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-3 text-right font-bold ${reconciled ? (Number(shift.varianceCash) < 0 ? "text-rose-600" : "text-emerald-600") : "text-muted-foreground"}`}>
                            {reconciled ? `${Number(shift.varianceCash).toLocaleString()}` : "—"}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {!reconciled ? (
                              <Button size="xs" onClick={() => handleReconcileShift(shift)}>
                                Reconcile
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Locked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Shift Dialog */}
      {activeDialog === "startShift" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start Attendant Shift</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleStartShift} className="space-y-4">
              <FormField label="Current Date & Time" htmlFor="s_datetime">
                <TextInput id="s_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Select Station" htmlFor="s_stat" error={startShiftForm.formState.errors.stationId?.message}>
                  <select
                    id="s_stat"
                    className="w-full rounded border border-input bg-background text-foreground px-3 py-2 text-sm"
                    {...startShiftForm.register("stationId")}
                  >
                    <option value="">Select station...</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Attendant" htmlFor="s_att" error={startShiftForm.formState.errors.attendantId?.message}>
                  <select
                    id="s_att"
                    className="w-full rounded border border-input bg-background text-foreground px-3 py-2 text-sm"
                    {...startShiftForm.register("attendantId")}
                  >
                    <option value="">Select attendant...</option>
                    {tenantUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <FormField label="Dispensing Pump" htmlFor="s_pump" error={startShiftForm.formState.errors.pumpId?.message}>
                  <select
                    id="s_pump"
                    className="w-full rounded border border-input bg-background text-foreground px-3 py-2 text-sm"
                    {...startShiftForm.register("pumpId")}
                    disabled={!watchedStationId}
                  >
                    <option value="">Select pump...</option>
                    {availablePumps.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.tank.productType})</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Dispensing Nozzle" htmlFor="s_noz" error={startShiftForm.formState.errors.nozzleId?.message}>
                  <select
                    id="s_noz"
                    className="w-full rounded border border-input bg-background text-foreground px-3 py-2 text-sm"
                    {...startShiftForm.register("nozzleId")}
                    disabled={!watchedPumpId}
                  >
                    <option value="">Select nozzle...</option>
                    {availableNozzles.map((n: any) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Shift Date" htmlFor="s_date" error={startShiftForm.formState.errors.shiftDate?.message}>
                  <TextInput id="s_date" type="date" {...startShiftForm.register("shiftDate")} />
                </FormField>

                <FormField label="Opening Meter Reading (L)" htmlFor="s_op" error={startShiftForm.formState.errors.openingMeter?.message}>
                  <TextInput id="s_op" type="number" {...startShiftForm.register("openingMeter")} />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-rose-600 font-semibold">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Open Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Close Shift Dialog */}
      {activeDialog === "closeShift" && selectedCloseShift && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Close Attendant Shift</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-muted/50 border p-3 rounded-lg text-xs space-y-1">
                <div>
                  <strong>Attendant:</strong>{" "}
                  {selectedCloseShift.attendant
                    ? `${selectedCloseShift.attendant.firstName ?? ""} ${selectedCloseShift.attendant.lastName ?? ""}`.trim()
                    : "Unknown"}
                </div>
                <div>
                  <strong>Nozzle:</strong> {selectedCloseShift.nozzle.pump.name} - {selectedCloseShift.nozzle.name} (
                  {selectedCloseShift.nozzle.pump.tank.productType})
                </div>
                <div>
                  <strong>Opening Meter:</strong> {Number(selectedCloseShift.openingMeter).toLocaleString()} L
                </div>
              </div>

              <FormField label="Current Date & Time" htmlFor="c_datetime">
                <TextInput id="c_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <FormField label="Closing Meter Reading (L)" htmlFor="c_cl" error={closeShiftForm.formState.errors.closingMeter?.message}>
                <TextInput id="c_cl" type="number" {...closeShiftForm.register("closingMeter")} />
              </FormField>

              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                <FormField label="Cash (₦)" htmlFor="c_cash" error={closeShiftForm.formState.errors.declaredCash?.message}>
                  <TextInput id="c_cash" type="number" {...closeShiftForm.register("declaredCash")} />
                </FormField>
                <FormField label="POS (₦)" htmlFor="c_pos" error={closeShiftForm.formState.errors.declaredPos?.message}>
                  <TextInput id="c_pos" type="number" {...closeShiftForm.register("declaredPos")} />
                </FormField>
                <FormField label="Bank Trans. (₦)" htmlFor="c_trans" error={closeShiftForm.formState.errors.declaredTransfer?.message}>
                  <TextInput id="c_trans" type="number" {...closeShiftForm.register("declaredTransfer")} />
                </FormField>
              </div>

              {apiError && <p className="text-xs text-rose-600 font-semibold">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Submit Close & Declarations</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

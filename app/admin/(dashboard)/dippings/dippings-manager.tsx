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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClipboardList } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";

const RecordDippingSchema = z.object({
  tankId: z.string().min(1, "Please select a tank"),
  dippingLiters: z.coerce.number().nonnegative("Volume must be non-negative"),
  reason: z.enum(["ROUTINE", "WAYBILL_DELIVERY", "PRICE_CHANGE"]),
  pricePerLiter: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  recordedAt: z.string().min(1),
});

export function DippingsManager({
  dippings,
  tanks,
  activeShifts,
  activeStationId,
}: {
  dippings: any[];
  tanks: any[];
  activeShifts: any[];
  activeStationId?: string;
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const dippingForm = useForm({
    resolver: zodResolver(RecordDippingSchema),
    defaultValues: {
      tankId: "",
      dippingLiters: 0,
      reason: "ROUTINE" as any,
      pricePerLiter: "",
      recordedAt: new Date().toISOString(),
    },
  });

  const handleRecordDipping = dippingForm.handleSubmit(async (values) => {
    setApiError(null);
    const selectedTank = tanks.find((t) => t.id === values.tankId);
    if (!selectedTank) {
      setApiError("Invalid tank selected");
      return;
    }
    const res = await apiPost(`/api/tenant/stations/${selectedTank.station.id}/dippings`, values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    dippingForm.reset({
      tankId: "",
      dippingLiters: 0,
      reason: "ROUTINE" as any,
      pricePerLiter: "",
      recordedAt: new Date().toISOString(),
    });
    router.refresh();
  };

  const watchedTankId = dippingForm.watch("tankId");
  const selectedTank = watchedTankId ? tanks.find((t) => t.id === watchedTankId) : null;

  // Filter active shifts connected to nozzles drawing from the selected tank
  const connectedActiveShifts = selectedTank
    ? activeShifts.filter((s: any) => s.nozzle?.pump?.tankId === selectedTank.id)
    : [];

  const hasOngoingShifts = connectedActiveShifts.length > 0;

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Dipping Records"
        description="View and record underground tank fuel level dipping adjustments across all station facilities."
        action={
          <Button onClick={() => setActiveDialog("recordDipping")}>
            <ClipboardList size={16} className="mr-1" /> Record Dipping
          </Button>
        }
      />

      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Date & Time</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Station</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Tank</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Product</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-center">Reason / Shift</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-right">Dipped Volume</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-right">Capacity</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {dippings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-stone-500">
                    No dipping records found.
                  </td>
                </tr>
              ) : (
                dippings.map((dip: any) => {
                  const capacity = Number(dip.tank.capacity);
                  const volume = Number(dip.dippingLiters);
                  const pct = capacity > 0 ? Math.min(100, Math.round((volume / capacity) * 100)) : 0;
                  return (
                    <tr key={dip.id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-3 whitespace-nowrap">{formatHumanReadableDate(dip.recordedAt)}</td>
                      <td className="px-6 py-3 font-semibold text-stone-800">{dip.tank.station.name}</td>
                      <td className="px-6 py-3 font-medium">{dip.tank.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-stone-600">{dip.tank.productType}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          dip.reason === "WAYBILL_DELIVERY"
                            ? "bg-blue-100 text-blue-800"
                            : dip.reason === "PRICE_CHANGE"
                            ? "bg-purple-100 text-purple-800"
                            : dip.reason === "ROUTINE"
                            ? "bg-stone-100 text-stone-800"
                            : dip.shift === "MORNING"
                            ? "bg-amber-100 text-amber-800"
                            : dip.shift === "EVENING"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-stone-100 text-stone-800"
                        }`}>
                          {dip.reason || dip.shift || "ROUTINE"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-stone-800">{volume.toLocaleString()} L</td>
                      <td className="px-6 py-3 text-right font-mono text-stone-500">{capacity.toLocaleString()} L</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600">{pct}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Dipping Dialog */}
      {activeDialog === "recordDipping" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Tank Dipping</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordDipping} className="space-y-4">
              <FormField label="Current Date & Time" htmlFor="d_datetime">
                <TextInput id="d_datetime" value={formatHumanReadableDate(new Date())} disabled className="bg-muted text-muted-foreground border-border" />
              </FormField>

              <FormField label="Tank to Dip" htmlFor="d_tank" error={dippingForm.formState.errors.tankId?.message}>
                <select
                  id="d_tank"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...dippingForm.register("tankId")}
                >
                  <option value="">Select tank...</option>
                  {tanks.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.station.name} — {t.name} ({t.productType}) (Capacity: {Number(t.capacity).toLocaleString()} L)
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Dipped Liters Volume" htmlFor="d_vol" error={dippingForm.formState.errors.dippingLiters?.message}>
                <TextInput id="d_vol" type="number" step="any" placeholder="e.g. 15420.50" {...dippingForm.register("dippingLiters")} />
              </FormField>

              <FormField label="Dipping Reason / Cause" htmlFor="d_reason" error={dippingForm.formState.errors.reason?.message}>
                <select
                  id="d_reason"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...dippingForm.register("reason")}
                >
                  <option value="ROUTINE">Routine Operational Check</option>
                  <option value="WAYBILL_DELIVERY">Waybill / Fuel Delivery Arrival</option>
                  <option value="PRICE_CHANGE">Price Change Adjustment</option>
                </select>
              </FormField>

              {/* Show new price input if reason is WAYBILL_DELIVERY or PRICE_CHANGE */}
              {(dippingForm.watch("reason") === "WAYBILL_DELIVERY" || dippingForm.watch("reason") === "PRICE_CHANGE") && (
                <FormField
                  label="New Fuel Price Per Liter (Optional, ₦)"
                  htmlFor="d_price"
                  error={dippingForm.formState.errors.pricePerLiter?.message}
                >
                  <TextInput id="d_price" type="number" step="0.01" placeholder="e.g. 680.00" {...dippingForm.register("pricePerLiter")} />
                </FormField>
              )}

              {/* Active shift validation warning */}
              {hasOngoingShifts && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex gap-2 items-start">
                  <div className="size-4 shrink-0 mt-0.5">⚠️</div>
                  <div>
                    <span className="font-bold">Ongoing shifts active on this tank:</span>
                    <ul className="list-disc list-inside mt-1 font-mono">
                      {connectedActiveShifts.map((s: any) => (
                        <li key={s.id}>
                          {s.nozzle?.pump?.name} — Nozzle {s.nozzle?.name} ({s.attendant?.firstName ?? ""} {s.attendant?.lastName ?? ""})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] font-sans">
                      All active shifts must be closed before recording dipping for this tank.
                    </p>
                  </div>
                </div>
              )}

              <input type="hidden" value={new Date().toISOString()} {...dippingForm.register("recordedAt")} />

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button
                  type="submit"
                  disabled={hasOngoingShifts}
                >
                  Record Dipping
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

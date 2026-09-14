"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChartIcon, Edit3, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiPatch, apiDelete } from "@/lib/client/api";
import { formatHumanReadableDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SerializedDipping = {
  id: string;
  waybillId: string;
  waybillAllocationId: string;
  tankId: string;
  beforeLiters: number;
  afterLiters: number | null;
  createdAt: string;
  tank: {
    id: string;
    name: string;
    stationId: string;
    capacity: number;
    currentLiters: number;
    productType: string;
    station: {
      id: string;
      name: string;
    };
  };
  recordedBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type CompatibleTank = {
  id: string;
  name: string;
  stationId: string;
  capacity: number;
  currentLiters: number;
  productType: string;
};

interface DischargeDippingsTableProps {
  waybillId: string;
  waybillNumber: string;
  litersLoaded: number;
  dippings: SerializedDipping[];
  compatibleTanks: CompatibleTank[];
  canEdit: boolean;
}

export function DischargeDippingsTable({
  waybillId,
  waybillNumber,
  litersLoaded,
  dippings,
  compatibleTanks,
  canEdit,
}: DischargeDippingsTableProps) {
  const router = useRouter();
  const [selectedDip, setSelectedDip] = useState<SerializedDipping | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form states
  const [tankId, setTankId] = useState("");
  const [beforeLiters, setBeforeLiters] = useState<string>("");
  const [afterLiters, setAfterLiters] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditModal = (dip: SerializedDipping) => {
    setSelectedDip(dip);
    setTankId(dip.tankId);
    setBeforeLiters(String(dip.beforeLiters));
    setAfterLiters(String(dip.afterLiters ?? dip.beforeLiters));
    setReason("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSubmitting || isDeleting) return;
    setEditModalOpen(false);
    setSelectedDip(null);
  };

  // Calculations for live preview in edit modal
  const selectedTank = compatibleTanks.find((t) => t.id === tankId) || selectedDip?.tank;
  const numBefore = parseFloat(beforeLiters) || 0;
  const numAfter = parseFloat(afterLiters) || 0;
  const newNet = numAfter - numBefore;

  const oldBefore = selectedDip ? selectedDip.beforeLiters : 0;
  const oldAfter = selectedDip && selectedDip.afterLiters != null ? selectedDip.afterLiters : 0;
  const oldNet = oldAfter - oldBefore;
  const netDelta = newNet - oldNet;

  const tankCapacity = selectedTank ? Number(selectedTank.capacity) : 0;
  const exceedsCapacity = tankCapacity > 0 && numAfter > tankCapacity;

  // Station tanks available for the currently selected dipping's station
  const stationTanks = selectedDip
    ? compatibleTanks.filter((t) => t.stationId === selectedDip.tank.stationId)
    : [];

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDip) return;

    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please provide a reason for this edit (at least 3 characters).");
      return;
    }

    if (numAfter < numBefore) {
      toast.error("After liters cannot be less than before liters.");
      return;
    }

    if (exceedsCapacity) {
      toast.error(
        `After reading (${numAfter.toLocaleString()} L) exceeds tank capacity of ${tankCapacity.toLocaleString()} L.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPatch<{ dipping: unknown; totalReceived: number }>(
        `/api/tenant/waybills/${waybillId}/dippings/${selectedDip.id}`,
        {
          tankId,
          beforeLiters: numBefore,
          afterLiters: numAfter,
          reason: reason.trim(),
        }
      );

      if (res.error) {
        toast.error(res.error.message || "Failed to update dipping.");
        return;
      }

      toast.success("Waybill discharge dipping updated successfully.");
      setEditModalOpen(false);
      setSelectedDip(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDipping = async () => {
    if (!selectedDip) return;

    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please provide a reason for deleting this dipping entry.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await apiDelete<{ success: boolean; totalReceived: number }>(
        `/api/tenant/waybills/${waybillId}/dippings/${selectedDip.id}`,
        { reason: reason.trim() }
      );

      if (res.error) {
        toast.error(res.error.message || "Failed to delete dipping.");
        return;
      }

      toast.success("Dipping record deleted and stock balances reconciled.");
      setDeleteConfirmOpen(false);
      setEditModalOpen(false);
      setSelectedDip(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalDischarged = dippings.reduce((acc, dip) => {
    return acc + (dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0);
  }, 0);

  const variance = totalDischarged - litersLoaded;

  return (
    <>
      <Card className="shadow-xs border-border/40 w-full p-0 overflow-hidden rounded-xl bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-border/40 bg-muted/20 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BarChartIcon className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-sm font-semibold">Discharge Dippings</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-medium">
                  {dippings.length} {dippings.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Physical tank dipstick readings logged at destination stations</p>
            </div>
          </div>
          {canEdit && (
            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md border border-border/50 self-start sm:self-auto font-normal">
              Click <span className="font-semibold text-foreground">&quot;Edit&quot;</span> to correct dip readings or reassign tanks.
            </span>
          )}
        </div>
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Station</TableHead>
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Tank</TableHead>
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Recorded By</TableHead>
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
              <TableHead className="text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Before</TableHead>
              <TableHead className="text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">After</TableHead>
              <TableHead className="text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Net</TableHead>
              {canEdit && <TableHead className="w-[90px] text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dippings.map((dip) => {
              const net = dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0;
              return (
                <TableRow key={dip.id} className="text-sm">
                  <TableCell className="font-semibold">{dip.tank.station.name}</TableCell>
                  <TableCell className="font-medium">{dip.tank.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dip.recordedBy
                      ? `${dip.recordedBy.firstName || ""} ${dip.recordedBy.lastName || ""}`.trim() || "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatHumanReadableDate(dip.createdAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(dip.beforeLiters).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {dip.afterLiters ? (
                      Number(dip.afterLiters).toLocaleString()
                    ) : (
                      <span className="text-muted-foreground italic">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {net.toLocaleString()}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => openEditModal(dip)}
                      >
                        <Edit3 className="size-3.5 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-transparent border-t">
            <TableRow className="hover:bg-transparent border-b-0">
              <TableCell colSpan={canEdit ? 7 : 6} className="text-right text-muted-foreground pb-1">
                Total Loaded Quantity
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium pb-1">
                {litersLoaded.toLocaleString()}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-transparent border-b-0">
              <TableCell colSpan={canEdit ? 7 : 6} className="text-right text-muted-foreground py-1">
                Discharged
              </TableCell>
              <TableCell className="text-right tabular-nums font-bold text-foreground py-1">
                {totalDischarged.toLocaleString()}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={canEdit ? 7 : 6} className="text-right text-muted-foreground pt-1">
                Variance
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-bold pt-1 ${
                  variance < 0
                    ? "text-rose-600 dark:text-rose-500"
                    : variance > 0
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-emerald-600 dark:text-emerald-500"
                }`}
              >
                {variance > 0 ? "+" : ""}
                {variance.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Edit Dipping Modal */}
      <Dialog open={editModalOpen} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Waybill Dipping</DialogTitle>
            <DialogDescription>
              Correct dipping readings or reassign to the proper tank. Inventory and delivery loss metrics will be
              automatically updated.
            </DialogDescription>
          </DialogHeader>

          {selectedDip && (
            <form onSubmit={handleSaveEdit} className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Form Fields & Details (8 cols on md+) */}
                <div className="md:col-span-8 space-y-4">
                  <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Waybill:</span>
                      <span className="font-semibold">{waybillNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Station:</span>
                      <span className="font-semibold">{selectedDip.tank.station.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Originally Recorded By:</span>
                      <span>
                        {selectedDip.recordedBy
                          ? `${selectedDip.recordedBy.firstName || ""} ${selectedDip.recordedBy.lastName || ""}`.trim() || "—"
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date Recorded:</span>
                      <span>{formatHumanReadableDate(selectedDip.createdAt)}</span>
                    </div>
                  </div>

                  {/* Tank Selector */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tank" className="text-xs font-semibold">
                      Discharge Tank
                    </Label>
                    <Select value={tankId} onValueChange={setTankId} disabled={isSubmitting || isDeleting}>
                      <SelectTrigger id="tank" className="w-full">
                        <SelectValue placeholder="Select tank" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {stationTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.name} (Capacity: {Number(tank.capacity).toLocaleString()} L)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTank && (
                      <p className="text-[11px] text-muted-foreground">
                        Current stock level: {Number(selectedTank.currentLiters).toLocaleString()} L /{" "}
                        {Number(selectedTank.capacity).toLocaleString()} L
                      </p>
                    )}
                  </div>

                  {/* Before & After Liters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="beforeLiters" className="text-xs font-semibold">
                        Before Liters
                      </Label>
                      <FormattedNumberInput
                        id="beforeLiters"
                        value={beforeLiters}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBeforeLiters(e.target.value)}
                        placeholder="e.g. 5,000"
                        disabled={isSubmitting || isDeleting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="afterLiters" className="text-xs font-semibold">
                        After Liters
                      </Label>
                      <FormattedNumberInput
                        id="afterLiters"
                        value={afterLiters}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAfterLiters(e.target.value)}
                        placeholder="e.g. 15,000"
                        disabled={isSubmitting || isDeleting}
                      />
                    </div>
                  </div>

                  {/* Net Discharged live preview */}
                  <div className="rounded-lg border p-3 bg-muted/20 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Original Discharged:</span>
                      <span className="font-medium">{oldNet.toLocaleString()} L</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span>New Discharged Net:</span>
                      <span className={newNet < 0 ? "text-rose-600" : "text-emerald-600"}>
                        {newNet.toLocaleString()} L
                      </span>
                    </div>
                    {netDelta !== 0 && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t">
                        <span className="text-muted-foreground">Adjustment Difference:</span>
                        <span className={`font-semibold ${netDelta > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                          {netDelta > 0 ? "+" : ""}
                          {netDelta.toLocaleString()} L
                        </span>
                      </div>
                    )}
                    {exceedsCapacity && (
                      <div className="flex items-center gap-1.5 text-rose-600 font-medium text-[11px] pt-1">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>After reading exceeds tank capacity ({tankCapacity.toLocaleString()} L).</span>
                      </div>
                    )}
                  </div>

                  {/* Justification / Reason */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reason" className="text-xs font-semibold">
                      Reason for Correction <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Typo by attendant on mobile app, corrected after reading"
                      className="h-20 text-xs resize-none"
                      disabled={isSubmitting || isDeleting}
                    />
                  </div>
                </div>

                {/* Right Column: Actions Vertically Arranged (4 cols on md+) */}
                <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-4">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:block">
                      Actions
                    </div>
                    <Button
                      type="submit"
                      size="default"
                      className="w-full"
                      disabled={isSubmitting || isDeleting || exceedsCapacity}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="w-full"
                      onClick={closeEditModal}
                      disabled={isSubmitting || isDeleting}
                    >
                      Cancel
                    </Button>

                    <div className="pt-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={isSubmitting || isDeleting}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete Dipping
                      </Button>
                    </div>
                  </div>

                  {/* Help notice in sidebar */}
                  <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground hidden md:block space-y-1 border">
                    <p className="font-semibold text-foreground">Safe Stock Recalculation</p>
                    <p>
                      Submitting will update the allocation received quantity and reconcile physical tank stock levels automatically.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="size-5" /> Delete Discharge Dipping?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Are you sure you want to delete this dipping record? This will permanently remove this discharge
                volume ({oldNet.toLocaleString()} L) from the station&apos;s physical inventory and recalculate the
                waybill delivery received total.
              </p>
              {!reason.trim() && (
                <p className="text-rose-500 font-medium">
                  Note: Please provide a reason in the form before confirming deletion.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDeleteDipping}
              disabled={isDeleting || !reason.trim()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Truck, MapPin, ExternalLink, AlertCircle, Check, Eye, Package, ClipboardCheck, Loader2, Container, ChevronsUpDown, Plus } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiGet } from "@/lib/client/api";
import { FilePreviewThumbnail } from "@/components/file-viewer-modal";

type TankOption = {
  id: string;
  name: string;
  productType: string;
  capacity: number | string;
  currentLiters: number | string;
  hasOpenDipping?: boolean;
};

type RecordedDip = {
  tankId: string;
  tankName: string;
  beforeLiters: number;
  afterLiters: number;
  net: number;
};

export function ConfirmArrivalModal({ allocation, onSuccess }: { allocation: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [truckNumberVerified, setTruckNumberVerified] = useState(allocation.truckNumberVerified || false);
  const [driverVerified, setDriverVerified] = useState(allocation.driverVerified || false);
  const [waybillVerified, setWaybillVerified] = useState(allocation.waybillVerified || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiPatch<any>(`/api/tenant/waybills/${allocation.id}`, {
        truckNumberVerified,
        driverVerified,
        waybillVerified,
        arrivalTime: new Date().toISOString(),
      });
      
      if (res.error) {
        toast.error(res.error.message || "Failed to confirm arrival.");
      } else {
        toast.success("Arrival confirmed successfully!");
        setOpen(false);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm arrival.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto shrink-0 whitespace-nowrap" variant="default">
          <MapPin className="mr-2 h-4 w-4" /> Confirm Arrival
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Arrival - {allocation.station.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="bg-muted/30 p-4 rounded-lg space-y-4">
            <h4 className="text-sm font-semibold">Verify Credentials</h4>
            <p className="text-xs text-muted-foreground pb-2">Please verify the delivery details.</p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox id="truck" checked={truckNumberVerified} onCheckedChange={(c) => setTruckNumberVerified(c as boolean)} />
                <Label htmlFor="truck" className="font-normal text-sm cursor-pointer">Truck Number Verified</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="driver" checked={driverVerified} onCheckedChange={(c) => setDriverVerified(c as boolean)} />
                <Label htmlFor="driver" className="font-normal text-sm cursor-pointer">Driver Verified</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="waybill" checked={waybillVerified} onCheckedChange={(c) => setWaybillVerified(c as boolean)} />
                <Label htmlFor="waybill" className="font-normal text-sm cursor-pointer">Waybill Document Verified</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={loading || !truckNumberVerified || !driverVerified || !waybillVerified}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Arrival
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LogDippingModal({ allocation, onSuccess }: { allocation: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [tankPopoverOpen, setTankPopoverOpen] = useState(false);

  const [tankId, setTankId] = useState("");
  const [loadingTanks, setLoadingTanks] = useState(false);
  const [tanks, setTanks] = useState<TankOption[]>([]);
  const [afterLiters, setAfterLiters] = useState("");
  const [beforeLiters, setBeforeLiters] = useState("");
  const [recordedDips, setRecordedDips] = useState<RecordedDip[]>([]);
  const [receivedSoFar, setReceivedSoFar] = useState(Number(allocation.litersReceived ?? 0));
  const savedThisSession = React.useRef(false);

  const selectedTank = tanks.find((t) => t.id === tankId);
  const expectedLiters = Number(allocation.litersToDispense);
  const remainingDispatch = expectedLiters - receivedSoFar;
  const overallVariance = receivedSoFar - expectedLiters;

  useEffect(() => {
    if (selectedTank) {
      setBeforeLiters(String(selectedTank.currentLiters ?? "0"));
    } else {
      setBeforeLiters("");
    }
  }, [selectedTank]);

  const currentBeforeLiters = beforeLiters ? Number(beforeLiters) : 0;
  const tankCapacity = selectedTank ? Number(selectedTank.capacity) : 0;
  const availableSpace = selectedTank ? Math.max(0, tankCapacity - currentBeforeLiters) : 0;
  const dippingReceivedLiters = afterLiters ? Number(afterLiters) - currentBeforeLiters : 0;
  const afterExceedsCapacity = Boolean(selectedTank && afterLiters && Number(afterLiters) > tankCapacity);

  useEffect(() => {
    if (!open) return;
    savedThisSession.current = false;
    setTankId("");
    setAfterLiters("");
    setBeforeLiters("");
    setRecordedDips([]);
    setReceivedSoFar(Number(allocation.litersReceived ?? 0));
    setConfirmCompleteOpen(false);
    setTankPopoverOpen(false);
    setLoadingTanks(true);
    Promise.all([
      apiGet(`/api/tenant/stations/${allocation.stationId}/tanks`),
      apiGet(`/api/tenant/stations/${allocation.stationId}/dipping-sessions`),
    ])
      .then(([tanksRes, sessionsRes]) => {
        const openTankIds = new Set<string>();
        if (!sessionsRes.error && sessionsRes.data) {
          const payload = sessionsRes.data as { sessions?: { tankId: string; status: string }[] };
          const list = Array.isArray(payload) ? payload : payload.sessions ?? [];
          for (const session of list) {
            if (session.status === "OPEN") openTankIds.add(session.tankId);
          }
        }
        if (!tanksRes.error && tanksRes.data) {
          const compatibleTanks = (tanksRes.data as TankOption[])
            .filter((t) => t.productType === allocation.productType)
            .map((t) => ({ ...t, hasOpenDipping: openTankIds.has(t.id) }));
          setTanks(compatibleTanks);
        }
      })
      .finally(() => setLoadingTanks(false));
  }, [open, allocation.stationId, allocation.productType, allocation.litersReceived]);

  const resetCurrentTankForm = () => {
    setTankId("");
    setAfterLiters("");
    setBeforeLiters("");
  };

  const validateCurrentDip = () => {
    if (!tankId || !selectedTank) {
      toast.error("Please select a discharge tank.");
      return false;
    }
    if (selectedTank.hasOpenDipping) {
      toast.error(`Close the open dipping on tank "${selectedTank.name}" before recording a waybill drop.`);
      return false;
    }
    if (!afterLiters) {
      toast.error("Please enter after liters.");
      return false;
    }
    if (Number(afterLiters) <= currentBeforeLiters) {
      toast.error("After liters must be greater than before liters.");
      return false;
    }
    if (Number(afterLiters) > tankCapacity) {
      toast.error(`After liters exceeds tank capacity of ${tankCapacity.toLocaleString()} L.`);
      return false;
    }
    if (dippingReceivedLiters > availableSpace) {
      toast.error(`Discharged volume (${dippingReceivedLiters.toLocaleString()} L) exceeds remaining tank capacity of ${availableSpace.toLocaleString()} L.`);
      return false;
    }
    return true;
  };

  const handleAddDipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentDip() || !selectedTank) return;

    setLoading(true);
    try {
      const dipRes = await apiPost<{ completed?: boolean }>(`/api/tenant/waybills/${allocation.id}/dippings`, {
        dippings: [{
          tankId,
          beforeLiters: currentBeforeLiters,
          afterLiters: Number(afterLiters),
        }],
        completeWithShortage: false,
      });

      if (dipRes.error) {
        toast.error(dipRes.error.message || "Failed to record dipping.");
        return;
      }

      const net = dippingReceivedLiters;
      const nextReceived = receivedSoFar + net;
      const nextRemaining = expectedLiters - nextReceived;

      setTanks((prev) =>
        prev.map((t) =>
          t.id === tankId ? { ...t, currentLiters: Number(t.currentLiters) + net } : t
        )
      );
      setRecordedDips((prev) => [
        ...prev,
        {
          tankId,
          tankName: selectedTank.name,
          beforeLiters: currentBeforeLiters,
          afterLiters: Number(afterLiters),
          net,
        },
      ]);
      setReceivedSoFar(nextReceived);
      savedThisSession.current = true;
      resetCurrentTankForm();

      if (nextRemaining > 0) {
        toast.success(`Dipping saved. ${nextRemaining.toLocaleString()} L remaining — select another tank or confirm complete.`);
      } else {
        toast.success("Dipping saved. Review the variance and confirm complete when you are ready.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record dipping.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (tankId && afterLiters) {
      toast.error("Save the current tank dipping before completing, or clear it.");
      return;
    }
    if (receivedSoFar <= 0 && recordedDips.length === 0) {
      toast.error("Record at least one tank dipping before completing.");
      return;
    }
    setCompleting(true);
    try {
      const dipRes = await apiPost<{ completed?: boolean; variance?: number }>(`/api/tenant/waybills/${allocation.id}/dippings`, {
        dippings: [],
        completeWithShortage: true,
      });

      if (dipRes.error) {
        toast.error(dipRes.error.message || "Failed to complete receipt.");
        return;
      }

      toast.success(overallVariance === 0 ? "Receipt completed." : "Receipt completed with recorded variance.");
      savedThisSession.current = false;
      setConfirmCompleteOpen(false);
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to complete receipt.");
    } finally {
      setCompleting(false);
    }
  };

  const tankPlaceholder = loadingTanks
    ? "Loading tanks..."
    : tanks.length === 0
      ? "No compatible tanks"
      : "Select a tank";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && savedThisSession.current) {
            savedThisSession.current = false;
            onSuccess();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto shrink-0 whitespace-nowrap" variant="default">
            <ClipboardCheck className="mr-2 h-4 w-4" /> Log Physical Dipping
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Physical Dipping - {allocation.station.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDipping} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-xs">
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Expected</p>
                <p className="font-semibold mt-0.5">{expectedLiters.toLocaleString()} L</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Received</p>
                <p className="font-semibold mt-0.5 text-emerald-600">{receivedSoFar.toLocaleString()} L</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Remaining</p>
                <p className={`font-semibold mt-0.5 ${remainingDispatch > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {Math.max(0, remainingDispatch).toLocaleString()} L
                </p>
              </div>
            </div>

            {tanks.some((t) => t.hasOpenDipping) && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Close open dipping sessions before discharging into those tanks:{" "}
                  <span className="font-semibold">
                    {tanks.filter((t) => t.hasOpenDipping).map((t) => t.name).join(", ")}
                  </span>
                  . Other tanks without an open dip can still be used.
                </span>
              </div>
            )}

            {recordedDips.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="px-3 py-2 bg-muted/40 text-xs font-semibold">Saved tank dips</div>
                <ul className="divide-y text-sm">
                  {recordedDips.map((dip, idx) => (
                    <li key={`${dip.tankId}-${idx}`} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium">{dip.tankName}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {dip.beforeLiters.toLocaleString()} → {dip.afterLiters.toLocaleString()}
                        <span className="ml-2 font-semibold text-foreground">+{dip.net.toLocaleString()} L</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {remainingDispatch > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Discharge To Tank *</Label>
                  <Popover open={tankPopoverOpen} onOpenChange={setTankPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loadingTanks}
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {loadingTanks ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Container className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">
                            {selectedTank
                              ? `${selectedTank.name} · ${Number(selectedTank.currentLiters).toLocaleString()} / ${Number(selectedTank.capacity).toLocaleString()} L`
                              : tankPlaceholder}
                          </span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tanks..." />
                        <CommandList className="max-h-[240px] overflow-y-auto">
                          <CommandEmpty>No compatible tanks found.</CommandEmpty>
                          <CommandGroup>
                            {tanks.map((tank) => {
                              const capacity = Number(tank.capacity);
                              const current = Number(tank.currentLiters);
                              const space = Math.max(0, capacity - current);
                              const full = space <= 0;
                              const blocked = full || Boolean(tank.hasOpenDipping);
                              return (
                                <CommandItem
                                  key={tank.id}
                                  value={`${tank.name} ${tank.id}`}
                                  disabled={blocked}
                                  onSelect={() => {
                                    if (blocked) return;
                                    setTankId(tank.id);
                                    setAfterLiters("");
                                    setTankPopoverOpen(false);
                                    if (space < remainingDispatch) {
                                      toast.error(
                                        `${tank.name} only has ${space.toLocaleString()} L of space. Dispatched volume cannot exceed tank capacity (${capacity.toLocaleString()} L). Fill this tank up to capacity, then select another tank.`
                                      );
                                    }
                                  }}
                                  data-checked={tankId === tank.id}
                                >
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium">{tank.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Cap {capacity.toLocaleString()} L · Now {current.toLocaleString()} L · Space {space.toLocaleString()} L
                                      {full ? " · Full" : tank.hasOpenDipping ? " · Open dipping — close first" : ""}
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
                  <p className="text-xs text-muted-foreground">
                    Saving a dip does not complete the receipt. If this tank fills first, pick another tank for the remaining dispatch volume.
                  </p>
                </div>

                {!tankId ? (
                  <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                    {recordedDips.length > 0
                      ? `Select another tank for the remaining ${remainingDispatch.toLocaleString()} L.`
                      : "Please select a discharge tank to record a physical dip."}
                  </div>
                ) : (
                  <div className="space-y-3 bg-muted/20 p-4 border border-dashed rounded-lg">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm font-semibold">{selectedTank?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Space: {availableSpace.toLocaleString()} L
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Before Liters *</Label>
                        <FormattedNumberInput
                          required
                          min="0"
                          step="0.01"
                          value={beforeLiters}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBeforeLiters(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>After Liters *</Label>
                        <FormattedNumberInput
                          required
                          min={currentBeforeLiters.toString()}
                          step="0.01"
                          value={afterLiters}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAfterLiters(e.target.value)}
                        />
                      </div>
                    </div>
                    {afterExceedsCapacity && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          Amount dispatched ({Number(afterLiters).toLocaleString()} L after) exceeds tank capacity of {tankCapacity.toLocaleString()} L. Reduce after liters or select another tank.
                        </span>
                      </div>
                    )}
                    {!afterExceedsCapacity && afterLiters && dippingReceivedLiters > availableSpace && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          Discharged volume ({dippingReceivedLiters.toLocaleString()} L) exceeds remaining space of {availableSpace.toLocaleString()} L.
                        </span>
                      </div>
                    )}
                    {afterLiters && Number(afterLiters) > currentBeforeLiters && !afterExceedsCapacity && dippingReceivedLiters <= availableSpace && (
                      <div className="flex items-center justify-between pt-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">This dip: </span>
                          <span className="font-semibold">{dippingReceivedLiters.toLocaleString()} L</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Then remaining: </span>
                          <span className="font-semibold">
                            {Math.max(0, remainingDispatch - dippingReceivedLiters).toLocaleString()} L
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedTank && availableSpace < remainingDispatch && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          This tank only has {availableSpace.toLocaleString()} L of space. You cannot discharge the full remaining {remainingDispatch.toLocaleString()} L here. Save up to capacity, then select another tank.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              {(receivedSoFar > 0 || recordedDips.length > 0) && (
                <Button
                  type="button"
                  variant={remainingDispatch > 0 ? "outline" : "default"}
                  disabled={loading || completing}
                  onClick={() => setConfirmCompleteOpen(true)}
                >
                  Complete with variance
                </Button>
              )}
              {remainingDispatch > 0 && (
                <Button type="submit" disabled={loading || completing || !tankId || !afterLiters || afterExceedsCapacity || dippingReceivedLiters > availableSpace || Boolean(selectedTank?.hasOpenDipping)}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Save dipping
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to complete this receipt?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {remainingDispatch > 0
                    ? "Dispatch volume still has remaining liters. Completing now records that remaining as variance / shortage."
                    : overallVariance === 0
                      ? "Received volume matches the dispatched amount. Confirm to complete this receipt."
                      : "Received volume differs from the dispatched amount. Confirm to complete this receipt with the variance below."}
                </p>
                <div className="rounded-md border bg-muted/40 p-3 space-y-1 tabular-nums text-foreground">
                  <div className="flex justify-between">
                    <span>Expected</span>
                    <span>{expectedLiters.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Received</span>
                    <span>{receivedSoFar.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Variance</span>
                    <span className={overallVariance < 0 ? "text-destructive" : overallVariance > 0 ? "text-amber-600" : ""}>
                      {overallVariance > 0 ? "+" : ""}
                      {overallVariance.toLocaleString()} L
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Cancel</AlertDialogCancel>
            <Button onClick={handleComplete} disabled={completing}>
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, complete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type Allocation = {
  id: string;
  stationId: string;
  productType: string;
  litersToDispense: any;
  litersReceived: any;
  costPerLiter: any;
  transportationCost: any;
  status: string;
  gpsLatitude: any;
  gpsLongitude: any;
  arrivalPictures: string[];
  arrivalTime: string | null;
  deliveredAt: string | null;
  truckNumberVerified: boolean;
  driverVerified: boolean;
  waybillVerified: boolean;
  station: {
    id: string;
    name: string;
    code: string;
  };
};

export function AllocationsTableWithModal({
  allocations,
  dispatchedAt,
}: {
  allocations: Allocation[];
  dispatchedAt: string;
}) {
  const [selectedAlloc, setSelectedAlloc] = useState<Allocation | null>(null);
  const router = useRouter();

  // Summaries
  const totalExpected = allocations.reduce((acc, a) => acc + Number(a.litersToDispense), 0);
  const totalReceived = allocations.reduce((acc, a) => acc + (a.litersReceived ? Number(a.litersReceived) : 0), 0);
  const totalVariance = allocations.reduce((acc, a) => {
    if (a.litersReceived) {
      return acc + (Number(a.litersReceived) - Number(a.litersToDispense));
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead className="text-right">Expected (L)</TableHead>
              <TableHead className="text-right">Cost/L</TableHead>
              <TableHead className="text-right">Trans. Cost</TableHead>
              <TableHead className="text-right">Received (L)</TableHead>
              <TableHead className="text-right">Variance (L)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((a) => {
              const expected = Number(a.litersToDispense);
              const received = a.litersReceived ? Number(a.litersReceived) : null;
              const variance = received !== null ? received - expected : null;

              return (
                <React.Fragment key={a.id}>
                <TableRow className={`text-sm ${selectedAlloc?.id === a.id ? 'bg-muted/10 border-b-0' : ''}`}>
                  <TableCell className="font-medium">
                    <div>{a.station.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{a.station.code}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{expected.toLocaleString()} L</TableCell>
                  <TableCell className="text-right font-mono">₦{Number(a.costPerLiter).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">₦{Number(a.transportationCost).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {received !== null ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-500">{received.toLocaleString()} L</span>
                    ) : (
                      <span className="text-muted-foreground italic">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {variance !== null ? (
                      <span className={`font-semibold ${variance < 0 ? "text-rose-600 dark:text-rose-500" : variance > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-500"}`}>
                        {variance > 0 ? "+" : ""}{variance.toLocaleString()} L
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={
                      a.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    }>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={selectedAlloc?.id === a.id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAlloc(selectedAlloc?.id === a.id ? null : a)}
                      className="gap-1.5 h-8 text-xs cursor-pointer"
                    >
                      <Eye size={12} />
                      {selectedAlloc?.id === a.id ? "Close" : "Progress"}
                    </Button>
                  </TableCell>
                </TableRow>

                {selectedAlloc?.id === a.id && (
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={8} className="p-0 border-b whitespace-normal">
                      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 w-full whitespace-normal overflow-hidden">
                        <div className="flex items-center justify-between border-b pb-2 text-xs">
                          <span className="text-muted-foreground font-mono">Code: {a.station.code}</span>
                          <span className="text-sm font-semibold text-foreground">Delivery Progress: {a.station.name}</span>
                        </div>

                        {/* Horizontal Stepper Timeline */}
                        <div className="flex items-center justify-between pt-6 pb-14 px-4 relative">
                          <div className="absolute top-11 left-10 right-10 h-[2px] bg-muted -translate-y-1/2 z-0">
                            <div 
                              className="absolute top-0 left-0 h-full bg-slate-900 transition-all duration-500" 
                              style={{ width: (a.status === "DELIVERED" || a.status === "COMPLETED") ? '100%' : '33%' }}
                            />
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className="size-11 rounded-full bg-slate-900 text-white flex items-center justify-center border-[3px] border-background shadow-sm">
                              <Package size={20} />
                            </div>
                            <div className="text-center absolute top-12 pt-1 w-24">
                              <p className="text-xs font-semibold">Dispatched</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Loaded at depot</p>
                            </div>
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className="size-11 rounded-full bg-slate-900 text-white flex items-center justify-center border-[3px] border-background shadow-sm">
                              <ClipboardCheck size={20} />
                            </div>
                            <div className="text-center absolute top-12 pt-1 w-24">
                              <p className="text-xs font-semibold">Manifest</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Waybill issued</p>
                            </div>
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`size-11 rounded-full flex items-center justify-center border-[3px] border-background shadow-sm transition-colors ${(a.status === "DELIVERED" || a.status === "COMPLETED") ? "bg-slate-900 text-white" : "bg-muted text-muted-foreground"}`}>
                              <Truck size={20} />
                            </div>
                            <div className="text-center absolute top-12 pt-1 w-24">
                              <p className={`text-xs font-semibold ${(a.status === "DELIVERED" || a.status === "COMPLETED") ? "text-foreground" : "text-muted-foreground"}`}>In Transit</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">En route</p>
                            </div>
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`size-11 rounded-full flex items-center justify-center border-[3px] border-background shadow-sm transition-colors ${(a.status === "DELIVERED" || a.status === "COMPLETED") ? "bg-slate-900 text-white" : "bg-muted text-muted-foreground"}`}>
                              <MapPin size={20} />
                            </div>
                            <div className="text-center absolute top-12 pt-1 w-24">
                              <p className={`text-xs font-semibold ${(a.status === "DELIVERED" || a.status === "COMPLETED") ? "text-foreground" : "text-muted-foreground"}`}>Delivered</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Arrived at station</p>
                            </div>
                          </div>
                        </div>

                        {/* Status Details Section */}
                        <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Status Details</p>
                              <p className="text-[11px] text-muted-foreground">
                                {(a.status === "DELIVERED" || a.status === "COMPLETED")
                                  ? `Arrived on ${formatHumanReadableDate(a.deliveredAt)}`
                                  : `Dispatched on ${formatHumanReadableDate(dispatchedAt)} - En route to destination`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Location tracking */}
                            {(a.status === "DELIVERED" || a.status === "COMPLETED") && (
                              <div className="bg-background rounded-lg p-3 space-y-1.5 border border-muted-foreground/10 text-[11px]">
                                <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Location Tracking</div>
                                {a.gpsLatitude && a.gpsLongitude ? (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${a.gpsLatitude},${a.gpsLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                  >
                                    <MapPin size={13} className="shrink-0" />
                                    <span>GPS: {Number(a.gpsLatitude).toFixed(6)}, {Number(a.gpsLongitude).toFixed(6)}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                ) : (
                                  <div className="text-muted-foreground italic flex items-center gap-1.5">
                                    <AlertCircle size={13} /> No coordinates captured
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Verifications checklists */}
                            {(a.status === "DELIVERED" || a.status === "COMPLETED") && (
                              <div className="space-y-1.5 text-xs text-muted-foreground bg-background rounded-lg p-3 border border-muted-foreground/10">
                                <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider mb-2">Verification Checklist</div>
                                <div className="flex items-center gap-2">
                                  <Check className={`size-4 ${a.truckNumberVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                                  <span className={a.truckNumberVerified ? "text-foreground font-medium" : ""}>Truck plate verified</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Check className={`size-4 ${a.driverVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                                  <span className={a.driverVerified ? "text-foreground font-medium" : ""}>Driver credentials verified</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Check className={`size-4 ${a.waybillVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                                  <span className={a.waybillVerified ? "text-foreground font-medium" : ""}>Waybill manifest verified</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {a.status === "DISPATCHED" && (
                            <div className="bg-background rounded-lg p-4 border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 w-full">
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Ready to Receive</h4>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-1 leading-relaxed whitespace-normal break-words">
                                  This allocation has been dispatched and is pending receipt at the station.
                                </p>
                              </div>
                              <div className="shrink-0 w-full sm:w-auto">
                                <ConfirmArrivalModal allocation={a} onSuccess={() => router.refresh()} />
                              </div>
                            </div>
                          )}

                          {a.status === "DELIVERED" && (
                            <div className="bg-background rounded-lg p-4 border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 w-full">
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-semibold text-blue-800 dark:text-blue-400">Log Physical Dipping</h4>
                                <p className="text-xs text-blue-600 dark:text-blue-500/80 mt-1 leading-relaxed whitespace-normal break-words">
                                  Record tank dips. If a tank fills before the dispatch is empty, select another tank. Complete only when finished — remaining volume is recorded as variance.
                                </p>
                              </div>
                              <div className="shrink-0 w-full sm:w-auto">
                                <LogDippingModal allocation={a} onSuccess={() => router.refresh()} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Verification Pictures */}
                        {a.status === "DELIVERED" && a.arrivalPictures?.length > 0 && (
                          <div className="border-t pt-4 space-y-2">
                            <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Verification Photos</div>
                            <div className="flex flex-wrap gap-2">
                              {a.arrivalPictures.map((pic, idx) => (
                                <FilePreviewThumbnail
                                  key={idx}
                                  fileUrl={pic}
                                  fileName={`Arrival verification - ${a.station?.name || "Station"} (#${idx + 1})`}
                                  className="size-16 rounded-lg shrink-0 shadow-sm"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              );
            })}
          </TableBody>
          <TableFooter className="bg-muted/40 font-mono text-xs">
            <TableRow>
              <TableCell className="font-bold">Total Summary</TableCell>
              <TableCell className="text-right font-bold">{totalExpected.toLocaleString()} L</TableCell>
              <TableCell colSpan={2} />
              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-500">
                {totalReceived > 0 ? `${totalReceived.toLocaleString()} L` : "0 L"}
              </TableCell>
              <TableCell className={`text-right font-bold ${totalVariance < 0 ? "text-rose-600 dark:text-rose-500" : totalVariance > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-500"}`}>
                {totalVariance > 0 ? "+" : ""}{totalVariance.toLocaleString()} L
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

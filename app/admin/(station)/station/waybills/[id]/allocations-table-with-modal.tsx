"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Truck, Clock, MapPin, ExternalLink, AlertCircle, Check, Eye, Package, ClipboardCheck, Loader2, Droplet, Container } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiGet } from "@/lib/client/api";

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
        <Button className="w-full md:w-auto" variant="default">
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
  
  const [tankId, setTankId] = useState("");
  const [loadingTanks, setLoadingTanks] = useState(false);
  const [tanks, setTanks] = useState<any[]>([]);
  
  const [afterLiters, setAfterLiters] = useState("");
  const [beforeLiters, setBeforeLiters] = useState("");

  const selectedTank = tanks.find(t => t.id === tankId);
  const expectedLiters = Number(allocation.litersToDispense);
  
  // Update beforeLiters when tank changes
  useEffect(() => {
    if (selectedTank) {
      setBeforeLiters(selectedTank.currentLiters?.toString() || "0");
    } else {
      setBeforeLiters("");
    }
  }, [selectedTank]);

  const currentBeforeLiters = beforeLiters ? Number(beforeLiters) : 0;
  const dippingReceivedLiters = afterLiters ? Number(afterLiters) - currentBeforeLiters : 0;
  const variance = dippingReceivedLiters - expectedLiters;

  useEffect(() => {
    if (open) {
      setLoadingTanks(true);
      apiGet(`/api/tenant/stations/${allocation.stationId}/tanks`)
        .then((res) => {
          if (!res.error && res.data) {
            const compatibleTanks = (res.data as any[]).filter(t => t.productType === allocation.productType);
            setTanks(compatibleTanks);
          }
        })
        .finally(() => setLoadingTanks(false));
    }
  }, [open, allocation.stationId, allocation.productType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankId) return toast.error("Please select a discharge tank.");

    setLoading(true);
    try {
      if (afterLiters) {
        if (Number(afterLiters) <= currentBeforeLiters) {
          toast.error("After liters must be greater than before liters.");
          setLoading(false);
          return;
        }
        if (selectedTank && Number(afterLiters) > Number(selectedTank.capacity)) {
          toast.error(`After liters exceeds tank capacity of ${Number(selectedTank.capacity).toLocaleString()} L`);
          setLoading(false);
          return;
        }
      }

      const dipRes = await apiPost<any>(`/api/tenant/waybills/${allocation.id}/dippings`, {
        dippings: [{
          tankId,
          beforeLiters: currentBeforeLiters,
          afterLiters: Number(afterLiters)
        }],
        completeWithShortage: true
      });

      if (dipRes.error) {
        toast.error(dipRes.error.message || "Failed to record dipping.");
      } else {
        toast.success("Physical dipping recorded successfully!");
        setOpen(false);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record dipping.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto" variant="default">
          <ClipboardCheck className="mr-2 h-4 w-4" /> Log Physical Dipping
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Physical Dipping - {allocation.station.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Discharge To Tank *</Label>
            <Select value={tankId} onValueChange={setTankId} disabled={loadingTanks}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  {loadingTanks ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Container className="w-4 h-4 text-muted-foreground" />
                  )}
                  <SelectValue placeholder={loadingTanks ? "Loading tanks..." : tanks.length === 0 ? "No compatible tanks" : "Select a tank"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {tanks.map((tank) => (
                  <SelectItem key={tank.id} value={tank.id}>
                    {tank.name} (Cap: {Number(tank.capacity).toLocaleString()} L | Cur: {Number(tank.currentLiters).toLocaleString()} L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Fuel will be immediately transferred and the tank volume will update.
            </p>
          </div>

          {!tankId ? (
            <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-center text-sm text-muted-foreground mt-4">
              Please select a discharge tank above to proceed with physical dipping.
            </div>
          ) : (
            <div className="space-y-3 bg-muted/20 p-4 border border-dashed rounded-lg mt-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-semibold">Dipping Logs</span>
                <span className="text-xs text-muted-foreground">Expected: {expectedLiters.toLocaleString()} L</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Before Liters *</Label>
                  <FormattedNumberInput 
                    required 
                    min="0"
                    step="0.01"
                    value={beforeLiters} 
                    onChange={(e: any) => setBeforeLiters(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>After Liters *</Label>
                  <FormattedNumberInput 
                    required 
                    min={currentBeforeLiters.toString()}
                    step="0.01"
                    value={afterLiters} 
                    onChange={(e: any) => setAfterLiters(e.target.value)} 
                  />
                </div>
              </div>
              {afterLiters && Number(afterLiters) > currentBeforeLiters && (
                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Received: </span>
                    <span className="font-semibold">{dippingReceivedLiters.toLocaleString()} L</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Variance: </span>
                    <span className={`font-semibold ${variance < 0 ? 'text-destructive' : variance > 0 ? 'text-emerald-500' : ''}`}>
                      {variance > 0 ? '+' : ''}{variance.toLocaleString()} L
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit" disabled={loading || !tankId || !afterLiters}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Dipping
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Allocation = {
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
                    <TableCell colSpan={8} className="p-0 border-b">
                      <div className="p-6 max-w-4xl mx-auto space-y-6">
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
                            <div className="bg-background rounded-lg p-4 border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                              <div>
                                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Ready to Receive</h4>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-1">
                                  This allocation has been dispatched and is pending receipt at the station.
                                </p>
                              </div>
                              <ConfirmArrivalModal allocation={a} onSuccess={() => router.refresh()} />
                            </div>
                          )}

                          {a.status === "DELIVERED" && (
                            <div className="bg-background rounded-lg p-4 border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                              <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-400">Log Physical Dipping</h4>
                                <p className="text-xs text-blue-600 dark:text-blue-500/80 mt-1">
                                  The truck has arrived. Please record the physical dipping to finalize receipt.
                                </p>
                              </div>
                              <LogDippingModal allocation={a} onSuccess={() => router.refresh()} />
                            </div>
                          )}
                        </div>

                        {/* Verification Pictures */}
                        {a.status === "DELIVERED" && a.arrivalPictures?.length > 0 && (
                          <div className="border-t pt-4 space-y-2">
                            <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Verification Photos</div>
                            <div className="flex flex-wrap gap-2">
                              {a.arrivalPictures.map((pic, idx) => (
                                <div key={idx} className="relative size-16 rounded-lg overflow-hidden border bg-muted shadow-sm shrink-0">
                                  <img src={pic} alt="Arrival verification" className="w-full h-full object-cover" />
                                </div>
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

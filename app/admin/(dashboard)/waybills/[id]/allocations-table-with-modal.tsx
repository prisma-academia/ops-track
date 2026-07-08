"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Clock, MapPin, ExternalLink, AlertCircle, Check, Eye } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";

type Allocation = {
  id: string;
  stationId: string;
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
                <TableRow key={a.id} className="text-sm">
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
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAlloc(a)}
                      className="gap-1.5 h-8 text-xs cursor-pointer"
                    >
                      <Eye size={12} />
                      Progress
                    </Button>
                  </TableCell>
                </TableRow>
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

      {/* Delivery Progress Dialog Modal */}
      <Dialog open={!!selectedAlloc} onOpenChange={(open) => !open && setSelectedAlloc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Delivery Progress: {selectedAlloc?.station.name}
            </DialogTitle>
          </DialogHeader>

          {selectedAlloc && (
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-between border-b pb-2 text-xs">
                <span className="text-muted-foreground font-mono">Code: {selectedAlloc.station.code}</span>
                <Badge variant="outline" className={selectedAlloc.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"}>
                  {selectedAlloc.status}
                </Badge>
              </div>

              {/* Stepper Timeline */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/20">
                {/* Step 1: Dispatched */}
                <div className="relative">
                  <span className="absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px]">
                    ✓
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Dispatched</p>
                    <p className="text-[10px] text-muted-foreground">{formatHumanReadableDate(dispatchedAt)}</p>
                  </div>
                </div>

                {/* Step 2: Transit */}
                <div className="relative">
                  <span className={`absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    selectedAlloc.status === "DELIVERED"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                      : "bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
                  }`}>
                    {selectedAlloc.status === "DELIVERED" ? "✓" : <Clock size={10} />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">In Transit</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedAlloc.status === "DELIVERED" ? "En route complete" : "Vehicle is currently en route"}
                    </p>
                  </div>
                </div>

                {/* Step 3: Delivered & Verified */}
                <div className="relative">
                  <span className={`absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    selectedAlloc.status === "DELIVERED"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                      : "bg-muted border-muted-foreground/30 text-muted-foreground"
                  }`}>
                    {selectedAlloc.status === "DELIVERED" ? "✓" : "3"}
                  </span>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Delivered & Verified</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedAlloc.status === "DELIVERED" && selectedAlloc.deliveredAt
                          ? `Arrived on ${formatHumanReadableDate(selectedAlloc.deliveredAt)}`
                          : "Awaiting destination discharge"}
                      </p>
                    </div>

                    {/* Location tracking coordinates */}
                    {selectedAlloc.status === "DELIVERED" && (
                      <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5 border border-muted-foreground/10 text-[11px]">
                        <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Location Tracking</div>
                        {selectedAlloc.gpsLatitude && selectedAlloc.gpsLongitude ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedAlloc.gpsLatitude},${selectedAlloc.gpsLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            <MapPin size={11} className="shrink-0" />
                            <span>GPS: {Number(selectedAlloc.gpsLatitude).toFixed(6)}, {Number(selectedAlloc.gpsLongitude).toFixed(6)}</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <div className="text-muted-foreground italic flex items-center gap-1">
                            <AlertCircle size={11} /> No coordinates captured
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verifications checklists */}
                    {selectedAlloc.status === "DELIVERED" && (
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Check className={`size-3.5 ${selectedAlloc.truckNumberVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                          <span className={selectedAlloc.truckNumberVerified ? "text-foreground font-medium" : ""}>Truck plate verified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className={`size-3.5 ${selectedAlloc.driverVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                          <span className={selectedAlloc.driverVerified ? "text-foreground font-medium" : ""}>Driver credentials verified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className={`size-3.5 ${selectedAlloc.waybillVerified ? "text-emerald-600 font-bold" : "text-muted-foreground/40"}`} />
                          <span className={selectedAlloc.waybillVerified ? "text-foreground font-medium" : ""}>Waybill manifest verified</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification Pictures */}
              {selectedAlloc.status === "DELIVERED" && selectedAlloc.arrivalPictures?.length > 0 && (
                <div className="border-t pt-3 space-y-1.5">
                  <div className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Verification Photos</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAlloc.arrivalPictures.map((pic, idx) => (
                      <div key={idx} className="relative size-12 rounded-lg overflow-hidden border bg-muted shadow-sm shrink-0">
                        <img src={pic} alt="Arrival verification" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

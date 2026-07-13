"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Truck, Clock, MapPin, ExternalLink, AlertCircle, Check, Eye, Package, ClipboardCheck } from "lucide-react";
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
                          <div className="absolute top-11 left-10 right-10 h-[2px] bg-muted -translate-y-1/2 z-0" />
                          <div 
                            className="absolute top-11 left-10 h-[2px] bg-slate-900 -translate-y-1/2 z-0 transition-all duration-500" 
                            style={{ width: (a.status === "DELIVERED" || a.status === "COMPLETED") ? '100%' : '33%' }}
                          />

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

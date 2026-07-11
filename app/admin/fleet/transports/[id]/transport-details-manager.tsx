"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Truck, AlertTriangle, CheckCircle, PackageOpen, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";

export function TransportDetailsManager({ transport, stations = [] }: { transport: any, stations?: any[] }) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openAssignDestinationDialog, setOpenAssignDestinationDialog] = useState(false);
  const [destinationType, setDestinationType] = useState<"STATION" | "CUSTOM">("STATION");
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subsequent Destination state
  const [subLocation, setSubLocation] = useState("");
  const [subRate, setSubRate] = useState("");
  const [subLiters, setSubLiters] = useState("");
  const [subProductPrice, setSubProductPrice] = useState("");

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);
  
  // Assign Station state
  const [assignStationId, setAssignStationId] = useState("");
  const [assignVolume, setAssignVolume] = useState("");
  const [assignPrice, setAssignPrice] = useState("");
  const [assignTransportCost, setAssignTransportCost] = useState("");

  // Incident form state
  const [lossType, setLossType] = useState("THEFT");
  const [lostQuantity, setLostQuantity] = useState("");
  const [expensesIncurred, setExpensesIncurred] = useState("");
  const [lossComment, setLossComment] = useState("");
  const [terminateTrip, setTerminateTrip] = useState(false);

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: any = { status: newStatus };

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenStatusDialog(false);
      router.refresh();
    }
  };

  const handleAssignDestination = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (destinationType === "STATION") {
        if (Number(assignVolume) <= 0) throw new Error("Volume to allocate must be greater than 0");
        if (Number(assignPrice) < 0) throw new Error("Price cannot be negative");
        if (Number(assignTransportCost) < 0) throw new Error("Transport cost cannot be negative");

        const res = await apiPost(`/api/tenant/fleet/sales`, {
          recipientType: "STATION",
          stationId: assignStationId,
          transportId: transport.id,
          litersDespatched: Number(assignVolume),
          amountPerLiter: Number(assignPrice),
          transportCostPerLiter: Number(assignTransportCost || 0)
        });
        if (res.error) throw new Error(res.error.message || "Failed to assign station");
        
        setAssignStationId("");
        setAssignVolume("");
        setAssignPrice("");
        setAssignTransportCost("");
      } else {
        if (!subLocation || !subRate || !subLiters) {
          throw new Error("All fields are required");
        }
        if (Number(subLiters) <= 0) throw new Error("Liters delivered must be greater than 0");
        if (Number(subRate) < 0) throw new Error("Rate cannot be negative");
        
        const currentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
        const newLocs = [...currentLocs, {
          location: subLocation,
          rate: Number(subRate),
          litersDelivered: Number(subLiters),
          productPrice: Number(subProductPrice || 0),
          isCustom: true,
          date: new Date().toISOString()
        }];
        const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, {
          subsequentLocs: newLocs
        });
        if (res.error) throw new Error(res.error.message || "Failed to add destination");
        
        setSubLocation("");
        setSubRate("");
        setSubLiters("");
        setSubProductPrice("");
      }
      
      router.refresh();
      setOpenAssignDestinationDialog(false);
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogIncident = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!lossType || !lostQuantity) {
      setError("Loss Type and Lost Quantity are required");
      setIsSubmitting(false);
      return;
    }

    if (Number(lostQuantity) <= 0) {
      setError("Lost Quantity must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (Number(expensesIncurred) < 0) {
      setError("Expenses cannot be negative");
      setIsSubmitting(false);
      return;
    }

    const payload: any = {
      lossLog: {
        lossType,
        lostQuantity: Number(lostQuantity),
        expensesIncurred: Number(expensesIncurred || 0),
        comment: lossComment
      },
      addLitersLost: Number(lostQuantity),
      addMaintenanceCost: Number(expensesIncurred || 0)
    };

    if (terminateTrip) {
      payload.status = "LOSS";
    }

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenIncidentDialog(false);
      setLossType("THEFT");
      setLostQuantity("");
      setExpensesIncurred("");
      setLossComment("");
      setTerminateTrip(false);
      router.refresh();
    }
  };



  const subsequentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
  const lossLogs = transport.lossLogs || [];

  const salesStationNames = (transport.sales || []).map((s: any) => s.station?.name).filter(Boolean);
  const customDistributions = subsequentLocs.filter((loc: any) => loc.isCustom || loc.productPrice !== undefined || !salesStationNames.includes(loc.location));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/admin/fleet/transports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
              Trip to {transport.destination}
              <Badge variant={transport.status === "COMPLETED" ? "default" : transport.status === "LOSS" ? "destructive" : transport.status === "CANCELLED" ? "secondary" : "outline"}>
                {transport.status}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {transport.transporter.name} • {transport.truck.name} • {transport.productType}
            </p>
          </div>
        </div>
        
        <Button onClick={() => setOpenStatusDialog(true)} variant="outline">
          <CheckCircle className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
              <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="destinations" className="text-[15px] font-semibold">Destinations ({subsequentLocs.length})</TabsTrigger>
              <TabsTrigger value="distribution" className="text-[15px] font-semibold">Distribution ({(transport.sales?.length || 0) + customDistributions.length})</TabsTrigger>
              <TabsTrigger value="losses" className="text-[15px] font-semibold text-red-600 dark:text-red-400">Loss Logs ({lossLogs.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="mb-2">
                <h3 className="font-semibold text-lg">Trip Overview</h3>
                <p className="text-sm text-muted-foreground">General information, volume summary, and transport personnel.</p>
              </div>
              {(() => {
                const carriedVolume = Number(transport.litersCarried) || 0;
                const salesVol = (transport.sales || []).reduce((acc: number, sale: any) => acc + (Number(sale.litersDespatched) || 0), 0);
                const locsVol = (transport.subsequentLocs || []).reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
                const distributedVolume = salesVol + locsVol;
                const remainingVolume = Math.max(0, carriedVolume - distributedVolume);

                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl border bg-card">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Truck Volume</p>
                      <p className="text-xl font-bold text-foreground">{carriedVolume.toLocaleString()} L</p>
                    </div>
                    <div className="p-4 rounded-2xl border bg-card">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Distributed</p>
                      <p className="text-xl font-bold text-foreground">{distributedVolume.toLocaleString()} L</p>
                    </div>
                    <div className="p-4 rounded-2xl border bg-card">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Remaining Volume</p>
                      <p className="text-xl font-bold text-foreground">{remainingVolume.toLocaleString()} L</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Rate per Liter</p>
                  <p className="text-xl font-bold text-foreground">₦{Number(transport.ratePerLiter).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Loss Deductions</p>
                  <p className="text-xl font-bold text-destructive">₦{Number(transport.totalDeduction).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Net Transport Fee</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">₦{Number(transport.netTransportFeePaid).toLocaleString()}</p>
                </div>
              </div>

              {transport.comment && (
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Trip Notes</p>
                  <p className="text-sm text-foreground">{transport.comment}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border bg-card space-y-3">
                  <h3 className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground border-b pb-2">Trip Personnel</h3>
                  
                  <div>
                    <p className="text-[10px] text-muted-foreground">Driver</p>
                    <p className="text-sm font-medium text-foreground">{transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unassigned"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-card space-y-3">
                  <h3 className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground border-b pb-2">Related Order</h3>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Order Reference</p>
                    <p className="text-sm font-medium text-foreground">
                      {transport.order?.reference ? (
                        <Link href={`/admin/fleet/orders/${transport.order.id}`} className="text-primary hover:underline">
                          {transport.order.reference}
                        </Link>
                      ) : "No Order Linked"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="destinations" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Route Destinations</h3>
                  <p className="text-sm text-muted-foreground">Manage and track custom route stops for this trip.</p>
                </div>
                <Button onClick={() => setOpenAssignDestinationDialog(true)}>
                  <PackageOpen className="h-4 w-4 mr-2" />
                  Assign Subsequent Destination
                </Button>
              </div>
              <div className="space-y-6">
                {/* Primary Destination Table */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">Primary Destination</h4>
                  <div className="border rounded-2xl overflow-hidden bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/50">
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Product Price/L (₦)</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Rate/L (₦)</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Liters Carried</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total (₦)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-muted/5">
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{transport.destination}</div>
                            <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Primary / Loaded Amount</div>
                          </td>
                          <td className="text-right py-3 px-4 text-foreground/90">{transport.order?.pricePerLitre ? Number(transport.order.pricePerLitre).toLocaleString() : '—'}</td>
                          <td className="text-right py-3 px-4 text-foreground/90">{Number(transport.ratePerLiter).toLocaleString()}</td>
                          <td className="text-right py-3 px-4 text-foreground/90">{Number(transport.litersCarried).toLocaleString()} L</td>
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium">{(Number(transport.ratePerLiter) * Number(transport.litersCarried)).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Subsequent Destinations Table */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">Subsequent Destinations</h4>
                  <div className="border rounded-2xl overflow-hidden bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/50">
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Product Price/L (₦)</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Rate/L (₦)</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Liters to Deliver</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total (₦)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subsequentLocs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-muted-foreground">No subsequent destinations recorded.</td>
                          </tr>
                        ) : (
                          subsequentLocs.map((loc: any, idx: number) => (
                            <tr key={`loc-${idx}`} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                              <td className="py-3 px-4 text-foreground/90">
                                <div className="font-medium">{loc.location}</div>
                                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{loc.isCustom ? 'Custom Destination' : 'Station Destination'}</div>
                              </td>
                              <td className="text-right py-3 px-4 text-foreground/90">{loc.productPrice ? Number(loc.productPrice).toLocaleString() : '—'}</td>
                              <td className="text-right py-3 px-4 text-foreground/90">{Number(loc.rate).toLocaleString()}</td>
                              <td className="text-right py-3 px-4 text-foreground/90">{Number(loc.litersDelivered).toLocaleString()} L</td>
                              <td className="text-right py-3 px-4 text-foreground/90 font-medium">{(Number(loc.rate) * Number(loc.litersDelivered)).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {subsequentLocs.length > 0 && (
                        <tfoot>
                          <tr className="bg-muted/30 border-t border-border/50 font-bold">
                            <td colSpan={3} className="text-right py-3 px-4 text-foreground">Total Distributed:</td>
                            <td className="text-right py-3 px-4 text-foreground">
                              {(() => {
                                 const totalLiters = subsequentLocs.reduce((sum: number, loc: any) => sum + Number(loc.litersDelivered || 0), 0);
                                 return `${totalLiters.toLocaleString()} L`;
                              })()}
                            </td>
                            <td className="text-right py-3 px-4 text-foreground">
                              {(() => {
                                 const totalCost = subsequentLocs.reduce((sum: number, loc: any) => sum + (Number(loc.rate || 0) * Number(loc.litersDelivered || 0)), 0);
                                 return `₦${totalCost.toLocaleString()}`;
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="mt-6 space-y-4">
              <div className="mb-2">
                <h3 className="font-semibold text-lg">Distribution & Sales</h3>
                <p className="text-sm text-muted-foreground">Recorded sales and fuel distributed to stations or external clients.</p>
              </div>
              <div className="border rounded-2xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Recipient</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Despatched</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Received</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Price/L (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!transport.sales || transport.sales.length === 0) && customDistributions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No sales/distribution recorded for this trip.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {transport.sales?.map((sale: any) => (
                          <tr key={sale.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                            <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                              {new Date(sale.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">
                                {sale.customer ? sale.customer.name : sale.station ? sale.station.name : 'Unknown'}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase">
                                {sale.customer ? 'EXTERNAL CLIENT' : 'OWNED STATION'}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(sale.litersDespatched || sale.litersSold).toLocaleString()} L</td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium text-amber-600 dark:text-amber-500">
                              {sale.litersReceived !== null && sale.litersReceived !== undefined ? `${Number(sale.litersReceived).toLocaleString()} L` : 'Pending'}
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-mono text-xs">₦{Number(sale.amountPerLiter || 0).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(sale.totalExpectedAmount || sale.totalAmount || (Number(sale.litersDespatched || sale.litersSold || 0) * Number(sale.amountPerLiter || 0))).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90">
                              <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="text-[10px]">
                                {sale.transportCostBorneBy === 'COMPANY' ? 'COMPANY' : 'CLIENT'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {customDistributions.map((loc: any, idx: number) => (
                          <tr key={`cdist-${idx}`} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                            <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                              {new Date(loc.date || transport.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">
                                {loc.location}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase">
                                CUSTOM LOCATION
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(loc.litersDelivered).toLocaleString()} L</td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium text-amber-600 dark:text-amber-500">
                              {loc.litersReceived !== undefined ? `${Number(loc.litersReceived).toLocaleString()} L` : '—'}
                            </td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-mono text-xs">₦{Number(loc.productPrice || 0).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90 font-medium">{(Number(loc.litersDelivered) * Number(loc.productPrice || 0)).toLocaleString()}</td>
                            <td className="text-right py-3 px-4 text-foreground/90">
                              <Badge variant="default" className="text-[10px]">
                                CLIENT
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="losses" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Loss Logs</h3>
                  <p className="text-sm text-muted-foreground">Track any spills, thefts, or direct maintenance expenses incurred.</p>
                </div>
                <Button variant="destructive" onClick={() => setOpenIncidentDialog(true)}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Log Incident or Loss
                </Button>
              </div>
              {lossLogs.length === 0 ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No losses recorded for this trip.</p>
                </div>
              ) : (
                lossLogs.map((log: any) => (
                  <div key={log.id} className="p-5 rounded-2xl border bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-red-700 dark:text-red-400">{log.lossType}</h4>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Lost Quantity</p>
                        <p className="font-medium">{Number(log.lostQuantity)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expenses Incurred</p>
                        <p className="font-medium">₦{Number(log.expensesIncurred).toLocaleString()}</p>
                      </div>
                    </div>
                    {log.comment && (
                      <p className="text-sm bg-background/50 dark:bg-background/40 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        {log.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Unified Assign Destination Dialog */}
      <Dialog open={openAssignDestinationDialog} onOpenChange={(open) => {
        setOpenAssignDestinationDialog(open);
        if (!open) setError(null);
      }}>
        <DialogContent className={cn(
          "w-[calc(100%-2rem)] p-0 gap-0 flex flex-col",
          "max-h-[min(85vh,720px)]",
          destinationType === "STATION" ? "sm:max-w-2xl" : "sm:max-w-2xl"
        )}>
          {/* Fixed Header */}
          <div className="px-6 pt-6 pb-0 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Assign Destination
              </DialogTitle>
              <DialogDescription>
                Route fuel to a station or record a custom drop location.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Body */}
          {(() => {
            const carriedVolume = Number(transport.litersCarried) || 0;
            const salesVol = (transport.sales || []).reduce((acc: number, sale: any) => acc + (Number(sale.litersDespatched) || 0), 0);
            const locsVol = (transport.subsequentLocs || []).reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
            const distributedVolume = salesVol + locsVol;
            const remainingVolume = Math.max(0, carriedVolume - distributedVolume);
            const enteredVolume = destinationType === "STATION" ? Number(assignVolume || 0) : Number(subLiters || 0);
            const isOverAllocated = enteredVolume > 0 && enteredVolume > remainingVolume;

            return (
          <>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-5">
              {/* Allocation Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Carried</p>
                  <p className="text-base font-bold mt-0.5">{carriedVolume.toLocaleString()} L</p>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Allocated</p>
                  <p className="text-base font-bold mt-0.5">{distributedVolume.toLocaleString()} L</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl border text-center",
                  isOverAllocated ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
                )}>
                  <p className={cn("text-[10px] uppercase tracking-widest font-medium", isOverAllocated ? "text-destructive/70" : "text-primary/70")}>Available</p>
                  <p className={cn("text-base font-bold mt-0.5", isOverAllocated ? "text-destructive" : "text-primary")}>{remainingVolume.toLocaleString()} L</p>
                </div>
              </div>

              <Separator />

              {/* Destination Type Tabs */}
              <Tabs value={destinationType} onValueChange={(v) => setDestinationType(v as "STATION" | "CUSTOM")} className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-10">
                  <TabsTrigger value="STATION" className="text-xs font-medium">Rafuel Station</TabsTrigger>
                  <TabsTrigger value="CUSTOM" className="text-xs font-medium">Custom Location</TabsTrigger>
                </TabsList>

                <TabsContent value="STATION" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Select Station</Label>
                        <Select value={assignStationId} onValueChange={setAssignStationId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a station..." />
                          </SelectTrigger>
                          <SelectContent>
                            {stations.map(st => (
                              <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {assignStationId && (
                        <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Station Demand</p>
                          {(() => {
                            const selSt = stations.find((s) => s.id === assignStationId);
                            const reqVol = selSt?.supplyRequests?.[0] ? Number(selSt.supplyRequests[0].requestedLiters) : 0;
                            const assigningNow = Number(assignVolume || 0);
                            const variance = Math.max(0, reqVol - assigningNow);
                            
                            return (
                              <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground text-xs">Requested:</span>
                                  <span className="font-mono text-xs font-medium">{reqVol > 0 ? `${reqVol.toLocaleString()} L` : "—"}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400">
                                  <span className="text-xs">Shortage:</span>
                                  <span className="font-mono text-xs">{variance.toLocaleString()} L</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Volume to Allocate (L)</Label>
                        <Input type="number" min="0" value={assignVolume} onChange={(e) => setAssignVolume(e.target.value)} placeholder="e.g. 15000" className={cn(isOverAllocated && destinationType === "STATION" && "border-destructive focus-visible:ring-destructive/30")} />
                        {isOverAllocated && destinationType === "STATION" && (
                          <p className="text-[11px] text-destructive">Exceeds available volume by {(enteredVolume - remainingVolume).toLocaleString()} L</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Price per Litre (₦)</Label>
                        <Input type="number" min="0" value={assignPrice} onChange={(e) => setAssignPrice(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Transport Cost / Litre (₦)</Label>
                        <Input type="number" min="0" value={assignTransportCost} onChange={(e) => setAssignTransportCost(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="CUSTOM" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location / State</Label>
                      <Input value={subLocation} onChange={(e) => setSubLocation(e.target.value)} placeholder="e.g. Ogun State" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Product Price per Liter (₦)</Label>
                      <Input type="number" min="0" value={subProductPrice} onChange={(e) => setSubProductPrice(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Transport Rate / L (₦)</Label>
                      <Input type="number" min="0" value={subRate} onChange={(e) => setSubRate(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Liters to Deliver</Label>
                      <Input type="number" min="0" value={subLiters} onChange={(e) => setSubLiters(e.target.value)} placeholder="0" className={cn(isOverAllocated && destinationType === "CUSTOM" && "border-destructive focus-visible:ring-destructive/30")} />
                      {isOverAllocated && destinationType === "CUSTOM" && (
                        <p className="text-[11px] text-destructive">Exceeds available volume by {(enteredVolume - remainingVolume).toLocaleString()} L</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Fixed Footer */}
          <Separator />
          <div className="px-6 py-4 shrink-0">
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpenAssignDestinationDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAssignDestination} disabled={isSubmitting || isOverAllocated || (destinationType === "STATION" ? (!assignStationId || !assignVolume || !assignPrice) : (!subLocation || !subRate || !subLiters))}>
                {isSubmitting ? <SpinnerEllipsis /> : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </div>
          </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={openStatusDialog} onOpenChange={setOpenStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Trip Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Incident Dialog */}
      <Dialog open={openIncidentDialog} onOpenChange={setOpenIncidentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Log Incident or Loss
            </DialogTitle>
            <DialogDescription>
              Record any spills, accidents, or theft. This will automatically deduct the lost volume from the transport earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Incident Type</Label>
              <Select value={lossType} onValueChange={setLossType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance </SelectItem>
                  <SelectItem value="ACCIDENT">Accident</SelectItem>
                  <SelectItem value="OTHERS">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lost Quantity (L)*</Label>
                <Input type="number" min="0" value={lostQuantity} onChange={(e) => setLostQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Direct Expenses (₦)</Label>
                <Input type="number" min="0" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={lossComment} onChange={(e) => setLossComment(e.target.value)} placeholder="Explain what happened..." />
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-destructive/5 border-destructive/20 mt-4">
              <Checkbox id="terminateTrip" checked={terminateTrip} onCheckedChange={(c) => setTerminateTrip(!!c)} />
              <div className="space-y-1 leading-none">
                <Label htmlFor="terminateTrip" className="font-semibold text-destructive">Terminate Trip (Total Loss)</Label>
                <p className="text-xs text-muted-foreground">
                  Check this if the transport cannot proceed. The status will be marked as LOSS.
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIncidentDialog(false)}>Cancel</Button>
            <Button onClick={handleLogIncident} disabled={isSubmitting} variant="destructive">
              {isSubmitting ? <SpinnerEllipsis /> : "Submit Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

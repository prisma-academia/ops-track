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
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assign Sale state
  const [assignSaleId, setAssignSaleId] = useState("");
  const [assignTransportRate, setAssignTransportRate] = useState("");

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);

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
      if (!assignSaleId) throw new Error("Please select a sale");
      if (Number(assignTransportRate) < 0) throw new Error("Transport rate cannot be negative");

      const sale = transport.sales.find((s: any) => s.id === assignSaleId);
      if (!sale) throw new Error("Sale not found");

      // 1. Update Sale with transport rate and cost
      const transportCost = Number(assignTransportRate || 0) * Number(sale.litersDespatched);
      const resSale = await apiPatch(`/api/tenant/fleet/sales/${sale.id}`, {
        transportRate: Number(assignTransportRate || 0),
        transportCost: transportCost
      });
      if (resSale.error) throw new Error(resSale.error.message || "Failed to update sale transport rate");

      // 2. Append to Transport's subsequentLocs
      const currentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
      const newLocs = [...currentLocs, {
        location: sale.station ? sale.station.name : (sale.customer ? sale.customer.name : "Unknown"),
        rate: Number(assignTransportRate || 0),
        litersDelivered: Number(sale.litersDespatched),
        date: new Date().toISOString()
      }];
      
      const resTransport = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, {
        subsequentLocs: newLocs
      });
      if (resTransport.error) throw new Error(resTransport.error.message || "Failed to add destination");
      
      setAssignSaleId("");
      setAssignTransportRate("");
      
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
                const locsVol = customDistributions.reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
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
                              <td className="text-right py-3 px-4 text-foreground/90">
                                {(() => {
                                  const saleMatch = transport.sales?.find((s: any) => s.station?.name === loc.location || s.customer?.name === loc.location);
                                  const priceToUse = loc.productPrice || saleMatch?.amountPerLiter;
                                  return priceToUse ? Number(priceToUse).toLocaleString() : '—';
                                })()}
                              </td>
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
                            <td className="text-right py-3 px-4">
                              {sale.litersReceived !== null && sale.litersReceived !== undefined ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-emerald-600 dark:text-emerald-500">{Number(sale.litersReceived).toLocaleString()} L</span>
                                  {Number(sale.litersDespatched || sale.litersSold) !== Number(sale.litersReceived) && (
                                    <span className="text-[10px] text-destructive font-medium uppercase mt-0.5">
                                      Diff: {(Number(sale.litersDespatched || sale.litersSold) - Number(sale.litersReceived)).toLocaleString()} L
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium text-amber-600 dark:text-amber-500">Pending</span>
                              )}
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
          "sm:max-w-2xl"
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
            const locsVol = customDistributions.reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
            const distributedVolume = salesVol + locsVol;
            const remainingVolume = Math.max(0, carriedVolume - distributedVolume);
            
            // Available sales that haven't been added to subsequentLocs yet
            const availableSales = (transport.sales || []).filter((s: any) => {
              const recipientName = s.station ? s.station.name : (s.customer ? s.customer.name : "Unknown");
              return !subsequentLocs.some((loc: any) => loc.location === recipientName);
            });

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
                  "bg-primary/5 border-primary/20"
                )}>
                  <p className={cn("text-[10px] uppercase tracking-widest font-medium", "text-primary/70")}>Available</p>
                  <p className={cn("text-base font-bold mt-0.5", "text-primary")}>{remainingVolume.toLocaleString()} L</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Linked Sale</Label>
                  <Select value={assignSaleId} onValueChange={setAssignSaleId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a sale..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {availableSales.length === 0 ? (
                        <SelectItem value="none" disabled>No available sales</SelectItem>
                      ) : (
                        availableSales.map((sale: any) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.station ? sale.station.name : (sale.customer ? sale.customer.name : "Unknown")} - {Number(sale.litersDespatched).toLocaleString()} L
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Only sales linked to this transport are shown.</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Transport Rate / L (₦)</Label>
                  <Input type="number" min="0" value={assignTransportRate} onChange={(e) => setAssignTransportRate(e.target.value)} placeholder="0.00" />
                </div>
              </div>

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
              <Button size="sm" onClick={handleAssignDestination} disabled={isSubmitting || !assignSaleId}>
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

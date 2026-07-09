"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, Truck, AlertTriangle, CheckCircle, PackageOpen, MoreVertical } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";

export function TransportDetailsManager({ transport }: { transport: any }) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openSubsequentDialog, setOpenSubsequentDialog] = useState(false);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);
  
  // Incident form state
  const [lossType, setLossType] = useState("THEFT");
  const [lostQuantity, setLostQuantity] = useState("");
  const [expensesIncurred, setExpensesIncurred] = useState("");
  const [lossComment, setLossComment] = useState("");
  const [terminateTrip, setTerminateTrip] = useState(false);

  // Subsequent Destination state
  const [subLocation, setSubLocation] = useState("");
  const [subRate, setSubRate] = useState("");
  const [subLiters, setSubLiters] = useState("");

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

  const handleLogIncident = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!lossType || !lostQuantity) {
      setError("Loss Type and Lost Quantity are required");
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

  const handleAddSubsequent = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!subLocation || !subRate || !subLiters) {
      setError("All fields are required");
      setIsSubmitting(false);
      return;
    }

    const currentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
    const newLocs = [...currentLocs, {
      location: subLocation,
      rate: Number(subRate),
      litersDelivered: Number(subLiters)
    }];

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, {
      subsequentLocs: newLocs
    });
    
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setSubLocation("");
      setSubRate("");
      setSubLiters("");
      setOpenSubsequentDialog(false);
      router.refresh();
    }
  };

  const subsequentLocs = Array.isArray(transport.subsequentLocs) ? transport.subsequentLocs : [];
  const lossLogs = transport.lossLogs || [];

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
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full h-10">
            <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
              <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="destinations" className="text-[15px] font-semibold">Destinations ({subsequentLocs.length})</TabsTrigger>
              <TabsTrigger value="distribution" className="text-[15px] font-semibold">Distribution ({transport.sales?.length || 0})</TabsTrigger>
              <TabsTrigger value="losses" className="text-[15px] font-semibold text-red-600 dark:text-red-400">Loss Logs ({lossLogs.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {(() => {
                const carriedVolume = Number(transport.litersCarried) || 0;
                const distributedVolume = (transport.sales || []).reduce((acc: number, sale: any) => acc + (Number(sale.litersDespatched) || 0), 0);
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

            <TabsContent value="destinations" className="mt-6">
              <div className="border rounded-2xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Rate (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Liters Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium text-foreground">{transport.destination} (Primary)</td>
                      <td className="text-right py-3 px-4 text-foreground/90">{Number(transport.ratePerLiter).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-foreground/90">{Number(transport.litersCarried).toLocaleString()} L</td>
                    </tr>
                    {subsequentLocs.map((loc: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                        <td className="py-3 px-4 text-foreground/90">{loc.location}</td>
                        <td className="text-right py-3 px-4 text-foreground/90">{Number(loc.rate).toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-foreground/90">{Number(loc.litersDelivered).toLocaleString()} L</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="mt-6">
              <div className="border rounded-2xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Recipient</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Volume</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!transport.sales || transport.sales.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No sales/distribution recorded for this trip.
                        </td>
                      </tr>
                    ) : (
                      transport.sales.map((sale: any) => (
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
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium">{Number(sale.totalExpectedAmount || sale.totalAmount).toLocaleString()}</td>
                          <td className="text-right py-3 px-4 text-foreground/90">
                            <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="text-[10px]">
                              {sale.transportCostBorneBy === 'COMPANY' ? 'COMPANY' : 'CLIENT'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="losses" className="mt-6 space-y-4">
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

        <div className="space-y-6">
          <div className="p-4 rounded-2xl border bg-card space-y-3">
            <h3 className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground border-b pb-2 mb-3">Trip Actions</h3>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full justify-start h-11" asChild>
                <Link href={`/admin/fleet/sales/new?transportId=${transport.id}`}>
                  <PackageOpen className="h-4 w-4 mr-3" />
                  Record Sale / Distribution
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start h-11" onClick={() => setOpenSubsequentDialog(true)}>
                <MapPin className="h-4 w-4 mr-3" />
                Add Subsequent Destination
              </Button>
              <Button variant="outline" className="w-full justify-start h-11" onClick={() => setOpenStatusDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-3" />
                Update Trip Status
              </Button>
              <Button variant="outline" className="w-full justify-start h-11 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setOpenIncidentDialog(true)}>
                <AlertTriangle className="h-4 w-4 mr-3" />
                Log Incident or Loss
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Subsequent Destination Dialog */}
      <Dialog open={openSubsequentDialog} onOpenChange={setOpenSubsequentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subsequent Destination</DialogTitle>
            <DialogDescription>Record additional drops made during this trip.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location / State</Label>
              <Input value={subLocation} onChange={(e) => setSubLocation(e.target.value)} placeholder="e.g. Ogun State" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate per Liter (₦)</Label>
                <Input type="number" value={subRate} onChange={(e) => setSubRate(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Liters Delivered</Label>
                <Input type="number" value={subLiters} onChange={(e) => setSubLiters(e.target.value)} placeholder="0" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSubsequentDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSubsequent} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Add Destination"}
            </Button>
          </DialogFooter>
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
                <Input type="number" value={lostQuantity} onChange={(e) => setLostQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Direct Expenses (₦)</Label>
                <Input type="number" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" />
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

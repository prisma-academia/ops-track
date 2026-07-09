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
import { ArrowLeft, MapPin, Truck, AlertTriangle, CheckCircle, PackageOpen, MoreVertical } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";

export function TransportDetailsManager({ transport }: { transport: any }) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openSubsequentDialog, setOpenSubsequentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form state
  const [newStatus, setNewStatus] = useState(transport.status);
  const [lossType, setLossType] = useState("THEFT");
  const [lostQuantity, setLostQuantity] = useState("");
  const [expensesIncurred, setExpensesIncurred] = useState("");
  const [lossComment, setLossComment] = useState("");

  // Subsequent Destination state
  const [subLocation, setSubLocation] = useState("");
  const [subRate, setSubRate] = useState("");
  const [subLiters, setSubLiters] = useState("");

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: any = { status: newStatus };
    if (newStatus === "LOSS") {
      if (!lossType || !lostQuantity) {
        setError("Loss Type and Lost Quantity are required");
        setIsSubmitting(false);
        return;
      }
      payload.lossLog = {
        lossType,
        lostQuantity: Number(lostQuantity),
        expensesIncurred: Number(expensesIncurred || 0),
        comment: lossComment
      };
    }

    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenStatusDialog(false);
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
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenSubsequentDialog(true)}>
            <MapPin className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
          <Button size="sm" onClick={() => setOpenStatusDialog(true)}>
            Update Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full h-10">
            <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
              <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="destinations" className="text-[15px] font-semibold">Destinations ({subsequentLocs.length})</TabsTrigger>
              <TabsTrigger value="losses" className="text-[15px] font-semibold text-red-600 dark:text-red-400">Loss Logs ({lossLogs.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Volume Carried</p>
                  <p className="text-2xl font-bold text-foreground">{Number(transport.litersCarried).toLocaleString()} L</p>
                </div>
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Rate per Liter</p>
                  <p className="text-2xl font-bold text-foreground">₦{Number(transport.ratePerLiter).toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Loss Deductions</p>
                  <p className="text-2xl font-bold text-destructive">₦{Number(transport.totalDeduction).toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Net Transport Fee</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">₦{Number(transport.netTransportFeePaid).toLocaleString()}</p>
                </div>
              </div>

              {transport.comment && (
                <div className="p-5 rounded-2xl border bg-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Trip Notes</p>
                  <p className="text-sm text-foreground">{transport.comment}</p>
                </div>
              )}
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
          <div className="p-5 rounded-2xl border bg-card space-y-4">
            <h3 className="font-semibold uppercase tracking-widest text-xs text-muted-foreground border-b pb-2">Trip Personnel</h3>
            
            <div>
              <p className="text-xs text-muted-foreground">Driver</p>
              <p className="font-medium text-foreground">{transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unassigned"}</p>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground">Order Reference</p>
              <p className="font-medium text-foreground">
                {transport.order?.reference ? (
                  <Link href={`/admin/fleet/orders/${transport.order.id}`} className="text-primary hover:underline">
                    {transport.order.reference}
                  </Link>
                ) : "No Order Linked"}
              </p>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="LOSS" className="text-destructive font-semibold">Mark as Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "LOSS" && (
              <div className="space-y-4 pt-4 border-t border-destructive/20 animate-in slide-in-from-top-2">
                <h4 className="text-sm font-semibold text-destructive uppercase tracking-widest">Loss Details</h4>
                
                <div className="space-y-2">
                  <Label>Loss Type</Label>
                  <Select value={lossType} onValueChange={setLossType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THEFT">Theft</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance Issue</SelectItem>
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
                    <Label>Expenses (₦)</Label>
                    <Input type="number" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={lossComment} onChange={(e) => setLossComment(e.target.value)} placeholder="Explain the incident..." />
                </div>
              </div>
            )}
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting} variant={newStatus === "LOSS" ? "destructive" : "default"}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

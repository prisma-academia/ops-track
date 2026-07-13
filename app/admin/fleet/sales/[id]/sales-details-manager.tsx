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
import { ArrowLeft, CheckCircle, MapPin, Truck, Banknote, CalendarIcon, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SalesDetailsManager({ sale }: { sale: any }) {
  const router = useRouter();

  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form
  const [newStatus, setNewStatus] = useState(sale.status);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payReference, setPayReference] = useState("");

  // Edit form
  const [editLitersReceived, setEditLitersReceived] = useState(sale.litersReceived?.toString() || "");
  const [editAmountPerLiter, setEditAmountPerLiter] = useState(sale.amountPerLiter?.toString() || "");

  const totalExpected = Number(sale.totalExpectedAmount);
  const paymentReceived = Number(sale.paymentReceived);
  const outstanding = Math.max(0, totalExpected - paymentReceived);

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiPatch(`/api/tenant/fleet/sales/${sale.id}`, { status: newStatus });
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenStatusDialog(false);
      router.refresh();
    }
  };

  const handleAddPayment = async () => {
    setIsSubmitting(true);
    setError(null);

    if (Number(payAmount) <= 0) {
      setError("Payment amount must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (!payMethod) {
      setError("Payment method is required");
      setIsSubmitting(false);
      return;
    }

    const res = await apiPost(`/api/tenant/fleet/sales/${sale.id}/payments`, {
      amount: Number(payAmount),
      paymentMethod: payMethod,
      description: payDescription,
      reference: payReference,
    });
    
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenPaymentDialog(false);
      setPayAmount("");
      setPayMethod("");
      setPayDescription("");
      setPayReference("");
      router.refresh();
    }
  };

  const handleEditSale = async () => {
    setIsSubmitting(true);
    setError(null);
    
    const payload: any = {};
    if (editLitersReceived) payload.litersReceived = Number(editLitersReceived);
    if (editAmountPerLiter) payload.amountPerLiter = Number(editAmountPerLiter);

    const res = await apiPatch(`/api/tenant/fleet/sales/${sale.id}`, payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenEditDialog(false);
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLEARED":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">CLEARED</Badge>;
      case "PART_PAID":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">PARTIAL PAYMENT</Badge>;
      case "UNPAID":
      default:
        return <Badge variant="destructive">UNPAID</Badge>;
    }
  };

  const recipientName = sale.customer ? sale.customer.name : sale.station ? sale.station.name : "Unknown Recipient";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/admin/fleet/sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
              Sale to {recipientName}
              {getStatusBadge(sale.status)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Despatched: {new Date(sale.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setOpenStatusDialog(true)} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Override Status
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
            <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="payments" className="text-[15px] font-semibold">Payments ({sale.transactions?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-lg">Sales & Distribution Summary</h3>
                <p className="text-sm text-muted-foreground">Volume delivered and financial tracking.</p>
              </div>
              <Button onClick={() => setOpenEditDialog(true)} variant="secondary" size="sm">
                Edit Volumes & Pricing
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Despatched</p>
                <p className="text-xl font-bold text-foreground">{Number(sale.litersDespatched).toLocaleString()} L</p>
              </div>
              <div className="p-4 rounded-2xl border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Received</p>
                <p className={cn("text-xl font-bold", sale.litersReceived === null ? "text-amber-500" : "text-foreground")}>
                  {sale.litersReceived !== null ? `${Number(sale.litersReceived).toLocaleString()} L` : 'Pending'}
                </p>
              </div>
              <div className="p-4 rounded-2xl border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Price per Liter</p>
                <p className="text-xl font-bold text-foreground">₦{Number(sale.amountPerLiter).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl border bg-card border-l-4 border-l-primary">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Expected</p>
                <p className="text-xl font-bold text-foreground">₦{totalExpected.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-semibold mb-1">Total Paid</p>
                <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">₦{paymentReceived.toLocaleString()}</p>
              </div>
              <div className={cn("p-4 rounded-2xl border", outstanding > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50" : "bg-card")}>
                <p className={cn("text-[10px] uppercase tracking-widest font-semibold mb-1", outstanding > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>Outstanding Balance</p>
                <p className={cn("text-3xl font-bold", outstanding > 0 ? "text-red-800 dark:text-red-300" : "text-foreground")}>₦{outstanding.toLocaleString()}</p>
              </div>
            </div>

            {sale.transport && (
              <div className="p-4 rounded-2xl border bg-card space-y-3">
                <h3 className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground border-b pb-2 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Transport Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Transporter</p>
                    <p className="text-sm font-medium text-foreground">{sale.transport.transporter?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Truck</p>
                    <p className="text-sm font-medium text-foreground">{sale.transport.truck?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Driver</p>
                    <p className="text-sm font-medium text-foreground">{sale.transport.driver ? `${sale.transport.driver.firstName} ${sale.transport.driver.lastName}` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Transport Cost Borne By</p>
                    <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="mt-1 text-[10px]">
                      {sale.transportCostBorneBy}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-6 space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-lg">Payment History</h3>
                <p className="text-sm text-muted-foreground">Record and track incoming funds for this sale.</p>
              </div>
              <Button onClick={() => setOpenPaymentDialog(true)} disabled={outstanding <= 0}>
                <Banknote className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ref</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {(!sale.transactions || sale.transactions.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sale.transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                        <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {tx.paymentMethod || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {tx.description || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {tx.reference || "—"}
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                          +{Number(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-500" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Log an incoming payment for this sale. The status will auto-update if fully cleared.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Amount Received (₦)*</Label>
                <span className="text-xs text-muted-foreground">Outstanding: ₦{outstanding.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <Input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                <Button variant="secondary" onClick={() => setPayAmount(outstanding.toString())} type="button">Max</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method*</Label>
              <Input list="payment-methods" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="e.g. Bank Transfer" />
              <datalist id="payment-methods">
                <option value="Bank Transfer" />
                <option value="Cash" />
                <option value="Cheque" />
                <option value="POS" />
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Reference (Optional)</Label>
              <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="e.g. TXN-12345" />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea value={payDescription} onChange={(e) => setPayDescription(e.target.value)} placeholder="Additional details..." />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Sales Volumes & Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Liters Received</Label>
              <Input type="number" min="0" value={editLitersReceived} onChange={(e) => setEditLitersReceived(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Price per Liter (₦)</Label>
              <Input type="number" min="0" value={editAmountPerLiter} onChange={(e) => setEditAmountPerLiter(e.target.value)} />
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSale} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={openStatusDialog} onOpenChange={setOpenStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Sale Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">UNPAID</SelectItem>
                  <SelectItem value="PART_PAID">PARTIAL PAYMENT</SelectItem>
                  <SelectItem value="CLEARED">CLEARED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
              {isSubmitting ? <SpinnerEllipsis /> : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

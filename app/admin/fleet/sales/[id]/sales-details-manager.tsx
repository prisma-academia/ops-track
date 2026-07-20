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
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status form
  const [newStatus, setNewStatus] = useState(sale.status);

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
              <div className="p-4 rounded-2xl border bg-card">
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

            {/* Net Profit & Loss Card */}
            {(() => {
              const x = Number(sale.litersReceived ?? sale.litersDespatched);
              
              // Waybill/subsequent delivery transport fee
              const w = Number(sale.transportCost || 0);
              
              // Primary transport fee for this sale
              const tRate = Number(sale.transport?.ratePerLiter || 0);
              const t = tRate * x;
              
              // Loading fee
              const orderLoadingCost = Number(sale.transport?.order?.loadingCost || 0);
              const loadingFeePerLitre = orderLoadingCost / (Number(sale.litersDespatched) || 1);
              const l = loadingFeePerLitre * x;
              
              // Purchase cost
              const orderPricePerLitre = Number(sale.transport?.order?.pricePerLitre || 0);
              const e = orderPricePerLitre * x;
              
              const A = totalExpected;
              
              const netProfitLoss = A - e - t - l - w;

              return (
                <div className="rounded-3xl border bg-card overflow-hidden shadow-sm mt-8">
                  <div className="bg-muted/30 p-5 border-b border-border/50">
                    <h3 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Net Profit & Loss Summary
                    </h3>
                  </div>
                  
                  {/* Top-Level Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b border-border/50">
                    <div className="p-6 flex flex-col justify-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Total Sales Revenue (A)</p>
                      <p className="text-3xl font-bold text-foreground">₦{A.toLocaleString()}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-background to-muted/10 flex flex-col justify-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Net Profit / Loss</p>
                      <p className={cn("text-4xl font-black tracking-tight", netProfitLoss >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                        {netProfitLoss >= 0 ? "+" : ""}₦{netProfitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="p-6 bg-muted/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">Deductions Breakdown</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl border bg-background hover:border-destructive/30 transition-colors shadow-sm">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Purchase Cost (e)</p>
                        <p className="text-xl font-bold text-destructive">₦{e.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 opacity-80 font-medium">@ ₦{orderPricePerLitre.toLocaleString()}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors shadow-sm">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Primary Transport (t)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{t.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 opacity-80 font-medium">@ ₦{tRate.toLocaleString()}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors shadow-sm">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Loading Fee (l)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{l.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 opacity-80 font-medium">@ ₦{loadingFeePerLitre.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors shadow-sm">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Subsequent Trans. (w)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{w.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                <p className="text-sm text-muted-foreground">View recorded incoming funds for this sale. Payments are now centralized.</p>
              </div>
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

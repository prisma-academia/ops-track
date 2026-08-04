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
import { ArrowLeft, CheckCircle, MapPin, Truck, Banknote, CalendarIcon, PackageOpen, Printer, Pencil, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WaybillPrintView } from "./waybill-print-view";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Droplet } from "lucide-react";

export function SalesDetailsManager({ sale }: { sale: any }) {
  const router = useRouter();

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeductDialog, setOpenDeductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form
  const [editLitersReceived, setEditLitersReceived] = useState(sale.litersReceived?.toString() || "");
  const [editAmountPerLiter, setEditAmountPerLiter] = useState(sale.amountPerLiter?.toString() || "");

  const totalExpected = Number(sale.totalExpectedAmount);
  const paymentReceived = Number(sale.paymentReceived);
  const outstanding = Math.max(0, totalExpected - paymentReceived);
  
  const litersDespatched = Number(sale.litersDespatched || 0);
  const litersReceived = sale.litersReceived !== null ? Number(sale.litersReceived) : null;
  const variance = litersReceived !== null ? litersDespatched - litersReceived : null;
  const amountPerLiter = Number(sale.amountPerLiter || 0);
  const totalDeductionAmount = variance !== null && variance > 0 ? variance * amountPerLiter : 0;
  
  const hasDeduction = sale.transport?.lossLogs?.some((l: any) => l.comment?.includes(sale.id)) || false;

  const handleDeduct = async () => {
    setIsDeducting(true);
    const res = await apiPost(`/api/tenant/fleet/sales/${sale.id}/deduct-shortage`, {
      variance,
      pricePerLiter: amountPerLiter,
      totalDeduction: totalDeductionAmount,
    });
    setIsDeducting(false);

    if (!res.error) {
      setOpenDeductDialog(false);
      router.refresh();
    } else {
      alert(res.error.message);
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
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start h-16 bg-muted/50 backdrop-blur-xs border border-border">
            <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="payments" className="text-[15px] font-semibold">Payments ({sale.transactions?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-semibold text-lg">Sales & Distribution Summary</h3>
                <p className="text-sm text-muted-foreground">Volume delivered and financial tracking.</p>
              </div>
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
              const wRate = x > 0 ? w / x : 0;
              
              // Primary transport fee for this sale
              const tRate = Number(sale.transport?.ratePerLiter || 0);
              const t = tRate * x;
              
              // Loading fee
              const orderLoadingCost = Number(sale.transport?.order?.loadingCost || 0);
              const orderLiters = Number(sale.transport?.order?.litersOrdered || 1);
              const loadingFeePerLitre = orderLoadingCost / orderLiters;
              const l = loadingFeePerLitre * x;
              
              // Purchase cost
              const orderPricePerLitre = Number(sale.transport?.order?.pricePerLitre || 0);
              const e = orderPricePerLitre * x;
              
              const A = totalExpected;
              
              const netProfitLoss = A - e - t - l - w;

              return (
                <div className="rounded-3xl border bg-card overflow-hidden mt-8">
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
                      <div className="p-4 rounded-2xl border bg-background hover:border-destructive/30 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Purchase Cost (e)</p>
                        <p className="text-xl font-bold text-destructive">₦{e.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 opacity-80 font-semibold">@ ₦{orderPricePerLitre.toLocaleString()}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Primary Transport (t)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{t.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 opacity-80 font-semibold">@ ₦{tRate.toLocaleString()}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Loading Fee (l)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{l.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 opacity-80 font-semibold">@ ₦{loadingFeePerLitre.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L</p>
                      </div>
                      <div className="p-4 rounded-2xl border bg-background hover:border-amber-500/30 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Subsequent Trans. (w)</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-500">₦{w.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 opacity-80 font-semibold">@ ₦{wRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}/L</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}


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
        
        {/* Right Sidebar Actions Card */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <div className="p-5 border rounded-2xl bg-card space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-1">Actions</h3>
            
            <Button size="lg" className="w-full justify-start" variant="outline" onClick={() => setOpenEditDialog(true)}>
              <Pencil className="w-5 h-5 mr-3" />
              Edit Volumes & Pricing
            </Button>
            
            <Button size="lg" className="w-full justify-start" variant="outline" onClick={() => window.open(`/admin/fleet/sales/${sale.id}/print`, '_blank')}>
              <Printer className="w-5 h-5 mr-3" />
              Print Waybill
            </Button>

            {hasDeduction && (
              <div className="pt-2 border-t mt-2">
                <Badge variant="outline" className="w-full justify-center border-red-200 bg-red-50 text-red-700 py-2.5 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Deduction Logged (₦{totalDeductionAmount.toLocaleString()})
                </Badge>
              </div>
            )}
            {!hasDeduction && variance !== null && variance > 0 && (
              <div className="pt-2 border-t mt-2">
                <Button size="lg" className="w-full justify-start" variant="destructive" onClick={() => setOpenDeductDialog(true)}>
                  <MinusCircle className="w-5 h-5 mr-3" />
                  Log Shortage Deduction
                </Button>
              </div>
            )}
          </div>

          {sale.transport && (
            <div className="p-5 border rounded-2xl bg-card space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground border-b pb-3 mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" /> Transport Info
              </h3>
              <div className="space-y-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Transporter</p>
                  <p className="text-sm font-medium text-foreground">{sale.transport.transporter?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Truck</p>
                  <p className="text-sm font-medium text-foreground">{sale.transport.truck?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Driver</p>
                  <p className="text-sm font-medium text-foreground">{sale.transport.driver ? `${sale.transport.driver.firstName} ${sale.transport.driver.lastName}` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Cost Borne By</p>
                  <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="mt-1 text-[10px]">
                    {sale.transportCostBorneBy}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Sales Volumes & Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {sale.station ? (
              <div className="space-y-2">
                <Label>Liters Received</Label>
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
                  Volume received must be logged by the station via Waybill Delivery.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Liters Received</Label>
                <FormattedNumberInput min="0" value={editLitersReceived} onChange={(e) => setEditLitersReceived(e.target.value)} prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />} />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Price per Liter (₦)</Label>
              <FormattedNumberInput min="0" value={editAmountPerLiter} onChange={(e) => setEditAmountPerLiter(e.target.value)} prefixText="₦" />
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

      {/* Deduct Dialog */}
      <Dialog open={openDeductDialog} onOpenChange={(val) => { if (!isDeducting) setOpenDeductDialog(val); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Shortage Deduction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              A shortage of <strong>{variance?.toLocaleString()} L</strong> was detected. 
              The driver&apos;s transport fee will be deducted by the value of the lost product.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Shortage</p>
                <p className="text-lg font-semibold">{variance?.toLocaleString()} L</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Price / Liter</p>
                <p className="text-lg font-semibold">₦{amountPerLiter.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20 text-destructive">
              <p className="text-xs uppercase tracking-widest">Total Deduction</p>
              <p className="text-xl font-bold">₦{totalDeductionAmount.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeductDialog(false)} disabled={isDeducting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeduct} disabled={isDeducting}>
              {isDeducting ? <SpinnerEllipsis /> : "Confirm Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}

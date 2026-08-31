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
import { ArrowLeft, Truck, AlertTriangle, CheckCircle, Droplets, FileText, Link2, ChevronsUpDown, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import Link from "next/link";
import { AssetTank } from "@/components/asset-tank";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Droplet } from "lucide-react";
import { TransportFeeBreakdown, getTransactionFeeLegLabel } from "@/components/fleet/transport-fee-breakdown";
import { PRODUCT_LOSS_TYPES, getLossTypeLabel, getProductLossType, isNotesRequiredForLossType } from "@/lib/fleet/loss-types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function TransportDetailsManager({
  transport,
  orders = [],
  originToDepotFee = 0,
  initialTab = "overview",
}: {
  transport: any;
  orders?: any[];
  originToDepotFee?: number;
  initialTab?: string;
}) {
  const router = useRouter();
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openLinkOrderDialog, setOpenLinkOrderDialog] = useState(false);
  const [openOrderSelect, setOpenOrderSelect] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(transport.orderId || "");
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



  const handleLinkOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}`, {
      orderId: selectedOrderId || null,
    });
    setIsSubmitting(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenLinkOrderDialog(false);
      router.refresh();
    }
  };

  const lossLogs = transport.lossLogs || [];
  const carriedVolume = Number(transport.litersCarried) || 0;
  const distributedVolume = (transport.deliveries || []).reduce(
    (acc: number, sale: { litersDespatched?: number | string | null }) => acc + (Number(sale.litersDespatched) || 0),
    0
  );
  const loggedLostVolume = lossLogs.reduce(
    (sum: number, log: { lostQuantity?: number | string | null }) => sum + Number(log.lostQuantity || 0),
    0
  );
  const remainingVolume = Math.max(0, carriedVolume - distributedVolume - loggedLostVolume);
  const maxLosableVolume = Math.max(0, carriedVolume - loggedLostVolume);
  const ratePerLiter = Number(transport.ratePerLiter) || 0;
  const selectedLossType = getProductLossType(lossType);
  const incidentQuantity = Number(lostQuantity || 0);
  const incidentExpenses = Number(expensesIncurred || 0);
  const exceedsRemaining = incidentQuantity > remainingVolume + 0.001;
  const volumeDeduction = incidentQuantity * ratePerLiter;

  const handleLogIncident = async () => {
    setIsSubmitting(true);
    setError(null);

    const quantity = Number(lostQuantity || 0);
    const expenses = Number(expensesIncurred || 0);
    const selectedType = getProductLossType(lossType);

    if (!lossType || !selectedType) {
      setError("Select an incident type");
      setIsSubmitting(false);
      return;
    }

    if (!lostQuantity || quantity <= 0) {
      setError("Lost quantity must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    if (quantity > maxLosableVolume + 0.001) {
      setError(`Lost quantity cannot exceed the ${carriedVolume.toLocaleString()} L loaded on this trip`);
      setIsSubmitting(false);
      return;
    }

    if (expenses < 0) {
      setError("Expenses cannot be negative");
      setIsSubmitting(false);
      return;
    }

    if (isNotesRequiredForLossType(lossType) && !lossComment.trim()) {
      setError("Describe what happened — notes are required for this incident type");
      setIsSubmitting(false);
      return;
    }

    const payload: {
      lossLog: {
        lossType: string;
        lostQuantity: number;
        expensesIncurred: number;
        comment?: string;
      };
      addLitersLost: number;
      addMaintenanceCost: number;
      status?: string;
    } = {
      lossLog: {
        lossType,
        lostQuantity: quantity,
        expensesIncurred: expenses,
        comment: lossComment.trim() || undefined,
      },
      addLitersLost: quantity,
      addMaintenanceCost: expenses,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/admin/transports">
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
              {transport.transporter?.name} • {transport.truck?.name || "No truck"} • {transport.productType || "—"}
            </p>
          </div>
        </div>
        
        <Button onClick={() => setOpenStatusDialog(true)} variant="outline">
          <CheckCircle className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-2xl border bg-card">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Transporter</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.transporter.name}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Truck</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.truck?.name || "Unassigned"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Driver</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.driver ? `${transport.driver.firstName} ${transport.driver.lastName}` : "Unassigned"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Product Type</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{transport.productType}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Order Reference</p>
          <div className="flex items-center gap-2 mt-0.5">
            {transport.order?.reference ? (
              <Link href={`/admin/orders/${transport.order.id}`} className="text-sm font-medium text-primary hover:underline">
                {transport.order.reference}
              </Link>
            ) : (
              <>
                <span className="text-sm font-medium text-muted-foreground">No order linked</span>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setOpenLinkOrderDialog(true)}>
                  <Link2 className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="w-full justify-start h-14 bg-muted/50 backdrop-blur-xs rounded-3xl border border-border">
              <TabsTrigger value="overview" className="text-[15px] font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="distribution" className="text-[15px] font-semibold">Distribution ({transport.deliveries?.length || 0})</TabsTrigger>
              <TabsTrigger value="losses" className="text-[15px] font-semibold text-red-600 dark:text-red-400">Loss Logs ({lossLogs.length})</TabsTrigger>
              <TabsTrigger value="payments" className="text-[15px] font-semibold">Payments & Expenses ({(transport.transactions || []).length})</TabsTrigger>

            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-8">
              {/* Section 1: Volume Reconciliation */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      Volume Reconciliation
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track how the loaded volume was distributed and identify any shortages.
                    </p>
                  </div>
                </div>

                {(() => {
                  const variance = (transport.deliveries || []).reduce((sum: number, item: any) => {
                    const despatched = Number(item.litersDespatched || item.litersSold || 0);
                    const received = item.litersReceived;
                    if (received !== null && received !== undefined) {
                      return sum + (despatched - Number(received));
                    }
                    return sum;
                  }, 0);

                  const variancePercentage = carriedVolume > 0 ? (variance / carriedVolume) * 100 : 0;
                  const distributedPercentage = carriedVolume > 0 ? (distributedVolume / carriedVolume) * 100 : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Loaded Volume</p>
                          <p className="text-2xl font-bold text-foreground">{carriedVolume.toLocaleString()} L</p>
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distributed</p>
                          <p className="text-2xl font-bold text-foreground">{distributedVolume.toLocaleString()} L</p>
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remaining to Deliver</p>
                          <p className="text-2xl font-bold text-foreground">{remainingVolume.toLocaleString()} L</p>
                          {loggedLostVolume > 0 && (
                            <p className="text-xs text-destructive mt-1">{loggedLostVolume.toLocaleString()} L logged as lost</p>
                          )}
                        </div>
                        <div className="p-4 rounded-2xl border bg-card shadow-sm flex flex-col justify-center">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shortage (Variance)</p>
                          <div className="flex items-end gap-2">
                            <p className={cn("text-2xl font-bold", variance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500")}>
                              {variance.toLocaleString()} L
                            </p>
                            {variance > 0 && (
                              <span className="text-xs font-medium text-destructive mb-1">({variancePercentage.toFixed(2)}%)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl border bg-card shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-foreground">Delivery Progress</span>
                            <span className="text-sm font-bold text-primary">{Math.round(distributedPercentage)}%</span>
                          </div>
                          <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${Math.min(distributedPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                            <span>0 L</span>
                            <span>{carriedVolume.toLocaleString()} L Total</span>
                          </div>
                        </div>
                        
                        <div className="">
                          <AssetTank 
                            layout="fleet"
                            currentLitres={remainingVolume} 
                            maxCapacity={carriedVolume} 
                            label="Remaining in Transport" 
                            type={transport.productType === "LPG" ? "gas" : "fuel"} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {transport.comment ? (
                <div className="p-5 rounded-2xl border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Trip Notes</p>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{transport.comment}</p>
                </div>
              ) : null}

              <TransportFeeBreakdown transport={transport} originToDepotFee={originToDepotFee} />
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
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Transport Cost</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!transport.deliveries || transport.deliveries.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No sales/distribution recorded for this trip.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {transport.deliveries?.map((sale: any) => (
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
                            <td className="text-right py-3 px-4 text-foreground/90">
                              <Badge variant={sale.transportCostBorneBy === 'COMPANY' ? 'secondary' : 'default'} className="text-[10px]">
                                {sale.transportCostBorneBy === 'COMPANY' ? 'COMPANY' : 'CLIENT'}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/admin/deliveries/${sale.id}/print?from=transport`}>
                                  <Printer className="w-4 h-4 mr-2" />
                                  Print Waybill
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    {((transport.deliveries && transport.deliveries.length > 0)) ? (
                      <>
                        <tr className="bg-muted/30 border-t border-border/50 font-bold">
                          <td colSpan={2} className="text-right py-3 px-4 text-foreground">Total:</td>
                        <td className="text-right py-3 px-4 text-foreground">
                          {(() => {
                             const salesDespatched = (transport.deliveries || []).reduce((sum: number, sale: any) => sum + Number(sale.litersDespatched || sale.litersSold || 0), 0);
                             return `${(salesDespatched).toLocaleString()} L`;
                          })()}
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600 dark:text-emerald-500">
                          {(() => {
                             const salesReceived = (transport.deliveries || []).reduce((sum: number, sale: any) => sum + (sale.litersReceived !== null && sale.litersReceived !== undefined ? Number(sale.litersReceived) : 0), 0);
                             return `${(salesReceived).toLocaleString()} L`;
                          })()}
                        </td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                      {(() => {
                         const variance = (transport.deliveries || []).reduce((sum: number, item: any) => {
                           const despatched = Number(item.litersDespatched || item.litersSold || 0);
                           const received = item.litersReceived;
                           if (received !== null && received !== undefined) {
                             return sum + (despatched - Number(received));
                           }
                           return sum;
                         }, 0);

                         if (variance <= 0) return null;

                         return (
                           <tr className="bg-destructive/5 border-t border-destructive/20 font-bold text-destructive">
                             <td colSpan={3} className="text-right py-3 px-4 uppercase text-[11px] tracking-wider">Total Variance / Shortage:</td>
                             <td className="text-right py-3 px-4">{variance.toLocaleString()} L</td>
                             <td colSpan={3}></td>
                           </tr>
                         );
                      })()}
                    </>
                    ) : null}
                  </tfoot>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="losses" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Loss Logs</h3>
                  <p className="text-sm text-muted-foreground">
                    Product lost in transit — theft, accident, spill, leakage, shortage, or contamination. Truck repairs belong in Payments & Expenses.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => { setError(null); setOpenIncidentDialog(true); }}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Log Incident or Loss
                </Button>
              </div>
              {lossLogs.length === 0 ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No product losses recorded for this trip.</p>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Incident</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Notes</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Lost (L)</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Expenses (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lossLogs.map((log: { id: string; createdAt: string; lossType: string; comment?: string | null; lostQuantity?: number | string | null; expensesIncurred?: number | string | null }) => (
                        <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{getLossTypeLabel(log.lossType)}</div>
                            {getProductLossType(log.lossType)?.summary && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {getProductLossType(log.lossType)?.summary}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground/90 max-w-[280px] truncate" title={log.comment || ""}>
                            {log.comment || "—"}
                          </td>
                          <td className="text-right py-3 px-4 text-destructive font-medium">
                            {Number(log.lostQuantity || 0).toLocaleString()} L
                          </td>
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium font-mono text-destructive">
                            {Number(log.expensesIncurred || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border/50 font-bold">
                        <td colSpan={3} className="text-right py-3 px-4 text-foreground">Total product loss:</td>
                        <td className="text-right py-3 px-4 text-destructive">
                          {loggedLostVolume.toLocaleString()} L
                        </td>
                        <td className="text-right py-3 px-4 text-destructive font-mono text-base">
                          {(() => {
                            const totalExpenses = lossLogs.reduce(
                              (sum: number, log: { expensesIncurred?: number | string | null }) => sum + Number(log.expensesIncurred || 0),
                              0
                            );
                            return `₦${totalExpenses.toLocaleString()}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-6 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="font-semibold text-lg">Payments & Expenses</h3>
                  <p className="text-sm text-muted-foreground">Outgoing payments for fleet-related expenses and transport fees.</p>
                </div>
              </div>
              
              {(!transport.transactions || transport.transactions.length === 0) ? (
                <div className="text-center py-12 border rounded-2xl bg-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No payments or expenses recorded for this trip.</p>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fee Leg</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Method & Ref</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Receipt</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transport.transactions.map((txn: any, idx: number) => (
                        <tr key={txn.id || idx} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                          <td className="py-3 px-4 text-foreground/90 whitespace-nowrap">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">
                              {txn.category === "FLEET_EXPENSE" ? "Fleet Expense" : txn.category === "TRANSPORT_PAYMENT" ? "Transport Fee" : txn.category}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground/90 text-xs">
                            {txn.category === "TRANSPORT_PAYMENT" ? getTransactionFeeLegLabel(txn, transport) : "—"}
                          </td>
                          <td className="py-3 px-4 text-foreground/90 max-w-[200px] truncate" title={txn.description || ""}>
                            {txn.description || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-foreground/90">{txn.paymentMethod || "N/A"}</div>
                            {txn.reference && <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{txn.reference}</div>}
                          </td>
                          <td className="text-right py-3 px-4">
                            {txn.receiptUrl ? (
                              <a href={txn.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                View
                              </a>
                            ) : "—"}
                          </td>
                          <td className="text-right py-3 px-4 text-foreground/90 font-medium font-mono text-destructive">
                            {Number(txn.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border/50 font-bold">
                        <td colSpan={6} className="text-right py-3 px-4 text-foreground">Total Payments & Expenses:</td>
                        <td className="text-right py-3 px-4 text-destructive font-mono text-base">
                          {(() => {
                             const totalAmount = transport.transactions.reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
                             return `₦${totalAmount.toLocaleString()}`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>



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
      <Dialog
        open={openIncidentDialog}
        onOpenChange={(open) => {
          setOpenIncidentDialog(open);
          if (open) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Log Product Loss
            </DialogTitle>
            <DialogDescription>
              Record product lost on this trip. Lost litres are deducted from remaining volume and from transporter earnings at ₦{ratePerLiter.toLocaleString()}/L. Truck repairs belong in Payments & Expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What happened</Label>
              <Select value={lossType} onValueChange={setLossType}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedLossType?.label ?? "Select what happened"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_LOSS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} textValue={type.label}>
                      <span className="flex flex-col items-start gap-0.5 py-0.5">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground font-normal whitespace-normal">
                          {type.summary}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLossType && (
                <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/40 p-3">
                  {selectedLossType.guidance}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lost quantity (L)*</Label>
                <FormattedNumberInput min="0" value={lostQuantity} onChange={(e) => setLostQuantity(e.target.value)} placeholder="0" prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />} />
                <p className="text-[11px] text-muted-foreground">
                  Remaining on truck: {remainingVolume.toLocaleString()} L of {carriedVolume.toLocaleString()} L loaded
                </p>
                {exceedsRemaining && incidentQuantity <= maxLosableVolume && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500">
                    This is more than the remaining {remainingVolume.toLocaleString()} L on the truck. Continue only if deliveries were recorded before this incident.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{selectedLossType?.expenseLabel ?? "Incident expenses (₦)"}</Label>
                <FormattedNumberInput min="0" value={expensesIncurred} onChange={(e) => setExpensesIncurred(e.target.value)} placeholder="0" prefixText="₦" />
                <p className="text-[11px] text-muted-foreground">
                  {selectedLossType?.expenseHint ?? "Costs tied to this product loss, not vehicle repairs."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Notes{selectedLossType?.notesRequired ? "*" : ""}
              </Label>
              <Textarea
                value={lossComment}
                onChange={(e) => setLossComment(e.target.value)}
                placeholder={selectedLossType?.notesPlaceholder ?? "Explain what happened..."}
              />
            </div>

            {incidentQuantity > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Impact on this trip</p>
                <p>Product deducted: {incidentQuantity.toLocaleString()} L</p>
                <p>Transporter volume deduction: ₦{volumeDeduction.toLocaleString()}</p>
                {incidentExpenses > 0 && (
                  <p>Incident expenses deducted: ₦{incidentExpenses.toLocaleString()}</p>
                )}
              </div>
            )}

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-destructive/5 border-destructive/20">
              <Checkbox id="terminateTrip" checked={terminateTrip} onCheckedChange={(c) => setTerminateTrip(!!c)} />
              <div className="space-y-1 leading-none">
                <Label htmlFor="terminateTrip" className="font-semibold text-destructive">Terminate trip (total loss)</Label>
                <p className="text-xs text-muted-foreground">
                  {selectedLossType?.terminateHint ?? "Check this if the transport cannot proceed. The status will be marked as LOSS."}
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

      <Dialog open={openLinkOrderDialog} onOpenChange={setOpenLinkOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link to Order</DialogTitle>
            <DialogDescription>
              Associate this transport with a procurement order for volume tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Procurement Order</Label>
              <Popover open={openOrderSelect} onOpenChange={setOpenOrderSelect}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {selectedOrderId
                        ? (() => {
                            const o = orders.find((x: any) => x.id === selectedOrderId);
                            return o ? `${o.sourceDepot || "Depot"} - ${o.reference || "Unnamed"}` : "Select order...";
                          })()
                        : "Select order..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search order..." />
                    <CommandList>
                      <CommandEmpty>No order found.</CommandEmpty>
                      <CommandGroup>
                        {orders.map((o: any) => (
                          <CommandItem
                            key={o.id}
                            value={`${o.reference || o.id} ${o.sourceDepot || ""}`}
                            onSelect={() => {
                              setSelectedOrderId(o.id);
                              setOpenOrderSelect(false);
                            }}
                          >
                            {o.sourceDepot || "Depot"} - {o.reference || "Unnamed"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLinkOrderDialog(false)}>Cancel</Button>
            <Button onClick={handleLinkOrder} disabled={isSubmitting || !selectedOrderId}>
              {isSubmitting ? <SpinnerEllipsis /> : "Link Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

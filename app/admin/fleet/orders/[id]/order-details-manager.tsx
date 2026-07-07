"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatHumanReadableDate } from "@/lib/utils";
import { apiPatch } from "@/lib/client/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  Edit,
  PlayCircle,
  Archive,
  Calculator,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

const EditOrderSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersOrdered: z.coerce.number().positive(),
  supplier: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable(),
  pricePerLitre: z.coerce.number().min(0),
  loadingCost: z.coerce.number().min(0),
});

type LookupItem = { id: string; name: string };

export function OrderDetailsManager({
  order,
  lookups,
}: {
  order: any;
  lookups: { suppliers: LookupItem[]; depots: LookupItem[] };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Popovers inside Edit Modal
  const [openProductSelect, setOpenProductSelect] = useState(false);
  const [openSupplierSelect, setOpenSupplierSelect] = useState(false);
  const [openDepotSelect, setOpenDepotSelect] = useState(false);

  const transports = order.transports || [];
  const validTransports = transports.filter((t: any) => t.status !== "CANCELLED");
  const totalTransportCost = validTransports.reduce((sum: number, t: any) => sum + (Number(t.ratePerLiter || 0) * Number(t.litersCarried || 0)), 0);
  const totalTransportedLiters = validTransports.reduce((sum: number, t: any) => sum + Number(t.litersCarried || 0), 0);
  const averageTransportCostPerLiter = totalTransportedLiters > 0 ? totalTransportCost / totalTransportedLiters : 0;

  // Edit Form
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm({
    resolver: zodResolver(EditOrderSchema),
    defaultValues: {
      productType: order.productType as any,
      litersOrdered: Number(order.litersOrdered),
      supplier: order.supplier,
      sourceDepot: order.sourceDepot,
      pricePerLitre: Number(order.pricePerLitre),
      loadingCost: Number(order.loadingCost) || 0,
    },
  });

  const watchProductType = watch("productType");
  const watchLitersOrdered = watch("litersOrdered") || 0;
  const watchPricePerLitre = watch("pricePerLitre") || 0;
  const watchLoadingCost = watch("loadingCost") || 0;
  const watchSupplier = watch("supplier");
  const watchDepot = watch("sourceDepot");

  const productTotal = Number(watchPricePerLitre || 0) * Number(watchLitersOrdered || 0);
  const loadingTotal = Number(watchLoadingCost) || 0;
  const grandTotal = productTotal + loadingTotal;

  const onUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    const res = await apiPatch(`/api/tenant/fleet/orders/${order.id}`, { status: newStatus });
    setIsUpdatingStatus(false);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(`Order marked as ${newStatus}`);
      router.refresh();
    }
  };

  const onSaveEdit = handleSubmit(async (values) => {
    const res = await apiPatch(`/api/tenant/fleet/orders/${order.id}`, {
      ...values,
      status: "CHANGED", // Automatically mark as changed if edited
    });
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Order updated successfully");
      setIsEditModalOpen(false);
      router.refresh();
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case "COMPLETED": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "CONFIRMED": return "text-blue-600 bg-blue-50 border-blue-200";
      case "LOADED": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "CANCELLED": return "text-red-600 bg-red-50 border-red-200";
      case "CHANGED": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-stone-600 bg-stone-50 border-stone-200";
    }
  };

  const currentGrandTotal = (Number(order.pricePerLitre) * Number(order.litersOrdered)) + Number(order.loadingCost) + totalTransportCost;

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/fleet/orders">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                Order Details
                <Badge variant="outline" className={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </CardTitle>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {order.status === "PENDING" || order.status === "CHANGED" ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isUpdatingStatus} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                      <CheckCircle2 className="h-4 w-4" /> Confirm Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to confirm this order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the order as confirmed and ready for logistics planning.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Go Back</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onUpdateStatus("CONFIRMED")}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isUpdatingStatus} className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
                      <XCircle className="h-4 w-4" /> Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the order. This action cannot be undone unless you create a new order.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onUpdateStatus("CANCELLED")}>Cancel Order</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button onClick={() => { reset(); setIsEditModalOpen(true); }} disabled={isUpdatingStatus} className="gap-2">
                  <Edit className="h-4 w-4" /> Edit Order
                </Button>
              </>
            ) : order.status === "CONFIRMED" ? (
              <>
                <Button variant="outline" onClick={() => onUpdateStatus("LOADED")} disabled={isUpdatingStatus} className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <PlayCircle className="h-4 w-4" /> Mark Loaded
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isUpdatingStatus} className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
                      <XCircle className="h-4 w-4" /> Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the confirmed order and stop all logistical operations related to it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onUpdateStatus("CANCELLED")}>Cancel Order</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : order.status === "LOADED" ? (
              <Button onClick={() => onUpdateStatus("COMPLETED")} disabled={isUpdatingStatus} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Archive className="h-4 w-4" /> Mark Completed
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
      </Card>

      {/* ---------------- ORDER SPECS GRID ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Procurement Info
              </span>
              <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded">
                {order.reference || "NO REF"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product & Volume</p>
                <p className="font-semibold text-foreground text-sm">{order.productType} — {Number(order.litersOrdered).toLocaleString()} Liters</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Building2 size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Supplier</p>
                <p className="font-medium text-foreground text-sm">{order.supplier || "Not specified"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source Depot</p>
                <p className="font-medium text-foreground text-sm">{order.sourceDepot || "Not specified"}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 pt-2">
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Calculator size={14} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Financials</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-mono font-medium">₦{Number(order.pricePerLitre).toLocaleString()}/L</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Product:</span>
                    <span className="font-mono font-medium">₦{(Number(order.pricePerLitre) * Number(order.litersOrdered)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Loading:</span>
                    <span className="font-mono font-medium">₦{Number(order.loadingCost).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Logistics:</span>
                    <span className="font-mono font-medium">
                      ₦{totalTransportCost.toLocaleString()}
                      {totalTransportedLiters > 0 && <span className="text-[10px] opacity-70 ml-1">(@ ₦{averageTransportCostPerLiter.toFixed(2)}/L avg)</span>}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-between pt-1">
                    <span className="font-bold text-foreground">Total Value:</span>
                    <span className="font-mono font-bold text-primary text-sm">₦{currentGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transports Summary */}
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              Logistics Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-6">
            <Truck size={48} className="text-stone-300 dark:text-stone-700 mb-4" />
            <p className="text-2xl font-bold text-foreground">{transports.length}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dispatched Transports</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-4 px-1.5 py-2 justify-start md:w-auto gap-1">
            <TabsTrigger value="overview" className="px-6 py-4 text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="transports" className="px-6 py-4 text-[15px] font-semibold">Associated Transports ({transports.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Truck size={40} className="mb-4 text-stone-300 dark:text-stone-700" />
            <p className="text-sm">Select 'Associated Transports' to view the physical trips fulfilling this order.</p>
          </Card>
        </TabsContent>

        {/* ---------------- TRANSPORTS TAB ---------------- */}
        <TabsContent value="transports" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Truck / Driver</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Cost</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {transports.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No transports logged for this order.</td></tr>
                  ) : (
                    transports.map((t: any) => (
                      <tr key={t.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(t.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{t.destination}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {t.truck?.name || "—"} <br/>
                          {t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">{Number(t.litersCarried).toLocaleString()} L</td>
                        <td className="px-6 py-4 text-right font-mono font-medium">
                          ₦{(Number(t.ratePerLiter || 0) * Number(t.litersCarried || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            t.status === "COMPLETED" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                            t.status === "IN_TRANSIT" ? "text-blue-600 bg-blue-50 border-blue-200" : ""
                          }>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------------- EDIT MODAL ---------------- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          <form onSubmit={onSaveEdit} className="flex flex-col max-h-[85vh]">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Edit Order Details</DialogTitle>
              <DialogDescription>Make changes to the procurement specs. The status will automatically be set to CHANGED.</DialogDescription>
            </DialogHeader>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productType">Product Type*</Label>
                  <Popover open={openProductSelect} onOpenChange={setOpenProductSelect}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between font-normal">
                        <span>{watchProductType}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {["PMS", "AGO", "DPK", "LPG"].map((p) => (
                              <CommandItem key={p} value={p.toLowerCase()} onSelect={() => { setValue("productType", p as any); setOpenProductSelect(false); }}>
                                {p} {watchProductType === p && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" {...register("productType")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="litersOrdered">Volume Ordered (Liters)*</Label>
                  <Input id="litersOrdered" type="number" {...register("litersOrdered")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Popover open={openSupplierSelect} onOpenChange={setOpenSupplierSelect}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={`w-full justify-between font-normal ${!watchSupplier ? "text-muted-foreground" : ""}`}>
                        <span className="truncate">{watchSupplier || "Select Supplier..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandList>
                          <CommandEmpty>No supplier found.</CommandEmpty>
                          <CommandGroup>
                            {lookups.suppliers.map((opt) => (
                              <CommandItem key={opt.id} value={opt.name} onSelect={(val) => {
                                const actualName = lookups.suppliers.find((o) => o.name.toLowerCase() === val.toLowerCase())?.name || val;
                                setValue("supplier", actualName); setOpenSupplierSelect(false);
                              }}>
                                {opt.name} {watchSupplier === opt.name && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceDepot">Source Depot</Label>
                  <Popover open={openDepotSelect} onOpenChange={setOpenDepotSelect}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={`w-full justify-between font-normal ${!watchDepot ? "text-muted-foreground" : ""}`}>
                        <span className="truncate">{watchDepot || "Select Depot..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search depot..." />
                        <CommandList>
                          <CommandEmpty>No depot found.</CommandEmpty>
                          <CommandGroup>
                            {lookups.depots.map((opt) => (
                              <CommandItem key={opt.id} value={opt.name} onSelect={(val) => {
                                const actualName = lookups.depots.find((o) => o.name.toLowerCase() === val.toLowerCase())?.name || val;
                                setValue("sourceDepot", actualName); setOpenDepotSelect(false);
                              }}>
                                {opt.name} {watchDepot === opt.name && <Check className="ml-auto h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerLitre">Product Cost Per Litre (₦)</Label>
                  <Input id="pricePerLitre" type="number" {...register("pricePerLitre")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loadingCost">Flat Loading Fee (₦)</Label>
                  <Input id="loadingCost" type="number" {...register("loadingCost")} />
                </div>
              </div>

              {/* Live Calc summary inline */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mt-4 space-y-2 text-sm">
                <div className="flex justify-between font-medium"><span>Product Total:</span><span className="font-mono">₦{productTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Fixed Loading:</span><span className="font-mono">₦{loadingTotal.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-2 font-bold text-blue-900 dark:text-blue-200">
                  <span>New Total Value:</span><span className="font-mono">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? <SpinnerEllipsis /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

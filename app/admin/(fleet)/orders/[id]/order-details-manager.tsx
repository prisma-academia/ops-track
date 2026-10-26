"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPatch } from "@/lib/client/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  Edit,
  PlayCircle,
  Archive,
  Calculator,
  ChevronsUpDown,
  Check,
  Droplet,
  Phone,
  MoreVertical,
  User2
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
import type { OrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { OrderFinancialSummary } from "./order-financial-summary";
import { OrderDispatchedTransportsTable } from "./order-dispatched-transports-table";
// import { litersDeliveredFromSales } from "@/lib/fleet/transport-report";
// import { OrderVolumeFulfillment } from "./order-volume-fulfillment";

const EditOrderSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersOrdered: z.coerce.number().positive(),
  supplier: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable(),
  pricePerLitre: z.coerce.number().positive("Price per litre is required"),
  loadingCostPerLitre: z.coerce.number().min(0),
});

type LookupItem = { id: string; name: string };
type DepotLookup = LookupItem & { latitude: number | null; longitude: number | null };

const OrderTransportsMap = dynamic(() => import("./order-transports-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full flex items-center justify-center bg-stone-100 rounded-xl border">
      <SpinnerEllipsis />
    </div>
  ),
});

export function OrderDetailsManager({
  order,
  lookups,
  pnlSummary,
  originToDepotFee = 0,
}: {
  order: any;
  lookups: { suppliers: LookupItem[]; depots: DepotLookup[] };
  pnlSummary?: OrderPnlSummary | null;
  originToDepotFee?: number;
}) {
  const router = useRouter();
  
  // Modals & Tabs
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
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

  // const litersSoldFromTransports = useMemo(() => {
  //   const ordered = Number(order.litersOrdered) || 0;
  //   const active = transports.filter((t: { status?: string }) => t.status !== "CANCELLED");
  //   const sold = active.reduce((sum: number, t: any) => {
  //     const fromDeliveries = litersDeliveredFromSales(t.deliveries ?? []);
  //     if (fromDeliveries > 0) return sum + fromDeliveries;
  //     return sum + Number(t.litersDelivered || 0);
  //   }, 0);
  //   return Math.min(ordered, sold);
  // }, [order.litersOrdered, transports]);

  // Procurement cost breakdown (product + loading only, excludes logistics)
  const totalProductCost = Number(order.pricePerLitre) * Number(order.litersOrdered);
  const totalLoadingCost = Number(order.loadingCostPerLitre) * Number(order.litersOrdered);
  const totalProcurementCost = totalProductCost + totalLoadingCost;
  // Edit Form
  const { register, handleSubmit, formState, setValue, watch, reset, control } = useForm({
    resolver: zodResolver(EditOrderSchema),
    defaultValues: {
      productType: order.productType as any,
      litersOrdered: Number(order.litersOrdered),
      supplier: order.supplier,
      sourceDepot: order.sourceDepot,
      pricePerLitre: Number(order.pricePerLitre),
      loadingCostPerLitre: Number(order.loadingCostPerLitre) || 0,
    },
  });

  const watchProductType = watch("productType");
  const watchLitersOrdered = watch("litersOrdered") || 0;
  const watchPricePerLitre = watch("pricePerLitre") || 0;
  const watchLoadingCost = watch("loadingCostPerLitre") || 0;
  const watchSupplier = watch("supplier");
  const watchDepot = watch("sourceDepot");

  const productTotal = Number(watchPricePerLitre || 0) * Number(watchLitersOrdered || 0);
  const loadingTotal = (Number(watchLoadingCost) || 0) * Number(watchLitersOrdered || 0);
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
      case "DELIVERED": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "ASSIGNED":
      case "IN_TRANSIT": return "text-purple-600 bg-purple-50 border-purple-200";
      case "CANCELLED":
      case "REJECTED": return "text-red-600 bg-red-50 border-red-200";
      case "DRAFT": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-stone-600 bg-stone-50 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/orders">
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
            {order.status === "PENDING" || order.status === "DRAFT" ? (
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
                <Button variant="outline" onClick={() => onUpdateStatus("ASSIGNED")} disabled={isUpdatingStatus} className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <PlayCircle className="h-4 w-4" /> Mark Assigned
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
            ) : order.status === "ASSIGNED" ? (
              <Button onClick={() => onUpdateStatus("COMPLETED")} disabled={isUpdatingStatus} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Archive className="h-4 w-4" /> Mark Completed
              </Button>
            ) : null}
            
            {/* <Button variant="outline" asChild className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 ml-2">
              <Link href={`/admin/fleet-pnl-report/${order.id}`}>
                <Calculator className="h-4 w-4" /> View P&L
              </Link>
            </Button> */}
          </CardAction>
        </CardHeader>
      </Card>

      {/* ---------------- ORDER SPECS GRID ---------------- */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
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
          <CardContent className="flex-1 text-sm space-y-4 ">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="space-y-4">
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
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source Depot</p>
                    <p className="font-medium text-foreground text-sm">{order.sourceDepot || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Truck size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dispatched Transports</p>
                    <p className="font-medium text-foreground text-sm">{transports.length} {transports.length === 1 ? 'Trip' : 'Trips'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 sm:min-w-[140px]">
                <div className="flex items-start gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dispensed</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-500 text-sm">{totalTransportedLiters.toLocaleString()} L</p>
                  </div>
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-500 shrink-0 order-first sm:order-last">
                    <Truck size={14} />
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remaining</p>
                    <p className="font-semibold text-amber-600 dark:text-amber-500 text-sm">{Math.max(0, Number(order.litersOrdered) - totalTransportedLiters).toLocaleString()} L</p>
                  </div>
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0 order-first sm:order-last">
                    <Archive size={14} />
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price per Litre</p>
                    <p className="font-semibold text-foreground text-sm">₦{Number(order.pricePerLitre).toLocaleString()}/L</p>
                  </div>
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-500 shrink-0 order-first sm:order-last">
                    <Calculator size={14} />
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Loading Cost per Litre</p>
                    <p className="font-semibold text-foreground text-sm">₦{Number(order.loadingCostPerLitre).toLocaleString()}/L</p>
                  </div>
                  <div className="size-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-500 shrink-0 order-first sm:order-last">
                    <Droplet size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-center sm:text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Product
                </p>
                <p className="font-mono font-semibold text-foreground mt-1">
                  ₦{totalProductCost.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-center sm:text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Loading
                </p>
                <p className="font-mono font-semibold text-foreground mt-1">
                  ₦{totalLoadingCost.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 text-center sm:text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total
                </p>
                <p className="font-mono font-bold text-primary mt-1">
                  ₦{totalProcurementCost.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volume — sales card (temporarily hidden)
        <OrderVolumeFulfillment
          litersOrdered={Number(order.litersOrdered)}
          litersSold={litersSoldFromTransports}
          pnlSummary={pnlSummary}
        />
        */}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Dispatched Transports
            </h3>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={`/admin/transports/new?orderId=${order.id}`}>
                <Truck className="h-4 w-4" />
                Assign Trucks
              </Link>
            </Button>
          </div>

          <OrderDispatchedTransportsTable
            transports={transports}
            sourceDepot={order.sourceDepot}
            originToDepotFee={originToDepotFee}
          />
        </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calculator size={16} className="text-primary" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col gap-y-4 w-full">
                  <OrderFinancialSummary summary={pnlSummary} />

                  <Button size={"icon-lg"}
                    asChild
                    className="w-full justify-center mt-2 gap-2"
                  >
                  <Link href={`/admin/fleet-pnl-report/${order.id}`}>
                    <Calculator className="h-4 w-4" /> Profit &amp; Loss
                  </Link>
                  </Button>
             
                </div>
          </CardContent>
        </Card>

        <OrderTransportsMap
          sourceDepot={order.sourceDepot}
          depots={lookups.depots}
          transports={transports}
        />
        </div>
      </div>

      {/* ---------------- EDIT MODAL ---------------- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          <form onSubmit={onSaveEdit} className="flex flex-col max-h-[85vh]">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Edit Order Details</DialogTitle>
              <DialogDescription>Make changes to the procurement specs. The status will automatically be set to DRAFT.</DialogDescription>
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
                              <CommandItem key={p} value={p.toLowerCase()} onSelect={() => { 
                                if (watchProductType !== p) {
                                  setValue("pricePerLitre", "" as any);
                                }
                                setValue("productType", p as any); 
                                setOpenProductSelect(false); 
                              }}>
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
                  <Controller
                    control={control}
                    name="litersOrdered"
                    render={({ field }) => (
                      <FormattedNumberInput 
                        id="litersOrdered" 
                        {...field}
                        value={(field.value as string | number) ?? ""} 
                        prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />} 
                      />
                    )}
                  />
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
                  <Label htmlFor="pricePerLitre">Product Cost Per Litre (₦)*</Label>
                  <Controller
                    control={control}
                    name="pricePerLitre"
                    render={({ field }) => (
                      <FormattedNumberInput 
                        id="pricePerLitre" 
                        {...field} 
                        value={(field.value as string | number) ?? ""} 
                        prefixText="₦" 
                        maxLength={5}
                      />
                    )}
                  />
                  {formState.errors.pricePerLitre && (
                    <p className="text-xs text-red-500">{formState.errors.pricePerLitre.message as string}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loadingCostPerLitre">Loading Fee Per Litre (₦)</Label>
                  <Controller
                    control={control}
                    name="loadingCostPerLitre"
                    render={({ field }) => (
                      <FormattedNumberInput 
                        id="loadingCostPerLitre" 
                        {...field} 
                        value={(field.value as string | number) ?? ""} 
                        prefixText="₦" 
                        maxLength={4}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Live Calc summary inline */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mt-4 space-y-2 text-sm">
                <div className="flex justify-between font-medium"><span>Product Total:</span><span className="font-mono">₦{productTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Total Loading Fee:</span><span className="font-mono">₦{loadingTotal.toLocaleString()}</span></div>
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

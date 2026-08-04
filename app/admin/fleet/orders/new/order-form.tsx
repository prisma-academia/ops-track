"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown, Check, Plus, Calculator, FileText, Droplet } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Schema = z.object({
  reference: z.string().max(50).optional().or(z.literal("")),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersOrdered: z.coerce.number().positive("Liters ordered must be greater than 0"),
  supplier: z.string().optional().nullable(),
  sourceDepot: z.string().optional().nullable(),
  pricePerLitre: z.coerce.number().min(0).default(0),
  loadingCost: z.coerce.number().min(0).default(0),
});

type Values = z.infer<typeof Schema>;
type LookupItem = { id: string; name: string };

const PRODUCT_TYPES = ["PMS", "AGO", "DPK", "LPG"];

export function CreateOrderForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  // Lookups State
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [depots, setDepots] = useState<LookupItem[]>([]);
  
  // Popover States
  const [openSupplierSelect, setOpenSupplierSelect] = useState(false);
  const [openDepotSelect, setOpenDepotSelect] = useState(false);

  // Modal State
  const [lookupDialog, setLookupDialog] = useState<{ type: "supplier" | "depot"; title: string } | null>(null);
  const [newLookupName, setNewLookupName] = useState("");
  const [isAddingLookup, setIsAddingLookup] = useState(false);

  const { register, handleSubmit, formState, setValue, watch, control } = useForm<Values>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      reference: "",
      productType: "" as any,
      litersOrdered: 0,
      supplier: null as string | null,
      sourceDepot: null as string | null,
      pricePerLitre: 0,
      loadingCost: 0,
    },
  });

  const watchProductType = watch("productType");
  const watchLitersOrdered = watch("litersOrdered") || 0;
  const watchPricePerLitre = watch("pricePerLitre") || 0;
  const watchLoadingCost = watch("loadingCost") || 0;
  const watchSupplier = watch("supplier");
  const watchDepot = watch("sourceDepot");
  const watchReference = watch("reference");

  // Fetch Lookups
  useEffect(() => {
    async function fetchLookups() {
      try {
        const res = await fetch("/api/tenant/waybills/lookups");
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
          setDepots(data.depots || []);
        }
      } catch (e) {
        console.error("Failed to fetch lookups", e);
      }
    }
    fetchLookups();
  }, []);

  // Auto-generate Reference
  useEffect(() => {
    if (watchProductType) {
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const randomNum = Math.floor(Math.random() * 900) + 100;
      setValue("reference", `ORD-${today}-${watchProductType}-${randomNum}`, { shouldValidate: true });
    }
  }, [watchProductType, setValue]);

  const handleAddLookup = async () => {
    if (!lookupDialog || !newLookupName.trim()) return;
    setIsAddingLookup(true);
    try {
      const res = await fetch("/api/tenant/waybills/lookups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: lookupDialog.type, name: newLookupName.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        const created = result.data;
        if (lookupDialog.type === "supplier") {
          setSuppliers([...suppliers, created]);
          setValue("supplier", created.name, { shouldValidate: true });
        } else if (lookupDialog.type === "depot") {
          setDepots([...depots, created]);
          setValue("sourceDepot", created.name, { shouldValidate: true });
        }
        setLookupDialog(null);
        setNewLookupName("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingLookup(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ order: { id: string } }>("/api/tenant/fleet/orders", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.order.id) {
      router.push(`/admin/fleet/orders`);
      router.refresh();
    }
  });

  const renderLookupSelect = (
    fieldValue: string | null | undefined,
    onValueChange: (val: string) => void,
    options: LookupItem[],
    placeholder: string,
    type: "supplier" | "depot",
    label: string,
    openState: boolean,
    setOpenState: (o: boolean) => void,
  ) => (
    <Popover open={openState} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between font-normal ${!fieldValue ? "text-muted-foreground" : ""}`}
        >
          <span className="truncate">{fieldValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="py-2 px-2">
              <p className="text-sm text-muted-foreground text-center">No {label.toLowerCase()} found.</p>
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={(val) => {
                    const actualName = options.find((o) => o.name.toLowerCase() === val.toLowerCase())?.name || val;
                    onValueChange(actualName);
                    setOpenState(false);
                  }}
                  className="flex items-center justify-between"
                >
                  {opt.name}
                  {fieldValue === opt.name && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2 text-sm font-medium"
              onClick={() => {
                setLookupDialog({ type, title: `Add New ${label}` });
                setOpenState(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New {label}
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );

  const productTotal = Number(watchPricePerLitre || 0) * Number(watchLitersOrdered || 0);
  const loadingTotal = Number(watchLoadingCost || 0);
  const grandTotal = productTotal + loadingTotal;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => router.push("/admin/fleet/orders")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-xl">Create Order</CardTitle>
              </div>
            </div>
            {watchReference && (
              <div className="bg-muted px-4 py-1.5 rounded-full border border-border/50">
                <span className="text-xs font-medium text-muted-foreground mr-2">REF:</span>
                <span className="text-sm font-bold font-mono tracking-wider">{watchReference}</span>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText size={16} />
                  Order Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Product & Volume */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productType" className={formState.errors.productType ? "text-destructive" : ""}>Product Type*</Label>
                    <Controller
                      control={control}
                      name="productType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger 
                            id="productType" 
                            className={`w-full ${formState.errors.productType ? "border-destructive" : ""}`}
                          >
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                            <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                            <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
                            <SelectItem value="LPG">LPG (Gas)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {formState.errors.productType && <p className="text-xs text-destructive">{formState.errors.productType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="litersOrdered" className={formState.errors.litersOrdered ? "text-destructive" : ""}>Volume Ordered (Liters)*</Label>
                    <Controller
                      control={control}
                      name="litersOrdered"
                      render={({ field }) => (
                        <FormattedNumberInput 
                          id="litersOrdered" 
                          placeholder="e.g. 45000" 
                          {...field}
                          value={field.value ?? ""}
                          className={formState.errors.litersOrdered ? "border-destructive" : ""}
                          prefixIcon={<Droplet className="w-4 h-4 text-muted-foreground" />}
                        />
                      )}
                    />
                    {formState.errors.litersOrdered && <p className="text-xs text-destructive">{formState.errors.litersOrdered.message}</p>}
                  </div>
                </div>

                {/* Logistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    {renderLookupSelect(
                      watchSupplier,
                      (val) => setValue("supplier", val, { shouldValidate: true }),
                      suppliers,
                      "Select Supplier...",
                      "supplier",
                      "Supplier",
                      openSupplierSelect,
                      setOpenSupplierSelect
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceDepot">Source Depot</Label>
                    {renderLookupSelect(
                      watchDepot,
                      (val) => setValue("sourceDepot", val, { shouldValidate: true }),
                      depots,
                      "Select Depot...",
                      "depot",
                      "Depot",
                      openDepotSelect,
                      setOpenDepotSelect
                    )}
                  </div>
                </div>

                {/* Costs */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerLitre" className={formState.errors.pricePerLitre ? "text-destructive" : ""}>Price Per Litre (₦)</Label>
                    <Controller
                      control={control}
                      name="pricePerLitre"
                      render={({ field }) => (
                        <FormattedNumberInput 
                          id="pricePerLitre" 
                          placeholder="e.g. 950"
                          {...field}
                          className={formState.errors.pricePerLitre ? "border-destructive" : ""}
                          prefixText="₦"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loadingCost" className={formState.errors.loadingCost ? "text-destructive" : ""}>Flat Loading Fee (₦)</Label>
                    <Controller
                      control={control}
                      name="loadingCost"
                      render={({ field }) => (
                        <FormattedNumberInput 
                          id="loadingCost" 
                          placeholder="e.g. 15000"
                          {...field}
                          className={formState.errors.loadingCost ? "border-destructive" : ""}
                          prefixText="₦"
                        />
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {error ? <p className="text-sm text-red-600 px-2">{error}</p> : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push("/admin/fleet/orders")}
                className="h-10 rounded-full px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formState.isSubmitting}
                className="h-10 rounded-full px-5 gap-2"
              >
                {formState.isSubmitting ? (
                  <>
                    <SpinnerEllipsis />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create Order</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6 pt-6 space-y-4">
              <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} />
                Order Summary Receipt
              </h4>
              
              <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-muted-foreground/20 space-y-5 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span>Product Type:</span>
                  <span className="font-bold text-foreground">{watchProductType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume Ordered:</span>
                  <span className="font-bold text-foreground">{Number(watchLitersOrdered).toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Product Total:</span>
                  <span className="font-bold text-foreground">₦{productTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loading Fee:</span>
                  <span className="font-bold text-foreground">₦{loadingTotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between border-t border-dashed pt-2 mt-2">
                  <span className="uppercase tracking-wider">Total Value:</span>
                  <span className="font-bold text-primary text-sm">
                    ₦{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {lookupDialog && (
        <Dialog open={!!lookupDialog} onOpenChange={(open) => !open && setLookupDialog(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{lookupDialog.title}</DialogTitle>
              <DialogDescription>
                Add a new {lookupDialog.type} to the system. This will be available for future orders.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lookupName">Name</Label>
                <Input
                  id="lookupName"
                  value={newLookupName}
                  onChange={(e) => setNewLookupName(e.target.value)}
                  placeholder={`Enter ${lookupDialog.type} name`}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLookupDialog(null)}>Cancel</Button>
              <Button type="button" onClick={handleAddLookup} disabled={isAddingLookup || !newLookupName.trim()}>
                {isAddingLookup ? <SpinnerEllipsis /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

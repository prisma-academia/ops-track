"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ChevronsUpDown } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const Schema = z.object({
  reference: z.string().max(50).optional().or(z.literal("")),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"], { required_error: "Product type is required" }),
  litersOrdered: z.coerce.number().positive("Liters ordered must be greater than 0"),
  sourceDepot: z.string().optional().or(z.literal("")),
  orderCost: z.coerce.number().min(0).default(0),
  loadingCost: z.coerce.number().min(0).default(0),
  transportCost: z.coerce.number().min(0).default(0),
});

type Values = z.infer<typeof Schema>;

const PRODUCT_TYPES = ["PMS", "AGO", "DPK", "LPG"];

export function CreateOrderForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openProductSelect, setOpenProductSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      reference: "",
      productType: "PMS" as any,
      litersOrdered: 45000,
      sourceDepot: "",
      orderCost: 0,
      loadingCost: 0,
      transportCost: 0,
    },
  });

  const selectedProduct = watch("productType");

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

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.push("/admin/fleet/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Create Order
            </h2>
            <p className="text-xs text-muted-foreground">Log a new procurement order</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference" className={formState.errors.reference ? "text-destructive" : ""}>Reference Number (Optional)</Label>
                <Input 
                  id="reference" 
                  placeholder="e.g. ORD-2023-001" 
                  {...register("reference")}
                  className={formState.errors.reference ? "border-destructive" : ""}
                />
                {formState.errors.reference && <p className="text-xs text-destructive">{formState.errors.reference.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceDepot" className={formState.errors.sourceDepot ? "text-destructive" : ""}>Source Depot</Label>
                <Input 
                  id="sourceDepot" 
                  placeholder="e.g. Apapa Depot" 
                  {...register("sourceDepot")}
                  className={formState.errors.sourceDepot ? "border-destructive" : ""}
                />
                {formState.errors.sourceDepot && <p className="text-xs text-destructive">{formState.errors.sourceDepot.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productType" className={formState.errors.productType ? "text-destructive" : ""}>Product Type*</Label>
                <Popover open={openProductSelect} onOpenChange={setOpenProductSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="productType"
                      className={`w-full justify-between font-normal ${formState.errors.productType ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedProduct || "Select product..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {PRODUCT_TYPES.map((p) => (
                            <CommandItem
                              key={p}
                              value={p.toLowerCase()}
                              onSelect={() => {
                                setValue("productType", p as any, { shouldValidate: true });
                                setOpenProductSelect(false);
                              }}
                              data-checked={selectedProduct === p}
                            >
                              {p}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("productType")} />
                {formState.errors.productType && <p className="text-xs text-destructive">{formState.errors.productType.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="litersOrdered" className={formState.errors.litersOrdered ? "text-destructive" : ""}>Volume Ordered (Liters)*</Label>
                <Input 
                  id="litersOrdered" 
                  type="number"
                  placeholder="e.g. 45000" 
                  {...register("litersOrdered")}
                  className={formState.errors.litersOrdered ? "border-destructive" : ""}
                />
                {formState.errors.litersOrdered && <p className="text-xs text-destructive">{formState.errors.litersOrdered.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-2 border-t mt-4">
              <div className="space-y-2">
                <Label htmlFor="orderCost" className={formState.errors.orderCost ? "text-destructive" : ""}>Product Cost (₦)</Label>
                <Input 
                  id="orderCost" 
                  type="number"
                  {...register("orderCost")}
                  className={formState.errors.orderCost ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loadingCost" className={formState.errors.loadingCost ? "text-destructive" : ""}>Loading Cost (₦)</Label>
                <Input 
                  id="loadingCost" 
                  type="number"
                  {...register("loadingCost")}
                  className={formState.errors.loadingCost ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportCost" className={formState.errors.transportCost ? "text-destructive" : ""}>Transport Cost (₦)</Label>
                <Input 
                  id="transportCost" 
                  type="number"
                  {...register("transportCost")}
                  className={formState.errors.transportCost ? "border-destructive" : ""}
                />
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 max-w-3xl">
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
    </form>
  );
}

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
  customerId: z.string().min(1, "Please select a customer"),
  transportId: z.string().optional().or(z.literal("")),
  litersDespatched: z.coerce.number().positive("Liters despatched must be > 0"),
  litersReceived: z.coerce.number().optional(),
  amountPerLiter: z.coerce.number().positive("Amount per liter must be > 0"),
});

type Values = z.infer<typeof Schema>;

export function CreateSaleForm({
  customers,
  transports,
}: {
  customers: { id: string; name: string }[];
  transports: { id: string; destination: string; truck: { name: string }; transporter: { name: string } }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const [openCustomerSelect, setOpenCustomerSelect] = useState(false);
  const [openTransportSelect, setOpenTransportSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      customerId: "",
      transportId: "",
      litersDespatched: 0,
      litersReceived: undefined as unknown as number,
      amountPerLiter: 0,
    },
  });

  const selectedCustomerId = watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  
  const selectedTransportId = watch("transportId");
  const selectedTransport = transports.find((t) => t.id === selectedTransportId);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    // Convert empty string/undefined back to what backend expects if needed, 
    // zod handles coerce for numbers, but we want to ensure litersReceived is either number or null/undefined
    const payload = {
      ...values,
      litersReceived: isNaN(values.litersReceived) ? undefined : values.litersReceived,
    };
    
    const res = await apiPost<{ sale: { id: string } }>("/api/tenant/fleet/sales", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.sale.id) {
      router.push(`/admin/fleet/sales`);
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
            onClick={() => router.push("/admin/fleet/sales")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Log Sale
            </h2>
            <p className="text-xs text-muted-foreground">Create a new B2B fuel delivery/sale record</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Sale Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId" className={formState.errors.customerId ? "text-destructive" : ""}>Customer / Client*</Label>
                <Popover open={openCustomerSelect} onOpenChange={setOpenCustomerSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="customerId"
                      className={`w-full justify-between font-normal ${formState.errors.customerId ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedCustomer ? selectedCustomer.name : "Select customer..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name.toLowerCase()}
                              onSelect={() => {
                                setValue("customerId", c.id, { shouldValidate: true });
                                setOpenCustomerSelect(false);
                              }}
                              data-checked={selectedCustomerId === c.id}
                            >
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("customerId")} />
                {formState.errors.customerId && <p className="text-xs text-destructive">{formState.errors.customerId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportId" className={formState.errors.transportId ? "text-destructive" : ""}>Link to Transport Trip (Optional)</Label>
                <Popover open={openTransportSelect} onOpenChange={setOpenTransportSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="transportId"
                      className={`w-full justify-between font-normal ${formState.errors.transportId ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">
                        {selectedTransport ? `${selectedTransport.truck.name} - ${selectedTransport.destination}` : "Select transport..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search transport..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No transport found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setValue("transportId", "", { shouldValidate: true });
                              setOpenTransportSelect(false);
                            }}
                          >
                            None
                          </CommandItem>
                          {transports.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={`${t.truck.name} ${t.destination}`.toLowerCase()}
                              onSelect={() => {
                                setValue("transportId", t.id, { shouldValidate: true });
                                setOpenTransportSelect(false);
                              }}
                              data-checked={selectedTransportId === t.id}
                            >
                              {`${t.truck.name} - ${t.destination}`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("transportId")} />
                {formState.errors.transportId && <p className="text-xs text-destructive">{formState.errors.transportId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="litersDespatched" className={formState.errors.litersDespatched ? "text-destructive" : ""}>Volume Despatched (L)*</Label>
                <Input 
                  id="litersDespatched" 
                  type="number"
                  placeholder="e.g. 10000" 
                  {...register("litersDespatched")}
                  className={formState.errors.litersDespatched ? "border-destructive" : ""}
                />
                {formState.errors.litersDespatched && <p className="text-xs text-destructive">{formState.errors.litersDespatched.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="litersReceived" className={formState.errors.litersReceived ? "text-destructive" : ""}>Volume Received (L) (Optional)</Label>
                <Input 
                  id="litersReceived" 
                  type="number"
                  placeholder="e.g. 10000" 
                  {...register("litersReceived")}
                  className={formState.errors.litersReceived ? "border-destructive" : ""}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank if pending delivery confirmation.</p>
                {formState.errors.litersReceived && <p className="text-xs text-destructive">{formState.errors.litersReceived.message}</p>}
              </div>
            </div>

            <div className="space-y-2 w-1/2 pr-2">
              <Label htmlFor="amountPerLiter" className={formState.errors.amountPerLiter ? "text-destructive" : ""}>Selling Price per Liter (₦)*</Label>
              <Input 
                id="amountPerLiter" 
                type="number"
                placeholder="e.g. 1200" 
                {...register("amountPerLiter")}
                className={formState.errors.amountPerLiter ? "border-destructive" : ""}
              />
              {formState.errors.amountPerLiter && <p className="text-xs text-destructive">{formState.errors.amountPerLiter.message}</p>}
            </div>

          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 max-w-3xl">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/fleet/sales")}
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
              <span>Log Sale</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

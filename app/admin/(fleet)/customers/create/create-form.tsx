"use client";

import { useState, useEffect } from "react";
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
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import nigerianLocations from "@/constant/nigerian-locations.json";

const Schema = z.object({
  name: z.string().min(2, "Company name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
  outstandingBalance: z.coerce.number().default(0),
});

type Values = z.infer<typeof Schema>;

export function CreateCustomerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      state: "",
      lga: "",
      contactPerson: "",
      contactPhone: "",
      contactPosition: "",
    },
  });

  const selectedState = watch("state");
  const selectedLga = watch("lga");

  useEffect(() => {
    setValue("lga", "", { shouldValidate: false });
  }, [selectedState, setValue]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc: any) => loc.state === selectedState)?.lgas || []
    : [];

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    const res = await apiPost<{ customer: { id: string } }>("/api/tenant/customers", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.customer.id) {
      router.push(`/admin/customers`);
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
            onClick={() => router.push("/admin/customers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Create Customer
            </h2>
            <p className="text-xs text-muted-foreground">Add a new corporate customer account</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className={formState.errors.name ? "text-destructive" : ""}>Company Name*</Label>
              <Input 
                id="name" 
                placeholder="e.g. Dangote Logistics Ltd" 
                {...register("name")}
                className={formState.errors.name ? "border-destructive" : ""}
              />
              {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={formState.errors.email ? "text-destructive" : ""}>Email</Label>
                <Input 
                  id="email" 
                  placeholder="e.g. contact@company.com" 
                  {...register("email")}
                  className={formState.errors.email ? "border-destructive" : ""}
                />
                {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. +234 800..." 
                  {...register("phone")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                placeholder="123 Industrial Ave" 
                {...register("address")} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="state"
                      className="w-full justify-between font-normal bg-background"
                    >
                      <span className="truncate">{selectedState || "Select state..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search state..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                          {nigerianLocations.map((loc: any) => (
                            <CommandItem
                              key={loc.state}
                              value={loc.state.toLowerCase()}
                              onSelect={() => {
                                setValue("state", loc.state, { shouldValidate: true });
                                setOpenStateSelect(false);
                              }}
                              data-checked={selectedState === loc.state}
                            >
                              {loc.state}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("state")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lga">LGA</Label>
                <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="lga"
                      disabled={!selectedState}
                      className="w-full justify-between font-normal bg-background"
                    >
                      <span className="truncate">{selectedLga || "Select LGA..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search LGA..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No LGA found.</CommandEmpty>
                        <CommandGroup>
                          {availableLgas.map((lga: any) => (
                            <CommandItem
                              key={lga.name}
                              value={lga.name.toLowerCase()}
                              onSelect={() => {
                                setValue("lga", lga.name, { shouldValidate: true });
                                setOpenLgaSelect(false);
                              }}
                              data-checked={selectedLga === lga.name}
                            >
                              {lga.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("lga")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-1">
          <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Full Name</Label>
                <Input 
                  id="contactPerson" 
                  placeholder="e.g. John Doe" 
                  {...register("contactPerson")} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input 
                  id="contactPhone" 
                  placeholder="e.g. +234 800..." 
                  {...register("contactPhone")} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPosition">Position</Label>
                <Input 
                  id="contactPosition" 
                  placeholder="e.g. Operations Manager" 
                  {...register("contactPosition")} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/customers")}
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
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Create Customer</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

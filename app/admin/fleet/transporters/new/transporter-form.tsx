"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
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
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  registrationNumber: z.string().optional().or(z.literal("")),
  businessType: z.string().min(1, "Business type is required"),
  contactPerson: z.string().min(1, "Contact person name is required"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  contactPosition: z.string().min(1, "Contact position is required"),
  state: z.string().min(1, "State is required"),
  lga: z.string().min(1, "LGA is required"),
  ward: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function CreateTransporterForm({ transporter }: { transporter?: any } = {}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: transporter?.name || "",
      email: transporter?.email || "",
      phone: transporter?.phone || "",
      registrationNumber: transporter?.registrationNumber || "",
      businessType: transporter?.businessType || "",
      contactPerson: transporter?.contactPerson || "",
      contactPhone: transporter?.contactPhone || "",
      contactPosition: transporter?.contactPosition || "",
      state: transporter?.state || "",
      lga: transporter?.lga || "",
      ward: transporter?.ward || "",
      address: transporter?.address || "",
    },
  });


  
  const selectedState = watch("state");
  const selectedLga = watch("lga");
  const watchName = watch("name");
  const watchRegNumber = watch("registrationNumber");

  useEffect(() => {
    if (!transporter) {
      if (watchName && !watchRegNumber) {
        const generated = `RC-${Math.floor(100000 + Math.random() * 900000)}`;
        setValue("registrationNumber", generated, { shouldValidate: true });
      } else if (!watchName && watchRegNumber) {
        setValue("registrationNumber", "", { shouldValidate: true });
      }
    }
  }, [watchName, watchRegNumber, setValue, transporter]);

  const previousState = useRef(selectedState);

  useEffect(() => {
    if (previousState.current !== selectedState) {
      setValue("lga", "", { shouldValidate: false });
      setValue("ward", "", { shouldValidate: false });
      previousState.current = selectedState;
    }
  }, [selectedState, setValue]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc) => loc.state === selectedState)?.lgas || []
    : [];

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    if (transporter?.id) {
      const res = await apiPatch<{ transporter: { id: string } }>(`/api/tenant/fleet/transporters/${transporter.id}`, values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      router.push(`/admin/fleet/transporters/${transporter.id}`);
      router.refresh();
    } else {
      const res = await apiPost<{ transporter: { id: string } }>("/api/tenant/fleet/transporters", values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (res.data?.transporter.id) {
        router.push(`/admin/fleet/transporters`);
        router.refresh();
      }
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
            onClick={() => router.push("/admin/fleet/transporters")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              {transporter ? "Edit Transporter" : "Create Transporter"}
            </h2>
            <p className="text-xs text-muted-foreground">Add a new transport company to the fleet</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Company Details
            </CardTitle>
            {watchRegNumber && (
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                {watchRegNumber}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className={formState.errors.name ? "text-destructive" : ""}>Company Name*</Label>
              <Input 
                id="name" 
                placeholder="e.g. Acme Logistics" 
                {...register("name")}
                className={formState.errors.name ? "border-destructive" : ""}
              />
              {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={formState.errors.email ? "text-destructive" : ""}>Email*</Label>
                <Input 
                  id="email" 
                  placeholder="e.g. contact@acme.com" 
                  {...register("email")}
                  className={formState.errors.email ? "border-destructive" : ""}
                />
                {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className={formState.errors.phone ? "text-destructive" : ""}>Phone*</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. +234 800 000 0000" 
                  {...register("phone")}
                  className={formState.errors.phone ? "border-destructive" : ""}
                />
                {formState.errors.phone && <p className="text-xs text-destructive">{formState.errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className={formState.errors.businessType ? "text-destructive" : ""}>Business Type*</Label>
              <Input 
                id="businessType" 
                placeholder="e.g. LLC" 
                {...register("businessType")} 
                className={formState.errors.businessType ? "border-destructive" : ""}
              />
              {formState.errors.businessType && <p className="text-xs text-destructive">{formState.errors.businessType.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Contact Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols- gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactPerson" className={formState.errors.contactPerson ? "text-destructive" : ""}>Full Name*</Label>
                <Input 
                  id="contactPerson" 
                  placeholder="e.g. John Doe" 
                  {...register("contactPerson")} 
                  className={formState.errors.contactPerson ? "border-destructive" : ""}
                />
                {formState.errors.contactPerson && <p className="text-xs text-destructive">{formState.errors.contactPerson.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactPhone" className={formState.errors.contactPhone ? "text-destructive" : ""}>Phone*</Label>
                <Input 
                  id="contactPhone" 
                  placeholder="e.g. +234 800..." 
                  {...register("contactPhone")} 
                  className={formState.errors.contactPhone ? "border-destructive" : ""}
                />
                {formState.errors.contactPhone && <p className="text-xs text-destructive">{formState.errors.contactPhone.message}</p>}
              </div>
                            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactPosition" className={formState.errors.contactPosition ? "text-destructive" : ""}>Position*</Label>
                <Input 
                  id="contactPosition" 
                  placeholder="e.g. Operations Manager" 
                  {...register("contactPosition")} 
                  className={formState.errors.contactPosition ? "border-destructive" : ""}
                />
                {formState.errors.contactPosition && <p className="text-xs text-destructive">{formState.errors.contactPosition.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state" className={formState.errors.state ? "text-destructive" : ""}>State*</Label>
                <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="state"
                      className={`w-full justify-between font-normal bg-background ${formState.errors.state ? "border-destructive" : ""}`}
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
                          {nigerianLocations.map((loc) => (
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
                {formState.errors.state && <p className="text-xs text-destructive">{formState.errors.state.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lga" className={formState.errors.lga ? "text-destructive" : ""}>LGA*</Label>
                <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="lga"
                      disabled={!selectedState}
                      className={`w-full justify-between font-normal bg-background ${formState.errors.lga ? "border-destructive" : ""}`}
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
                          {availableLgas.map((lga) => (
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
                {formState.errors.lga && <p className="text-xs text-destructive">{formState.errors.lga.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ward">Ward</Label>
                <Input id="ward" placeholder="e.g. Ward A" {...register("ward")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Transport Way" {...register("address")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/fleet/transporters")}
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
              <span>{transporter ? "Updating..." : "Creating..."}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{transporter ? "Update Transporter" : "Create Transporter"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

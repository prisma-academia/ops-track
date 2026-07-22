"use client";

import { useState } from "react";
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
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const Schema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  transporterId: z.string().min(1, "Please select a transporter"),
  phone: z.string().min(1, "Phone is required"),
  licenseNumber: z.string().optional().or(z.literal("")),
  licenseExpiryDate: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function CreateDriverForm({
  transporters,
  driver,
}: {
  transporters: { id: string; name: string }[];
  driver?: any;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openTransporterSelect, setOpenTransporterSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      firstName: driver?.firstName || "",
      lastName: driver?.lastName || "",
      transporterId: driver?.transporterId || "",
      phone: driver?.phone || "",
      licenseNumber: driver?.licenseNumber || "",
      licenseExpiryDate: driver?.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toISOString().split('T')[0] : "",
      address: driver?.address || "",
    },
  });

  const selectedTransporterId = watch("transporterId");
  const selectedTransporter = transporters.find((t) => t.id === selectedTransporterId);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    
    if (driver?.id) {
      const res = await apiPatch<{ driver: { id: string } }>(`/api/tenant/fleet/drivers/${driver.id}`, values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      router.push(`/admin/fleet/drivers/${driver.id}`);
      router.refresh();
    } else {
      const res = await apiPost<{ driver: { id: string } }>("/api/tenant/fleet/drivers", values);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      if (res.data?.driver.id) {
        router.push(`/admin/fleet/drivers`);
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
            onClick={() => router.push("/admin/fleet/drivers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              {driver ? "Edit Driver" : "Add Driver"}
            </h2>
            <p className="text-xs text-muted-foreground">Register a new truck driver</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="transporterId" className={formState.errors.transporterId ? "text-destructive" : ""}>Transporter / Company*</Label>
              <Popover open={openTransporterSelect} onOpenChange={setOpenTransporterSelect}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id="transporterId"
                    className={`w-full justify-between font-normal ${formState.errors.transporterId ? "border-destructive" : ""}`}
                  >
                    <span className="truncate">
                      {selectedTransporter ? selectedTransporter.name : "Select transporter..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search transporter..." />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      <CommandEmpty>No transporter found.</CommandEmpty>
                      <CommandGroup>
                        {transporters.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={t.name.toLowerCase()}
                            onSelect={() => {
                              setValue("transporterId", t.id, { shouldValidate: true });
                              setOpenTransporterSelect(false);
                            }}
                            data-checked={selectedTransporterId === t.id}
                          >
                            {t.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("transporterId")} />
              {formState.errors.transporterId && <p className="text-xs text-destructive">{formState.errors.transporterId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className={formState.errors.firstName ? "text-destructive" : ""}>First Name*</Label>
                <Input 
                  id="firstName" 
                  placeholder="e.g. John" 
                  {...register("firstName")}
                  className={formState.errors.firstName ? "border-destructive" : ""}
                />
                {formState.errors.firstName && <p className="text-xs text-destructive">{formState.errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className={formState.errors.lastName ? "text-destructive" : ""}>Last Name*</Label>
                <Input 
                  id="lastName" 
                  placeholder="e.g. Doe" 
                  {...register("lastName")}
                  className={formState.errors.lastName ? "border-destructive" : ""}
                />
                {formState.errors.lastName && <p className="text-xs text-destructive">{formState.errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className={formState.errors.phone ? "text-destructive" : ""}>Phone*</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. 0800000000" 
                  {...register("phone")}
                  className={formState.errors.phone ? "border-destructive" : ""}
                />
                {formState.errors.phone && <p className="text-xs text-destructive">{formState.errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className={formState.errors.licenseNumber ? "text-destructive" : ""}>License No.</Label>
                <Input 
                  id="licenseNumber" 
                  placeholder="e.g. D1234567" 
                  {...register("licenseNumber")}
                  className={formState.errors.licenseNumber ? "border-destructive" : ""}
                />
                {formState.errors.licenseNumber && <p className="text-xs text-destructive">{formState.errors.licenseNumber.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiryDate" className={formState.errors.licenseExpiryDate ? "text-destructive" : ""}>License Expiry Date</Label>
                <Input 
                  id="licenseExpiryDate" 
                  type="date"
                  {...register("licenseExpiryDate")}
                  className={formState.errors.licenseExpiryDate ? "border-destructive" : ""}
                />
                {formState.errors.licenseExpiryDate && <p className="text-xs text-destructive">{formState.errors.licenseExpiryDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className={formState.errors.address ? "text-destructive" : ""}>Address</Label>
                <Input 
                  id="address" 
                  placeholder="e.g. 123 Main St" 
                  {...register("address")}
                  className={formState.errors.address ? "border-destructive" : ""}
                />
                {formState.errors.address && <p className="text-xs text-destructive">{formState.errors.address.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-end gap-3 pt-2 max-w-2xl">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/fleet/drivers")}
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
              <span>{driver ? "Updating..." : "Saving..."}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{driver ? "Update Driver" : "Add Driver"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

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
  name: z.string().min(2, "Depot name is required").max(120),
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function CreateDepotForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      country: "Nigeria",
      state: "",
      lga: "",
      latitude: "",
      longitude: "",
    },
  });

  const selectedState = watch("state");
  const selectedLga = watch("lga");

  useEffect(() => {
    setValue("lga", "", { shouldValidate: false });
  }, [selectedState, setValue]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc: { state: string }) => loc.state === selectedState)?.lgas || []
    : [];

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const payload = {
      name: values.name,
      country: values.country,
      state: values.state,
      lga: values.lga,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
    };

    const res = await apiPost<{ depot: { id: string } }>("/api/tenant/depots", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push(`/admin/depots/${res.data?.depot.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => router.push("/admin/depots")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Create Depot</h2>
          <p className="text-xs text-muted-foreground">Add a loading depot used on fleet orders</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-border/40 max-w-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Depot details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Depot name *</Label>
            <Input id="name" placeholder="e.g. APAPA DEPOT" {...register("name")} />
            {formState.errors.name && (
              <p className="text-xs text-destructive">{formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {selectedState || "Select state"}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search state..." />
                    <CommandList>
                      <CommandEmpty>No state found.</CommandEmpty>
                      <CommandGroup>
                        {nigerianLocations.map((loc: { state: string }) => (
                          <CommandItem
                            key={loc.state}
                            value={loc.state}
                            onSelect={() => {
                              setValue("state", loc.state, { shouldValidate: true });
                              setOpenStateSelect(false);
                            }}
                          >
                            {loc.state}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>LGA</Label>
              <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={!selectedState}
                  >
                    {selectedLga || "Select LGA"}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search LGA..." />
                    <CommandList>
                      <CommandEmpty>No LGA found.</CommandEmpty>
                      <CommandGroup>
                        {availableLgas.map((lga: { name: string }) => (
                          <CommandItem
                            key={lga.name}
                            value={lga.name}
                            onSelect={() => {
                              setValue("lga", lga.name, { shouldValidate: true });
                              setOpenLgaSelect(false);
                            }}
                          >
                            {lga.name}
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
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" placeholder="6.5244" {...register("latitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" placeholder="3.3792" {...register("longitude")} />
            </div>
          </div>

          <Button type="submit" disabled={formState.isSubmitting} className="gap-2">
            {formState.isSubmitting ? <SpinnerEllipsis /> : <Save className="h-4 w-4" />}
            Save depot
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

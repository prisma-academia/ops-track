"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronsUpDown } from "lucide-react";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import nigerianLocations from "@/constant/nigerian-locations.json";

const Schema = z.object({
  name: z.string().min(2, "Depot name is required").max(120),
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
});

export type DepotEditValues = z.infer<typeof Schema>;

export type DepotEditInitial = DepotEditValues & { id: string };

export function EditDepotDialog({
  open,
  onOpenChange,
  depot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot: DepotEditInitial;
}) {
  const router = useRouter();
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch, reset } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: depot.name,
      country: depot.country ?? "",
      state: depot.state ?? "",
      lga: depot.lga ?? "",
      latitude: depot.latitude ?? "",
      longitude: depot.longitude ?? "",
    },
  });

  const selectedState = watch("state");
  const selectedLga = watch("lga");

  useEffect(() => {
    if (open) {
      reset({
        name: depot.name,
        country: depot.country ?? "",
        state: depot.state ?? "",
        lga: depot.lga ?? "",
        latitude: depot.latitude ?? "",
        longitude: depot.longitude ?? "",
      });
    }
  }, [open, depot, reset]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc: { state: string }) => loc.state === selectedState)?.lgas || []
    : [];

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPatch(`/api/tenant/depots/${depot.id}`, {
      name: values.name,
      country: values.country,
      state: values.state,
      lga: values.lga,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
    });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Depot updated");
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit depot</DialogTitle>
            <DialogDescription>
              Update depot location details. Renaming updates matching order source depot names.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-depot-name">Depot name *</Label>
              <Input id="edit-depot-name" {...register("name")} />
              {formState.errors.name && (
                <p className="text-xs text-destructive">{formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-depot-country">Country</Label>
              <Input id="edit-depot-country" {...register("country")} />
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
                                setValue("lga", "", { shouldValidate: true });
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
                <Label htmlFor="edit-depot-lat">Latitude</Label>
                <Input id="edit-depot-lat" {...register("latitude")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-depot-lng">Longitude</Label>
                <Input id="edit-depot-lng" {...register("longitude")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <SpinnerEllipsis /> : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  name: z.string().min(2, "Company name is required").max(100),
  supplierType: z.enum(["LOCAL", "DEPOT"]).optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
});

export type SupplierEditValues = z.infer<typeof Schema>;

export type SupplierEditInitial = SupplierEditValues & {
  id: string;
  supplierType?: "LOCAL" | "DEPOT" | null;
};

export function EditSupplierDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierEditInitial;
}) {
  const router = useRouter();
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState, setValue, watch, reset } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: supplier.name,
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      state: supplier.state ?? "",
      lga: supplier.lga ?? "",
      contactPerson: supplier.contactPerson ?? "",
      contactPhone: supplier.contactPhone ?? "",
      contactPosition: supplier.contactPosition ?? "",
      supplierType: supplier.supplierType ?? null,
    },
  });

  const selectedState = watch("state");
  const selectedLga = watch("lga");

  useEffect(() => {
    if (open) {
      reset({
        name: supplier.name,
        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        address: supplier.address ?? "",
        state: supplier.state ?? "",
        lga: supplier.lga ?? "",
        contactPerson: supplier.contactPerson ?? "",
        contactPhone: supplier.contactPhone ?? "",
        contactPosition: supplier.contactPosition ?? "",
        supplierType: supplier.supplierType ?? null,
      });
    }
  }, [open, supplier, reset]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc: { state: string }) => loc.state === selectedState)?.lgas || []
    : [];

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPatch(`/api/tenant/suppliers/${supplier.id}`, values);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Supplier updated");
    onOpenChange(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit supplier</DialogTitle>
            <DialogDescription>
              Update contact and company details. Balances are calculated from orders and payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-supplier-name">Supplier name *</Label>
              <Input id="edit-supplier-name" {...register("name")} />
              {formState.errors.name && (
                <p className="text-xs text-destructive">{formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Supplier type</Label>
              <Select
                value={watch("supplierType") ?? "unset"}
                onValueChange={(v) =>
                  setValue("supplierType", v === "unset" ? null : (v as "LOCAL" | "DEPOT"))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  <SelectItem value="DEPOT">Depot</SelectItem>
                  <SelectItem value="LOCAL">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supplier-email">Email</Label>
                <Input id="edit-supplier-email" type="email" placeholder="contact@company.com" {...register("email")} />
                {formState.errors.email && (
                  <p className="text-xs text-destructive">{formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier-phone">Phone</Label>
                <Input id="edit-supplier-phone" placeholder="+234…" {...register("phone")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-supplier-address">Address</Label>
              <Input id="edit-supplier-address" {...register("address")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">{selectedState || "Select state…"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search state…" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                          {nigerianLocations.map((loc: { state: string }) => (
                            <CommandItem
                              key={loc.state}
                              value={loc.state.toLowerCase()}
                              onSelect={() => {
                                const prev = selectedState;
                                setValue("state", loc.state, { shouldValidate: true });
                                if (prev && prev !== loc.state) {
                                  setValue("lga", "", { shouldValidate: true });
                                }
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
                <input type="hidden" {...register("state")} />
              </div>

              <div className="space-y-2">
                <Label>LGA</Label>
                <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selectedState}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">{selectedLga || "Select LGA…"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search LGA…" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No LGA found.</CommandEmpty>
                        <CommandGroup>
                          {availableLgas.map((lga: { name: string }) => (
                            <CommandItem
                              key={lga.name}
                              value={lga.name.toLowerCase()}
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
                <input type="hidden" {...register("lga")} />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact person
              </p>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-person">Full name</Label>
                <Input id="edit-contact-person" {...register("contactPerson")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-phone">Phone</Label>
                  <Input id="edit-contact-phone" {...register("contactPhone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-position">Position</Label>
                  <Input id="edit-contact-position" {...register("contactPosition")} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
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

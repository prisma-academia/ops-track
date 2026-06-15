"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ArrowLeft, Save, User, ShieldCheck, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

const Schema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  location: z.string().max(255).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function CreateStationForm({
  users,
}: {
  users: { id: string; email: string; firstName: string | null; lastName: string | null; permissions?: string[] }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openManagerSelect, setOpenManagerSelect] = useState(false);
  
  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      code: "",
      region: "",
      state: "",
      city: "",
      location: "",
      managerId: "",
    },
  });

  const selectedManagerId = watch("managerId");
  const selectedManager = users.find(u => u.id === selectedManagerId);

  const onSubmit = onSubmitForm(async (values) => {
    setError(null);
    const payload = {
      ...values,
      staffUserIds: values.managerId ? [values.managerId] : [],
    };
    
    const res = await apiPost<{ station: { id: string } }>("/api/tenant/stations", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.station.id) {
      router.push(`/admin/stations/${res.data.station.id}`);
      router.refresh();
    }
  });

  function onSubmitForm(callback: (values: Values) => Promise<void>) {
    return handleSubmit(callback);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.push("/admin/stations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase tracking-widest">
              Create Station
            </h2>
            <p className="text-xs text-muted-foreground">Add a new retail outlet station to the tenant system</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main form */}
        <Card className="lg:col-span-1 border-stone-200 bg-white/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Station Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Station Name*" htmlFor="name" error={formState.errors.name?.message}>
              <TextInput 
                id="name" 
                placeholder="e.g. Lagos Mainland Station" 
                {...register("name")} 
              />
            </FormField>

            <FormField label="Station Code*" htmlFor="code" error={formState.errors.code?.message}>
              <TextInput 
                id="code" 
                placeholder="e.g. AP-LAG-01" 
                {...register("code")} 
              />
            </FormField>

            <FormField label="Region*" htmlFor="region" error={formState.errors.region?.message}>
              <Select onValueChange={(v) => setValue("region", v, { shouldValidate: true })}>
                <SelectTrigger id="region" className="w-full">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="South-West">South-West</SelectItem>
                  <SelectItem value="South-East">South-East</SelectItem>
                  <SelectItem value="North-Central">North-Central</SelectItem>
                  <SelectItem value="North-West">North-West</SelectItem>
                  <SelectItem value="North-East">North-East</SelectItem>
                  <SelectItem value="South-South">South-South</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register("region")} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="State*" htmlFor="state" error={formState.errors.state?.message}>
                <TextInput 
                  id="state" 
                  placeholder="e.g. Lagos" 
                  {...register("state")} 
                />
              </FormField>

              <FormField label="City*" htmlFor="city" error={formState.errors.city?.message}>
                <TextInput 
                  id="city" 
                  placeholder="e.g. Ikeja" 
                  {...register("city")} 
                />
              </FormField>
            </div>

            <FormField label="Location / Address" htmlFor="location" error={formState.errors.location?.message}>
              <TextInput 
                id="location" 
                placeholder="e.g. 10 Marina Street" 
                {...register("location")} 
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Staff Assignment */}
        <Card className="lg:col-span-1 border-stone-200 bg-white/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Assign Station Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Select Manager" htmlFor="manager-select" error={formState.errors.managerId?.message}>
              <Popover open={openManagerSelect} onOpenChange={setOpenManagerSelect}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id="manager-select"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedManager
                        ? (selectedManager.firstName || selectedManager.lastName
                            ? `${selectedManager.firstName ?? ""} ${selectedManager.lastName ?? ""}`.trim()
                            : selectedManager.email)
                        : "Unassigned"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="unassigned"
                          onSelect={() => {
                            setValue("managerId", "", { shouldValidate: true });
                            setOpenManagerSelect(false);
                          }}
                          data-checked={!selectedManagerId}
                        >
                          Unassigned
                        </CommandItem>
                        {users.map((u) => {
                          const label = u.firstName || u.lastName
                            ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                            : u.email;
                          return (
                            <CommandItem
                              key={u.id}
                              value={`${label} ${u.email}`.toLowerCase()}
                              onSelect={() => {
                                setValue("managerId", u.id, { shouldValidate: true });
                                setOpenManagerSelect(false);
                              }}
                              data-checked={selectedManagerId === u.id}
                            >
                              {label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FormField>

            {selectedManager && (
              <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="font-semibold text-sm truncate">
                      {selectedManager.firstName || selectedManager.lastName 
                        ? `${selectedManager.firstName ?? ""} ${selectedManager.lastName ?? ""}`.trim()
                        : "No Name Provided"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{selectedManager.email}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-sm w-max border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck size={12} />
                      Station Manager
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/stations")}
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
              <span>Create Station</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

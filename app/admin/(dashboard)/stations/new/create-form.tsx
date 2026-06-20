"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Save, User, ShieldCheck, ChevronsUpDown, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import nigerianLocations from "@/constant/nigerian-locations.json";

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
  users: { id: string; email: string; firstName: string | null; lastName: string | null; phone?: string | null; permissions?: string[] }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openManagerSelect, setOpenManagerSelect] = useState(false);
  const [openStateSelect, setOpenStateSelect] = useState(false);
  
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
  const selectedManager = users.find((u) => u.id === selectedManagerId);
  const selectedState = watch("state");
  const watchName = watch("name");

  useEffect(() => {
    if (watchName) {
      const prefix = watchName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      if (prefix) {
        setValue("code", `${prefix}-001`, { shouldValidate: true });
      } else {
        setValue("code", "", { shouldValidate: true });
      }
    }
  }, [watchName, setValue]);

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
            <div className="space-y-2">
              <Label htmlFor="name" className={formState.errors.name ? "text-destructive" : ""}>Station Name*</Label>
              <Input 
                id="name" 
                placeholder="e.g. Lagos Mainland Station" 
                {...register("name")}
                className={formState.errors.name ? "border-destructive" : ""}
              />
              {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className={formState.errors.code ? "text-destructive" : ""}>Station Code*</Label>
                <Input 
                  id="code" 
                  placeholder="e.g. AP-LAG-01" 
                  readOnly
                  {...register("code")}
                  className={formState.errors.code ? "border-destructive bg-muted opacity-70 cursor-not-allowed" : "bg-muted opacity-70 cursor-not-allowed"}
                />
                {formState.errors.code && <p className="text-xs text-destructive">{formState.errors.code.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="region" className={formState.errors.region ? "text-destructive" : ""}>Region*</Label>
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
                {formState.errors.region && <p className="text-xs text-destructive">{formState.errors.region.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state" className={formState.errors.state ? "text-destructive" : ""}>State*</Label>
                <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="state"
                      className={`w-full justify-between font-normal ${formState.errors.state ? "border-destructive" : ""}`}
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
                <Label htmlFor="city" className={formState.errors.city ? "text-destructive" : ""}>City*</Label>
                <Input 
                  id="city" 
                  placeholder="e.g. Ikeja" 
                  {...register("city")}
                  className={formState.errors.city ? "border-destructive" : ""}
                />
                {formState.errors.city && <p className="text-xs text-destructive">{formState.errors.city.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className={formState.errors.location ? "text-destructive" : ""}>Location / Address</Label>
              <Textarea 
                id="location" 
                placeholder="e.g. 10 Marina Street" 
                {...register("location")}
                className={formState.errors.location ? "border-destructive" : ""}
                rows={3}
              />
              {formState.errors.location && <p className="text-xs text-destructive">{formState.errors.location.message}</p>}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="manager-select" className={formState.errors.managerId ? "text-destructive" : ""}>Select Manager</Label>
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
              {formState.errors.managerId && <p className="text-xs text-destructive">{formState.errors.managerId.message}</p>}
            </div>

            {selectedManager && (
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-stone-50 to-stone-100/50 p-4 shadow-sm dark:from-stone-900/50 dark:to-stone-900/20">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
                  <User size={20} strokeWidth={2.5} />
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedManager.firstName || selectedManager.lastName 
                        ? `${selectedManager.firstName ?? ""} ${selectedManager.lastName ?? ""}`.trim()
                        : "No Name Provided"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <ShieldCheck size={12} />
                      <span>Manager</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail size={12} className="shrink-0 opacity-70" />
                      <span className="truncate">{selectedManager.email}</span>
                    </div>
                    {selectedManager.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={12} className="shrink-0 opacity-70" />
                        <span className="truncate">{selectedManager.phone}</span>
                      </div>
                    )}
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

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
  organizationId: z.string().min(1, "Please select an organization"),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  state: z.string().min(2, "Please select a state"),
  lga: z.string().min(2, "Please select an LGA"),
  ward: z.string().min(2, "Please select a ward"),
  location: z.string().max(255).optional().or(z.literal("")),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  altitude: z.number().optional().nullable(),
  managerId: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function CreateStationForm({
  users,
  existingStations = [],
  organizations = [],
  defaultOrgId,
}: {
  users: { id: string; email: string; firstName: string | null; lastName: string | null; phone?: string | null; permissions?: string[] }[];
  existingStations?: { code: string; state: string | null }[];
  organizations?: { id: string; name: string; type: string }[];
  defaultOrgId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [openManagerSelect, setOpenManagerSelect] = useState(false);
  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);
  const [openWardSelect, setOpenWardSelect] = useState(false);
  
  const { register, handleSubmit, formState, setValue, watch, control } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      organizationId: defaultOrgId || "",
      name: "",
      code: "",
      state: "",
      lga: "",
      ward: "",
      location: "",
      latitude: null,
      longitude: null,
      altitude: null,
      managerId: "",
    },
  });

  const selectedManagerId = watch("managerId");
  const selectedManager = users.find((u) => u.id === selectedManagerId);
  const selectedState = watch("state");
  const selectedLga = watch("lga");
  const selectedWard = watch("ward");
  const watchName = watch("name");
  
  const [hasManuallyEditedCode, setHasManuallyEditedCode] = useState(false);

  useEffect(() => {
    if (selectedState && !hasManuallyEditedCode) {
      const statePrefixMap: Record<string, string> = {
        "Abia": "ABI", "Adamawa": "ADA", "Akwa Ibom": "AKW", "Anambra": "ANA",
        "Bauchi": "BAU", "Bayelsa": "BAY", "Benue": "BEN", "Borno": "BOR",
        "Cross River": "CRS", "Delta": "DEL", "Ebonyi": "EBO", "Edo": "EDO",
        "Ekiti": "EKI", "Enugu": "ENU", "Federal Capital Territory": "FCT", "FCT": "FCT",
        "Gombe": "GOM", "Imo": "IMO", "Jigawa": "JIG", "Kaduna": "KDN",
        "Kano": "KAN", "Katsina": "KAT", "Kebbi": "KEB", "Kogi": "KOG",
        "Kwara": "KWA", "Lagos": "LAG", "Nasarawa": "NAS", "Niger": "NIG",
        "Ogun": "OGU", "Ondo": "OND", "Osun": "OSU", "Oyo": "OYO",
        "Plateau": "PLA", "Rivers": "RIV", "Sokoto": "SOK", "Taraba": "TAR",
        "Yobe": "YOB", "Zamfara": "ZAM"
      };

      const prefix = statePrefixMap[selectedState] || selectedState.substring(0, 3).toUpperCase();
      
      const stationsInState = existingStations.filter(s => s.state === selectedState);
      const nextNumber = stationsInState.length + 1;
      const formattedNumber = nextNumber.toString().padStart(3, "0");

      setValue("code", `STN-${prefix}-${formattedNumber}`, { shouldValidate: true });
    }
  }, [selectedState, setValue, hasManuallyEditedCode, existingStations]);

  useEffect(() => {
    setValue("lga", "", { shouldValidate: false });
    setValue("ward", "", { shouldValidate: false });
    setValue("latitude", null);
    setValue("longitude", null);
  }, [selectedState, setValue]);

  useEffect(() => {
    setValue("ward", "", { shouldValidate: false });
    setValue("latitude", null);
    setValue("longitude", null);
  }, [selectedLga, setValue]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc) => loc.state === selectedState)?.lgas || []
    : [];

  const availableWards = selectedLga
    ? availableLgas.find((l) => l.name === selectedLga)?.wards || []
    : [];

  const handleWardSelect = (wardName: string) => {
    setValue("ward", wardName, { shouldValidate: true });
    const wardObj = availableWards.find((w) => w.name === wardName);
    if (wardObj) {
      setValue("latitude", wardObj.latitude);
      setValue("longitude", wardObj.longitude);
    } else {
      setValue("latitude", null);
      setValue("longitude", null);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
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
        <Card className="lg:col-span-1 border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Station Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Organization Select (Hidden, done behind the scenes) */}
            <input type="hidden" {...register("organizationId")} />

            {/* Station Name - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="name" className={formState.errors.name ? "text-destructive" : ""}>Station Name*</Label>
              <Input 
                id="name" 
                placeholder="e.g. Lagos Mainland Station" 
                {...register("name")}
                className={formState.errors.name ? "border-destructive" : ""}
              />
              {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message as string}</p>}
            </div>

            {/* State and Station Code - Same Row */}
            <div className="grid grid-cols-2 gap-4">

              {/* Station Code */}
              <div className="space-y-2">
                <Label htmlFor="code" className={formState.errors.code ? "text-destructive" : ""}>Station Code*</Label>
                <Input 
                  id="code" 
                  placeholder="e.g. AP-LAG-01" 
                  {...register("code", {
                    onChange: () => setHasManuallyEditedCode(true)
                  })}
                  className={formState.errors.code ? "border-destructive" : ""}
                />
                {formState.errors.code && <p className="text-xs text-destructive">{formState.errors.code.message}</p>}
              </div>

                {/* State */}
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
            </div>

            {/* LGA and Ward - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* LGA */}
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

              {/* Ward */}
              <div className="space-y-2">
                <Label htmlFor="ward" className={formState.errors.ward ? "text-destructive" : ""}>Ward*</Label>
                <Popover open={openWardSelect} onOpenChange={setOpenWardSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="ward"
                      disabled={!selectedLga}
                      className={`w-full justify-between font-normal bg-background ${formState.errors.ward ? "border-destructive" : ""}`}
                    >
                      <span className="truncate">{selectedWard || "Select ward..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search ward..." />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No ward found.</CommandEmpty>
                        <CommandGroup>
                          {availableWards.map((ward) => (
                            <CommandItem
                              key={ward.name}
                              value={ward.name.toLowerCase()}
                              onSelect={() => {
                                handleWardSelect(ward.name);
                                setOpenWardSelect(false);
                              }}
                              data-checked={selectedWard === ward.name}
                            >
                              {ward.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" {...register("ward")} />
                {formState.errors.ward && <p className="text-xs text-destructive">{formState.errors.ward.message}</p>}
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
        <Card className="lg:col-span-1 border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
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

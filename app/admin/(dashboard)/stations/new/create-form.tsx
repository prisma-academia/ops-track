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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { ArrowLeft, Save } from "lucide-react";

const Schema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  location: z.string().max(255).optional().or(z.literal("")),
  staffUserIds: z.array(z.string()).default([]),
});

type Values = z.infer<typeof Schema>;

export function CreateStationForm({
  users,
}: {
  users: { id: string; email: string; firstName: string | null; lastName: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useComboboxAnchor();
  
  const { register, handleSubmit, formState, setValue, watch } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      code: "",
      region: "",
      location: "",
      staffUserIds: [] as string[],
    },
  });

  const selectedStaff = watch("staffUserIds") || [];

  const onSubmit = onSubmitForm(async (values) => {
    setError(null);
    const res = await apiPost<{ station: { id: string } }>("/api/tenant/stations", values);
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

  const staffItems = users.map((u) => ({
    id: u.id,
    value: u.id,
    label: u.firstName || u.lastName 
      ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
      : u.email,
  }));

  const selectedItems = staffItems.filter((item) => selectedStaff.includes(item.id));

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
        {/* <Button
          type="submit"
          size="sm"
          disabled={formState.isSubmitting}
          className="h-9 rounded-full gap-2 px-4"
        >
          <Save className="h-4 w-4" />
          {formState.isSubmitting ? "Saving..." : "Save Station"}
        </Button> */}
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

            <FormField label="Location / Address" htmlFor="location" error={formState.errors.location?.message}>
              <TextInput 
                id="location" 
                placeholder="e.g. 10 Marina Street, Lagos" 
                {...register("location")} 
                
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Staff Assignment */}
        <Card className="lg:col-span-1 border-stone-200 bg-white/60 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <CardTitle>
              Assign Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Assign Staff" htmlFor="staff-combobox" error={formState.errors.staffUserIds?.message}>
              <Combobox
                multiple
                items={staffItems}
                value={selectedItems}
                onValueChange={(val: any[]) => {
                  const ids = (val || []).map((v) => v.id);
                  setValue("staffUserIds", ids, { shouldDirty: true });
                }}
              >
                <ComboboxChips ref={anchorRef} className="w-full">
                  {selectedItems.map((item) => (
                    <ComboboxChip key={item.id}>
                      {item.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder={selectedStaff.length === 0 ? "Select staff..." : ""} />
                </ComboboxChips>
                <ComboboxContent anchor={anchorRef}>
                  <ComboboxInput showTrigger={false} placeholder="Search" />
                  <ComboboxEmpty>No items found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.id} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <input type="hidden" {...register("staffUserIds")} />
            </FormField>
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
          <Save className="h-4 w-4" />
          {formState.isSubmitting ? "Creating..." : "Create Station"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";

const Schema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens."),
  ownerEmail: z.email(),
  ownerFirstName: z.string().min(1).max(100),
  ownerLastName: z.string().min(1).max(100),
  ownerOtherName: z.string().max(100).optional().or(z.literal("")),
  ownerPhone: z.string().max(40).optional().or(z.literal("")),
  companyEmail: z.email().optional().or(z.literal("")),
  companyPhone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(2).optional().or(z.literal("")),
});
type Values = z.infer<typeof Schema>;

export function CreateTenantForm() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ tenant: { id: string } }>("/api/platform/tenants", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.tenant.id) router.push(`/tenants/${res.data.tenant.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <h2 className="col-span-2 text-sm font-semibold uppercase text-stone-500">Company</h2>
      <FormField label="Name" htmlFor="name" error={formState.errors.name?.message}>
        <TextInput id="name" {...register("name")} />
      </FormField>
      <FormField label="Slug" htmlFor="slug" error={formState.errors.slug?.message}>
        <TextInput id="slug" placeholder="acme" {...register("slug")} />
      </FormField>
      <FormField label="Company email" htmlFor="cemail" error={formState.errors.companyEmail?.message}>
        <TextInput id="cemail" type="email" {...register("companyEmail")} />
      </FormField>
      <FormField label="Company phone" htmlFor="cphone" error={formState.errors.companyPhone?.message}>
        <TextInput id="cphone" type="tel" {...register("companyPhone")} />
      </FormField>
      <FormField label="Website" htmlFor="web" error={formState.errors.website?.message}>
        <TextInput id="web" {...register("website")} />
      </FormField>
      <span />
      <FormField label="Address" htmlFor="a1" error={formState.errors.addressLine1?.message}>
        <TextInput id="a1" {...register("addressLine1")} />
      </FormField>
      <FormField label="City" htmlFor="city" error={formState.errors.city?.message}>
        <TextInput id="city" {...register("city")} />
      </FormField>
      <FormField label="Region / State" htmlFor="reg" error={formState.errors.region?.message}>
        <TextInput id="reg" {...register("region")} />
      </FormField>
      <FormField label="Postal code" htmlFor="pc" error={formState.errors.postalCode?.message}>
        <TextInput id="pc" {...register("postalCode")} />
      </FormField>
      <FormField label="Country (ISO-2)" htmlFor="ctry" error={formState.errors.country?.message}>
        <TextInput id="ctry" placeholder="US" {...register("country")} />
      </FormField>

      <h2 className="col-span-2 mt-6 text-sm font-semibold uppercase text-stone-500">Owner</h2>
      <FormField label="First name" htmlFor="of" error={formState.errors.ownerFirstName?.message}>
        <TextInput id="of" {...register("ownerFirstName")} />
      </FormField>
      <FormField label="Last name" htmlFor="ol" error={formState.errors.ownerLastName?.message}>
        <TextInput id="ol" {...register("ownerLastName")} />
      </FormField>
      <FormField label="Other name" htmlFor="oo" error={formState.errors.ownerOtherName?.message}>
        <TextInput id="oo" {...register("ownerOtherName")} />
      </FormField>
      <FormField label="Phone" htmlFor="op" error={formState.errors.ownerPhone?.message}>
        <TextInput id="op" type="tel" {...register("ownerPhone")} />
      </FormField>
      <FormField label="Email" htmlFor="oe" error={formState.errors.ownerEmail?.message}>
        <TextInput id="oe" type="email" {...register("ownerEmail")} />
      </FormField>

      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      <div className="col-span-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating…" : "Create tenant"}
        </Button>
      </div>
    </form>
  );
}

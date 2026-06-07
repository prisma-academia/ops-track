"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";

const Schema = z.object({
  displayName: z.string().min(1, "Enter your name."),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
});

type Values = z.infer<typeof Schema>;

export function ClientProfileForm({
  initialDisplayName,
  initialFirstName,
  initialLastName,
  initialPhone,
}: {
  initialDisplayName: string;
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
}) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      displayName: initialDisplayName,
      firstName: initialFirstName || undefined,
      lastName: initialLastName || undefined,
      phone: initialPhone || undefined,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPatch<{ client: { id: string } }>("/api/client/profile", {
      displayName: values.displayName,
      firstName: values.firstName || null,
      lastName: values.lastName || null,
      phone: values.phone || null,
    });
    if (res.error) {
      setError(res.error.message);
      return;
    }
    window.location.assign("/dashboard");
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <FormField label="Display name" htmlFor="displayName" error={formState.errors.displayName?.message}>
        <TextInput id="displayName" autoComplete="name" {...register("displayName")} />
      </FormField>
      <FormField label="First name (optional)" htmlFor="firstName" error={formState.errors.firstName?.message}>
        <TextInput id="firstName" autoComplete="given-name" {...register("firstName")} />
      </FormField>
      <FormField label="Last name (optional)" htmlFor="lastName" error={formState.errors.lastName?.message}>
        <TextInput id="lastName" autoComplete="family-name" {...register("lastName")} />
      </FormField>
      <FormField label="Phone (optional)" htmlFor="phone" error={formState.errors.phone?.message}>
        <TextInput id="phone" type="tel" autoComplete="tel" {...register("phone")} />
      </FormField>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

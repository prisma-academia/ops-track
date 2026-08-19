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
  firstName: z.string().min(1).max(100).optional().or(z.literal("")),
  lastName: z.string().min(1).max(100).optional().or(z.literal("")),
  otherName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.email(),
});
type Values = z.infer<typeof Schema>;

export function CreateClientForm() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(Schema) });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ client: { id: string } }>("/api/tenant/clients", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.client.id) router.push(`/admin/clients/${res.data.client.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <FormField label="First name" htmlFor="f" error={formState.errors.firstName?.message}>
        <TextInput id="f" {...register("firstName")} />
      </FormField>
      <FormField label="Last name" htmlFor="l" error={formState.errors.lastName?.message}>
        <TextInput id="l" {...register("lastName")} />
      </FormField>
      <FormField label="Other name" htmlFor="o" error={formState.errors.otherName?.message}>
        <TextInput id="o" {...register("otherName")} />
      </FormField>
      <FormField label="Phone" htmlFor="p" error={formState.errors.phone?.message}>
        <TextInput id="p" type="tel" {...register("phone")} />
      </FormField>
      <FormField label="Email" htmlFor="e" error={formState.errors.email?.message}>
        <TextInput id="e" type="email" {...register("email")} />
      </FormField>
      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      <div className="col-span-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving…" : "Add client"}
        </Button>
      </div>
    </form>
  );
}

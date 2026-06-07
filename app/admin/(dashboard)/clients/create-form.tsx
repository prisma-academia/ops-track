"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";

const Schema = z.object({
  email: z.email(),
  name: z.string().min(1).max(200).optional(),
});
type Values = z.infer<typeof Schema>;

export function CreateClientForm() {
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(Schema) });
  const [error, setError] = useState<string | null>(null);
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost("/api/tenant/clients", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    window.location.reload();
  });
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <FormField label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <TextInput id="email" type="email" {...register("email")} />
      </FormField>
      <FormField label="Name (optional)" htmlFor="name" error={formState.errors.name?.message}>
        <TextInput id="name" {...register("name")} />
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

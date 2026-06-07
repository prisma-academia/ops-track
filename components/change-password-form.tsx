"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";

const Schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12),
    confirm: z.string().min(12),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

type Values = z.infer<typeof Schema>;

export function ChangePasswordForm() {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ redirect: string }>("/api/auth/change-password", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.redirect) window.location.assign(res.data.redirect);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormField label="Current password" htmlFor="cur" error={formState.errors.currentPassword?.message}>
        <Input id="cur" type="password" autoComplete="current-password" {...register("currentPassword")} />
      </FormField>
      <FormField label="New password" htmlFor="new" error={formState.errors.newPassword?.message}>
        <Input id="new" type="password" autoComplete="new-password" {...register("newPassword")} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="conf" error={formState.errors.confirm?.message}>
        <Input id="conf" type="password" autoComplete="new-password" {...register("confirm")} />
      </FormField>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        {formState.isSubmitting ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

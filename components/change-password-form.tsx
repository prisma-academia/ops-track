"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPost<{ redirect: string }>("/api/auth/change-password", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (res.data?.redirect) window.location.assign(res.data.redirect);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FormField label="Current password" htmlFor="cur" required error={formState.errors.currentPassword?.message}>
          <PasswordInput id="cur" autoComplete="current-password" placeholder="Enter your current password" className="dark:bg-background h-9 shadow-xs" {...register("currentPassword")} />
        </FormField>
        <FormField label="New password" htmlFor="new" required error={formState.errors.newPassword?.message}>
          <PasswordInput id="new" autoComplete="new-password" placeholder="Enter your new password" className="dark:bg-background h-9 shadow-xs" {...register("newPassword")} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="conf" required error={formState.errors.confirm?.message}>
          <PasswordInput id="conf" autoComplete="new-password" placeholder="Confirm your new password" className="dark:bg-background h-9 shadow-xs" {...register("confirm")} />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer w-full">
        {formState.isSubmitting ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

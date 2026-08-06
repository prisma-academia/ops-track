"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/form-field";

const Schema = z
  .object({
    password: z.string().min(12, "At least 12 characters."),
    confirm: z.string().min(12),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

type Values = z.infer<typeof Schema>;

export function ResetPasswordForm({ token, backHref, backLabel }: { token: string; backHref: string; backLabel: string }) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPost<{ redirect: string }>("/api/auth/reset-password", {
      token,
      password: values.password,
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
        <FormField label="New password" htmlFor="pw" required error={formState.errors.password?.message}>
          <PasswordInput id="pw" autoComplete="new-password" placeholder="Enter your new password" className="dark:bg-background h-9 shadow-xs" {...register("password")} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="cf" required error={formState.errors.confirm?.message}>
          <PasswordInput id="cf" autoComplete="new-password" placeholder="Confirm your new password" className="dark:bg-background h-9 shadow-xs" {...register("confirm")} />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer w-full">
        {formState.isSubmitting ? "Saving…" : "Update password"}
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-lg h-10 cursor-pointer w-full">
        <Link href={backHref}>
          {backLabel}
        </Link>
      </Button>
    </form>
  );
}

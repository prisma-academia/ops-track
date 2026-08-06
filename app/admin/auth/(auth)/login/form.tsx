"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/form-field";
import { Field, FieldSeparator, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";


const Schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
type Values = z.infer<typeof Schema>;

export function AdminLoginForm() {
  const t = useTranslations("auth");
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPost<{ redirect: string }>("/api/auth/login", values);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (res.data?.redirect) window.location.assign(res.data.redirect);
  });

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-6">
        <Field className="grid md:grid-cols-2 md:gap-6 gap-3">
          <Button
            variant="outline"
            type="button"
            disabled
            className="text-sm text-medium text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs"
          >
            <img
              src="https://images.shadcnspace.com/assets/svgs/icon-google.svg"
              alt="google icon"
              className="h-4 w-4 opacity-50"
            />
            Google (Coming soon)
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled
            className="text-sm text-medium text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs"
          >
            <img
              src="https://images.shadcnspace.com/assets/svgs/icon-facebook.svg"
              alt="facebook icon"
              className="dark:hidden h-4 w-4 opacity-50"
            />
            <img
              src="https://images.shadcnspace.com/assets/svgs/icon-facebook-white.svg"
              alt="facebook icon"
              className="hidden dark:block h-4 w-4 opacity-50"
            />
            Facebook (Coming soon)
          </Button>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-sm text-muted-foreground bg-transparent">
          <span className="px-4">or sign in with</span>
        </FieldSeparator>

        <div className="flex flex-col gap-4">
          <FormField label={t("email")} htmlFor="email" required error={formState.errors.email?.message}>
            <Input id="email" type="email" placeholder="example@shadcnspace.com" autoComplete="email" className="dark:bg-background h-9 shadow-xs" {...register("email")} />
          </FormField>
          <FormField label={t("password")} htmlFor="password" required error={formState.errors.password?.message}>
            <PasswordInput id="password" placeholder="Enter your password" autoComplete="current-password" className="dark:bg-background h-9 shadow-xs" {...register("password")} />
          </FormField>
        </div>

        <Field orientation="horizontal" className="justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              id="terms"
              defaultChecked
              className="cursor-pointer"
            />
            <FieldLabel
              htmlFor="terms"
              className="text-sm text-primary font-normal cursor-pointer"
            >
              Remember this device
            </FieldLabel>
          </div>
          <Link
            href="/admin/auth/forgot-password"
            className="text-sm text-card-foreground font-medium text-end"
          >
            Forgot password?
          </Link>
        </Field>
        
        <Field className="gap-4">
          <Button type="submit" size="lg" disabled={formState.isSubmitting} className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer w-full">
            {formState.isSubmitting ? t("signingIn") : t("signIn")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}


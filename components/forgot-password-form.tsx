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
import { FormField } from "@/components/form-field";
import {PasswordInput} from "@/components/ui/password-input";
const Schema = z.object({ email: z.email() });
type Values = z.infer<typeof Schema>;

export function ForgotPasswordForm({
  surface,
  backHref,
  backLabel,
}: {
  surface: "platform" | "tenant_admin" | "tenant_client";
  backHref: string;
  backLabel: string;
}) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });
  const [done, setDone] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiPost("/api/auth/forgot-password", { email: values.email, surface });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setDone(true);
  });

  if (done) {
    return (
      <p className="text-sm text-stone-600">
        If an account exists for that email, we sent a reset link. Check your inbox (and spam).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="email" required error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="example@gmail.com" className="dark:bg-background h-9 shadow-xs" {...register("email")} />
        </FormField>
      </div>
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer w-full">
        {formState.isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-lg h-10 cursor-pointer w-full">
        <Link href={backHref}>
          {backLabel}
        </Link>
      </Button>
    </form>
  );
}

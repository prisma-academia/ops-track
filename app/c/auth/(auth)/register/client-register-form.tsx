"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";

const DetailsSchema = z
  .object({
    email: z.email(),
    password: z.string().min(12, "At least 12 characters."),
    confirm: z.string().min(12),
    displayName: z.string().min(1, "Enter how we should address you."),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    otherName: z.string().max(100).optional(),
    phone: z.string().max(40).optional(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

const OtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

type DetailsValues = z.infer<typeof DetailsSchema>;
type OtpValues = z.infer<typeof OtpSchema>;

export function ClientRegisterForm() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(DetailsSchema),
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(OtpSchema),
  });

  const onDetails = detailsForm.handleSubmit(async (values) => {
    detailsForm.clearErrors("root");
    const res = await apiPost<{ step?: string }>("/api/auth/register/client/start", {
      email: values.email,
      password: values.password,
      confirm: values.confirm,
      displayName: values.displayName,
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
      otherName: values.otherName || undefined,
      phone: values.phone || undefined,
    });
    if (res.error) {
      detailsForm.setError("root", { message: res.error.message });
      return;
    }
    setEmail(values.email.toLowerCase());
    setStep("otp");
    setOtpInfo("We sent a 6-digit code to your email.");
  });

  const onOtp = otpForm.handleSubmit(async (values) => {
    setOtpError(null);
    setOtpInfo(null);
    const res = await apiPost<{ redirect: string }>("/api/auth/register/client/complete", {
      email,
      code: values.code,
    });
    if (res.error) {
      setOtpError(res.error.message);
      return;
    }
    if (res.data?.redirect) window.location.assign(res.data.redirect);
  });

  async function resend() {
    setOtpError(null);
    setOtpInfo(null);
    const res = await apiPost("/api/auth/register/client/resend-otp", { email });
    if (res.error) {
      setOtpError(res.error.message);
      return;
    }
    setOtpInfo("A new code was sent if your registration is still in progress.");
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-stone-600">
          Enter the verification code we sent to <span className="font-medium">{email}</span>.
        </p>
        <form onSubmit={onOtp} className="flex flex-col gap-6">
          <FormField label="Verification code" htmlFor="code" error={otpForm.formState.errors.code?.message}>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              {...otpForm.register("code")}
            />
          </FormField>
          {otpInfo ? <p className="text-sm text-green-700">{otpInfo}</p> : null}
          {otpError ? <p className="text-sm text-red-600">{otpError}</p> : null}
          <Button type="submit" disabled={otpForm.formState.isSubmitting}>
            {otpForm.formState.isSubmitting ? "Verifying…" : "Create account"}
          </Button>
        </form>
        <div className="flex flex-col gap-2 text-xs text-stone-500">
          <button type="button" className="text-left underline" onClick={resend}>
            Resend code
          </button>
          <button type="button" className="text-left underline" onClick={() => setStep("details")}>
            Edit details and start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onDetails} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name (optional)" htmlFor="firstName" error={detailsForm.formState.errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" {...detailsForm.register("firstName")} />
        </FormField>
        <FormField label="Last name (optional)" htmlFor="lastName" error={detailsForm.formState.errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...detailsForm.register("lastName")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Display name" htmlFor="displayName" error={detailsForm.formState.errors.displayName?.message}>
          <Input id="displayName" autoComplete="name" {...detailsForm.register("displayName")} />
        </FormField>
        <FormField label="Other name (optional)" htmlFor="otherName" error={detailsForm.formState.errors.otherName?.message}>
          <Input id="otherName" {...detailsForm.register("otherName")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Email" htmlFor="email" error={detailsForm.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...detailsForm.register("email")} />
        </FormField>
        <FormField label="Phone (optional)" htmlFor="phone" error={detailsForm.formState.errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" {...detailsForm.register("phone")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Password" htmlFor="password" error={detailsForm.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...detailsForm.register("password")} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirm" error={detailsForm.formState.errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" {...detailsForm.register("confirm")} />
        </FormField>
      </div>
      {detailsForm.formState.errors.root?.message ? (
        <p className="text-sm text-red-600">{detailsForm.formState.errors.root.message}</p>
      ) : null}
      <p className="text-xs text-stone-500">12+ characters with upper, lower, digit, and symbol.</p>
      <Button type="submit" disabled={detailsForm.formState.isSubmitting}>
        {detailsForm.formState.isSubmitting ? "Sending code…" : "Continue — verify email"}
      </Button>
      <p className="text-center text-xs text-stone-500">
        <Link href="/auth/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

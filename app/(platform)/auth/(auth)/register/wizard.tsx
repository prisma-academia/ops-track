"use client";

/* eslint-disable react-hooks/incompatible-library */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost, apiGet } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CountrySelect } from "@/components/ui/country-select";

const AccountSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    otherName: z.string().max(100).optional().or(z.literal("")),
    phone: z.string().max(40).optional().or(z.literal("")),
    email: z.email(),
    password: z.string().min(12),
    confirmPassword: z.string().min(12),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const CompanySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens."),
  companyEmail: z.email().optional().or(z.literal("")),
  companyPhone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(2).optional().or(z.literal("")),
});

type AccountValues = z.infer<typeof AccountSchema>;
type CompanyValues = z.infer<typeof CompanySchema>;

type Step = "account" | "company" | "otp";

export function RegisterWizard() {
  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState<AccountValues | null>(null);
  const [company, setCompany] = useState<CompanyValues | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  return (
    <div>
      <Steps current={step} />
      <div className="mt-6">
        {step === "account" ? (
          <AccountForm
            initial={account}
            onNext={(v) => {
              setAccount(v);
              setStep("company");
            }}
          />
        ) : null}
        {step === "company" ? (
          <CompanyForm
            initial={company}
            onBack={() => setStep("account")}
            onSubmit={async (v) => {
              if (!account) return;
              setError(null);
              setPending(true);
              const res = await apiPost("/api/auth/register/start", { ...account, ...v });
              setPending(false);
              if (res.error) {
                setError(res.error.message);
                return;
              }
              setCompany(v);
              setInfo("We emailed a 6-digit code. Enter it below.");
              setResendTimer(30);
              setStep("otp");
            }}
            pending={pending}
            error={error}
          />
        ) : null}
        {/* {step === "preview" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 p-5 rounded-xl border bg-muted/30 text-sm">
              <h3 className="font-medium text-foreground border-b border-border pb-2">Review your details</h3>
              
              <h4 className="font-medium text-foreground mt-2">Account</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div><dt className="text-muted-foreground text-xs">Email</dt><dd className="font-medium mt-1 text-foreground">{account?.email}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Name</dt><dd className="font-medium mt-1 text-foreground">{account?.firstName} {account?.lastName} {account?.otherName}</dd></div>
                {account?.phone && <div><dt className="text-muted-foreground text-xs">Phone</dt><dd className="font-medium mt-1 text-foreground">{account.phone}</dd></div>}
              </dl>

              <h4 className="font-medium text-foreground mt-2 border-t border-border pt-4">Company</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div><dt className="text-muted-foreground text-xs">Name</dt><dd className="font-medium mt-1 text-foreground">{company?.name}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Slug</dt><dd className="font-medium mt-1 text-foreground">{company?.slug}</dd></div>
                {company?.companyEmail && <div><dt className="text-muted-foreground text-xs">Company Email</dt><dd className="font-medium mt-1 text-foreground">{company.companyEmail}</dd></div>}
                {company?.companyPhone && <div><dt className="text-muted-foreground text-xs">Company Phone</dt><dd className="font-medium mt-1 text-foreground">{company.companyPhone}</dd></div>}
                {company?.website && <div><dt className="text-muted-foreground text-xs">Website</dt><dd className="font-medium mt-1 text-foreground">{company.website}</dd></div>}
              </dl>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-between mt-2">
              <Button type="button" variant="outline" onClick={() => setStep("company")} disabled={pending}>
                Back
              </Button>
              <Button type="button" disabled={pending} onClick={async () => {
                if (!account || !company) return;
                setError(null);
                setPending(true);
                const res = await apiPost("/api/auth/register/start", { ...account, ...company });
                setPending(false);
                if (res.error) {
                  setError(res.error.message);
                  return;
                }
                setInfo("We emailed a 6-digit code. Enter it below.");
                setResendTimer(30);
                setStep("otp");
              }}>
                {pending ? "Sending…" : "Send verification code"}
              </Button>
            </div>
          </div>
        ) : null} */}
        {step === "otp" ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <p className="text-sm text-stone-600 text-center">
              {info || "Enter the verification code we sent."}
            </p>
            <FormField label="Verification code" htmlFor="code">
              <div className="flex justify-center">
                <InputOTP placeholder="." maxLength={6} value={code} onChange={(val) => setCode(val)}>
                  <InputOTPGroup>
                    <InputOTPSlot className="w-10 h-10" index={0} />
                    <InputOTPSlot className="w-10 h-10" index={1} />
                    <InputOTPSlot className="w-10 h-10" index={2} />
                    <InputOTPSlot className="w-10 h-10" index={3} />
                    <InputOTPSlot className="w-10 h-10" index={4} />
                    <InputOTPSlot className="w-10 h-10" index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </FormField>
            {error ? <p className="text-sm text-red-600 text-center">{error}</p> : null}
            <Button
              className="w-full max-w-sm"
              disabled={pending || !/^\d{6}$/.test(code)}
              onClick={async () => {
                if (!account || !company) return;
                setError(null);
                setPending(true);
                const res = await apiPost<{ redirectUrl: string }>(
                  "/api/auth/register/verify",
                  { ...account, ...company, code }
                );
                setPending(false);
                if (res.error) {
                  setError(res.error.message);
                  return;
                }
                if (res.data?.redirectUrl) window.location.assign(res.data.redirectUrl);
              }}
            >
              {pending ? "Verifying…" : "Verify code"}
            </Button>
            <div className="flex flex-col gap-2 text-sm text-stone-500 mt-2">
              <button
                type="button"
                className="text-center underline disabled:no-underline disabled:opacity-50"
                disabled={pending || isResending || resendTimer > 0}
                onClick={async () => {
                  if (!account || !company) return;
                  setError(null);
                  setIsResending(true);
                  const res = await apiPost("/api/auth/register/start", { ...account, ...company });
                  setIsResending(false);
                  if (res.error) {
                    setError(res.error.message);
                  } else {
                    setInfo("A new 6-digit code has been sent.");
                    setResendTimer(30);
                  }
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : (isResending ? "Resending..." : "Resend code")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const items: Array<{ key: Step; label: string }> = [
    { key: "account", label: "1. Account" },
    { key: "company", label: "2. Company" },
    // { key: "preview", label: "3. Preview" },
    { key: "otp", label: "3. Verify" },
  ];
  return (
    <div className="flex gap-2 text-xs">
      {items.map((it) => (
        <div
          key={it.key}
          className={`rounded px-2 py-1 ${it.key === current ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

function AccountForm({
  initial,
  onNext,
}: {
  initial: AccountValues | null;
  onNext: (v: AccountValues) => void;
}) {
  const { register, handleSubmit, formState } = useForm<AccountValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: initial ?? undefined,
  });
  const onSubmit = handleSubmit((v) => onNext(v));
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <FormField label="First name" htmlFor="first" error={formState.errors.firstName?.message}>
        <Input id="first" {...register("firstName")} />
      </FormField>
      <FormField label="Last name" htmlFor="last" error={formState.errors.lastName?.message}>
        <Input id="last" {...register("lastName")} />
      </FormField>
      <FormField label="Other name (optional)" htmlFor="other" error={formState.errors.otherName?.message}>
        <Input id="other" {...register("otherName")} />
      </FormField>
      <FormField label="Phone (optional)" htmlFor="phone" error={formState.errors.phone?.message}>
        <Input id="phone" type="tel" {...register("phone")} />
      </FormField>
      <FormField label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" {...register("email")} />
      </FormField>
      <span />
      <FormField label="Password" htmlFor="pw" error={formState.errors.password?.message}>
        <PasswordInput id="pw" autoComplete="new-password" {...register("password")} />
      </FormField>
      <FormField label="Confirm password" htmlFor="cpw" error={formState.errors.confirmPassword?.message}>
        <PasswordInput id="cpw" autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <div className="col-span-2 flex justify-end">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function CompanyForm({
  initial,
  onBack,
  onSubmit,
  pending,
  error,
}: {
  initial: CompanyValues | null;
  onBack: () => void;
  onSubmit: (v: CompanyValues) => void | Promise<void>;
  pending: boolean;
  error: string | null;
}) {
  const { register, handleSubmit, formState, watch, setError, clearErrors, setValue } = useForm<CompanyValues>({
    resolver: zodResolver(CompanySchema),
    defaultValues: initial ?? undefined,
  });
  const slug = watch("slug");
  const country = watch("country");
  const [slugStatus, setSlugStatus] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  useEffect(() => {
    setSlugStatus(null);
  }, [slug]);

  async function checkSlug() {
    if (!slug || slug.length < 3) {
      setSlugStatus(null);
      return;
    }
    setIsCheckingSlug(true);
    const res = await apiGet<{ available: boolean; reason?: string }>(
      `/api/platform/slugs/check?slug=${encodeURIComponent(slug)}`
    );
    setIsCheckingSlug(false);
    if (!res.data) return;
    if (res.data.available) {
      setSlugStatus("Available.");
      clearErrors("slug");
    } else {
      setSlugStatus(`Unavailable (${res.data.reason ?? "taken"}).`);
      setError("slug", { type: "manual", message: `Unavailable (${res.data.reason ?? "taken"}).` });
    }
  }

  const submit = handleSubmit((v) => onSubmit(v));

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <FormField label="Company name" htmlFor="cname" error={formState.errors.name?.message}>
        <Input id="cname" {...register("name")} />
      </FormField>
      <FormField label="Slug (subdomain)" htmlFor="slug" error={formState.errors.slug?.message ?? slugStatus ?? undefined}>
        <Input id="slug" placeholder="acme" {...register("slug")} onBlur={checkSlug} />
      </FormField>
      <FormField label="Company email" htmlFor="cemail" error={formState.errors.companyEmail?.message}>
        <Input id="cemail" type="email" {...register("companyEmail")} />
      </FormField>
      <FormField label="Company phone" htmlFor="cphone" error={formState.errors.companyPhone?.message}>
        <Input id="cphone" type="tel" {...register("companyPhone")} />
      </FormField>
      <FormField label="Website" htmlFor="web" error={formState.errors.website?.message}>
        <Input id="web" {...register("website")} />
      </FormField>
      <span />
      <FormField label="Address line 1" htmlFor="a1" error={formState.errors.addressLine1?.message}>
        <Input id="a1" {...register("addressLine1")} />
      </FormField>
      <FormField label="Address line 2" htmlFor="a2" error={formState.errors.addressLine2?.message}>
        <Input id="a2" {...register("addressLine2")} />
      </FormField>
      <FormField label="City" htmlFor="city" error={formState.errors.city?.message}>
        <Input id="city" {...register("city")} />
      </FormField>
      <FormField label="Region / State" htmlFor="reg" error={formState.errors.region?.message}>
        <Input id="reg" {...register("region")} />
      </FormField>
      <FormField label="Postal code" htmlFor="pc" error={formState.errors.postalCode?.message}>
        <Input id="pc" {...register("postalCode")} />
      </FormField>
      <FormField label="Country" htmlFor="ctry" error={formState.errors.country?.message}>
        <CountrySelect 
          value={country} 
          onChange={(val) => setValue("country", val, { shouldValidate: true })} 
        />
      </FormField>
      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      <div className="col-span-2 flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button type="submit" disabled={pending || isCheckingSlug || slugStatus !== "Available."}>
          {pending ? "Submitting..." : "Submit workspace"}
        </Button>
      </div>
    </form>
  );
}

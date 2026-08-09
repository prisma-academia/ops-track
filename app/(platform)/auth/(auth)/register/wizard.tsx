"use client";

/* eslint-disable react-hooks/incompatible-library */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { apiPost, apiGet } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const AccountSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    otherName: z.string().max(100).optional().or(z.literal("")),
    phone: z.string().max(40).optional().or(z.literal("")),
    email: z.email("Invalid email address"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(12, "Password must be at least 12 characters"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const CompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens only."),
  companyEmail: z.email("Invalid email address").optional().or(z.literal("")),
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

/* ------------------------------------------------------------------ */
/*  Step Metadata                                                      */
/* ------------------------------------------------------------------ */

const STEP_META: Record<
  Step,
  { num: number; category: string; title: string; description: string }
> = {
  account: {
    num: 1,
    category: "INTRODUCTION",
    title: "What should we call you?",
    description: "Enter your personal details and set your password.",
  },
  company: {
    num: 2,
    category: "WORKSPACE SETUP",
    title: "Tell us about your company",
    description: "Set up your organization and custom workspace domain.",
  },
  otp: {
    num: 3,
    category: "SECURITY VERIFICATION",
    title: "Verify your email address",
    description: "Enter the 6-digit verification code sent to your email.",
  },
};

/* ------------------------------------------------------------------ */
/*  Circular Stepper Indicator Component                               */
/* ------------------------------------------------------------------ */

function StepIndicator({ step, total = 3 }: { step: number; total?: number }) {
  const size = 48;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (step / total) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth={stroke}
        />
        {/* Arc Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-foreground transition-all duration-500 ease-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
        />
      </svg>
      <span className="absolute text-xs font-bold tracking-tight text-card-foreground">
        {String(step).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wizard Component                                             */
/* ------------------------------------------------------------------ */

export function RegisterWizard() {
  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState<AccountValues | null>(null);
  const [company, setCompany] = useState<CompanyValues | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const meta = STEP_META[step];

  return (
    <Card className="w-full max-w-full px-6 py-8 sm:p-12 relative gap-6 border shadow-sm">
      {/* Header with circular progress stepper */}
      <CardHeader className="p-0 gap-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {meta.category}
            </span>
            <CardTitle className="text-2xl font-bold text-card-foreground tracking-tight">
              {meta.title}
            </CardTitle>
          </div>
          <StepIndicator step={meta.num} total={3} />
        </div>
        <CardDescription className="text-sm text-muted-foreground font-normal mt-2">
          {meta.description}
        </CardDescription>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-0 mt-4">
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
              setPending(true);
              const res = await apiPost("/api/auth/register/start", {
                ...account,
                ...v,
              });
              setPending(false);
              if (res.error) {
                toast.error(res.error.message);
                return;
              }
              setCompany(v);
              toast.success("We emailed a 6-digit code. Please check your inbox.");
              setResendTimer(30);
              setStep("otp");
            }}
            pending={pending}
          />
        ) : null}

        {step === "otp" ? (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit verification code sent to your email address.
            </p>

            <FormField label="Verification code" htmlFor="code">
              <div className="flex justify-center my-2">
                <InputOTP
                  placeholder="."
                  maxLength={6}
                  value={code}
                  onChange={(val) => setCode(val)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot className="w-11 h-11 text-lg" index={0} />
                    <InputOTPSlot className="w-11 h-11 text-lg" index={1} />
                    <InputOTPSlot className="w-11 h-11 text-lg" index={2} />
                    <InputOTPSlot className="w-11 h-11 text-lg" index={3} />
                    <InputOTPSlot className="w-11 h-11 text-lg" index={4} />
                    <InputOTPSlot className="w-11 h-11 text-lg" index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </FormField>

            <div className="flex flex-col gap-3 items-center">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline disabled:no-underline disabled:opacity-50 transition-colors cursor-pointer"
                disabled={pending || isResending || resendTimer > 0}
                onClick={async () => {
                  if (!account || !company) return;
                  setIsResending(true);
                  const res = await apiPost("/api/auth/register/start", {
                    ...account,
                    ...company,
                  });
                  setIsResending(false);
                  if (res.error) {
                    toast.error(res.error.message);
                  } else {
                    toast.success("A new 6-digit verification code has been sent.");
                    setResendTimer(30);
                  }
                }}
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : isResending
                  ? "Resending..."
                  : "Didn't get code? Resend"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("company")}
                disabled={pending}
                className="gap-2 h-10 px-5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                type="button"
                disabled={pending || !/^\d{6}$/.test(code)}
                onClick={async () => {
                  if (!account || !company) return;
                  setPending(true);
                  const res = await apiPost<{ redirectUrl: string }>(
                    "/api/auth/register/verify",
                    { ...account, ...company, code }
                  );
                  setPending(false);
                  if (res.error) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Workspace verified successfully! Redirecting...");
                  if (res.data?.redirectUrl) {
                    window.location.assign(res.data.redirectUrl);
                  }
                }}
                className="gap-2 h-10 px-6 cursor-pointer"
              >
                {pending ? "Verifying…" : "Verify & Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Account Step Form                                                 */
/* ------------------------------------------------------------------ */

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
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="First name"
            htmlFor="firstName"
            required
            error={formState.errors.firstName?.message}
          >
            <Input
              id="firstName"
              placeholder="First name"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("firstName")}
            />
          </FormField>
          <FormField
            label="Last name"
            htmlFor="lastName"
            required
            error={formState.errors.lastName?.message}
          >
            <Input
              id="lastName"
              placeholder="Last name"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("lastName")}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Other name (optional)"
            htmlFor="otherName"
            error={formState.errors.otherName?.message}
          >
            <Input
              id="otherName"
              placeholder="Other name"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("otherName")}
            />
          </FormField>
          <FormField
            label="Phone (optional)"
            htmlFor="phone"
            error={formState.errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("phone")}
            />
          </FormField>
        </div>

        <FormField
          label="Email address"
          htmlFor="email"
          required
          error={formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            autoComplete="email"
            className="dark:bg-background h-10 shadow-xs rounded-lg"
            {...register("email")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Password"
            htmlFor="password"
            required
            error={formState.errors.password?.message}
          >
            <PasswordInput
              id="password"
              placeholder="At least 12 characters"
              autoComplete="new-password"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("password")}
            />
          </FormField>
          <FormField
            label="Confirm password"
            htmlFor="confirmPassword"
            required
            error={formState.errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("confirmPassword")}
            />
          </FormField>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t">
          <Link href="/auth/login">
            <Button
              type="button"
              variant="outline"
              className="gap-2 h-10 px-5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>

          <Button
            type="submit"
            className="gap-2 h-10 px-6 cursor-pointer"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Company Step Form                                                 */
/* ------------------------------------------------------------------ */

function CompanyForm({
  initial,
  onBack,
  onSubmit,
  pending,
}: {
  initial: CompanyValues | null;
  onBack: () => void;
  onSubmit: (v: CompanyValues) => void | Promise<void>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState,
    watch,
    setError,
    clearErrors,
    setValue,
  } = useForm<CompanyValues>({
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
      const msg = `Unavailable (${res.data.reason ?? "taken"}).`;
      setSlugStatus(msg);
      toast.error(`Domain slug ${msg}`);
      setError("slug", {
        type: "manual",
        message: msg,
      });
    }
  }

  const submit = handleSubmit((v) => onSubmit(v));

  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-4">
        <FormField
          label="Company name"
          htmlFor="name"
          required
          error={formState.errors.name?.message}
        >
          <Input
            id="name"
            placeholder="Acme Corp"
            className="dark:bg-background h-10 shadow-xs rounded-lg"
            {...register("name")}
          />
        </FormField>

        <FormField
          label="Workspace subdomain (Slug)"
          htmlFor="slug"
          required
          error={
            formState.errors.slug?.message ??
            (slugStatus && slugStatus !== "Available." ? slugStatus : undefined)
          }
        >
          <div className="relative">
            <Input
              id="slug"
              placeholder="acme"
              className="dark:bg-background h-10 shadow-xs rounded-lg pr-24"
              {...register("slug")}
              onBlur={checkSlug}
            />
            {isCheckingSlug && (
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                Checking...
              </span>
            )}
            {!isCheckingSlug && slugStatus === "Available." && (
              <span className="absolute right-3 top-2.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Available
              </span>
            )}
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Company email"
            htmlFor="companyEmail"
            error={formState.errors.companyEmail?.message}
          >
            <Input
              id="companyEmail"
              type="email"
              placeholder="info@acme.com"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("companyEmail")}
            />
          </FormField>
          <FormField
            label="Company phone"
            htmlFor="companyPhone"
            error={formState.errors.companyPhone?.message}
          >
            <Input
              id="companyPhone"
              type="tel"
              placeholder="+234 800 000 0000"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("companyPhone")}
            />
          </FormField>
        </div>

        <FormField
          label="Website"
          htmlFor="website"
          error={formState.errors.website?.message}
        >
          <Input
            id="website"
            placeholder="https://acme.com"
            className="dark:bg-background h-10 shadow-xs rounded-lg"
            {...register("website")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Address line 1"
            htmlFor="addressLine1"
            error={formState.errors.addressLine1?.message}
          >
            <Input
              id="addressLine1"
              placeholder="123 Main St"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("addressLine1")}
            />
          </FormField>
          <FormField
            label="Address line 2"
            htmlFor="addressLine2"
            error={formState.errors.addressLine2?.message}
          >
            <Input
              id="addressLine2"
              placeholder="Suite 100"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("addressLine2")}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="City"
            htmlFor="city"
            error={formState.errors.city?.message}
          >
            <Input
              id="city"
              placeholder="Lagos"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("city")}
            />
          </FormField>
          <FormField
            label="Region / State"
            htmlFor="region"
            error={formState.errors.region?.message}
          >
            <Input
              id="region"
              placeholder="Lagos"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("region")}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Postal code"
            htmlFor="postalCode"
            error={formState.errors.postalCode?.message}
          >
            <Input
              id="postalCode"
              placeholder="100001"
              className="dark:bg-background h-10 shadow-xs rounded-lg"
              {...register("postalCode")}
            />
          </FormField>
          <FormField
            label="Country"
            htmlFor="country"
            error={formState.errors.country?.message}
          >
            <CountrySelect
              value={country}
              onChange={(val) =>
                setValue("country", val, { shouldValidate: true })
              }
            />
          </FormField>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={pending}
            className="gap-2 h-10 px-5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            type="submit"
            disabled={
              pending || isCheckingSlug || (!!slug && slugStatus !== "Available.")
            }
            className="gap-2 h-10 px-6 cursor-pointer"
          >
            {pending ? "Submitting..." : "Submit workspace"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

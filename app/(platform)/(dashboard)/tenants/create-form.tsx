"use client";

/* eslint-disable react-hooks/incompatible-library */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ShieldCheck,
  Sparkles,
  Building2,
  UserCheck,
  Sliders,
} from "lucide-react";
import { apiPost, apiGet } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CountrySelect } from "@/components/ui/country-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
    mustChangePassword: z.boolean(),
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
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  enableTrial: z.boolean(),
  trialDays: z.number().int().min(0).max(365),
  activeModules: z.array(z.string()),
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
    category: "STEP 1: OWNER ACCOUNT",
    title: "Owner Credentials & Login Details",
    description: "Enter personal credentials and set the initial login password for the workspace owner.",
  },
  company: {
    num: 2,
    category: "STEP 2: WORKSPACE SETUP",
    title: "Organization & Workspace Configuration",
    description: "Configure company details, workspace subdomain, status, trial lifecycle, and active modules.",
  },
  otp: {
    num: 3,
    category: "STEP 3: SECURITY VERIFICATION",
    title: "Verify & Activate Tenant",
    description: "Review admin OTP access and complete instant verification to activate this workspace.",
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth={stroke}
        />
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
/*  Main CreateTenantForm Stepper Component                            */
/* ------------------------------------------------------------------ */

export function CreateTenantForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState<AccountValues | null>(null);
  const [company, setCompany] = useState<CompanyValues | null>(null);
  const [adminOtpCode, setAdminOtpCode] = useState<string | null>(null);
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
    <Card className="w-full max-w-full px-6 py-8 sm:p-10 relative gap-6 border shadow-sm">
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
      <CardContent className="p-0 mt-6">
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
              const res = await apiPost<{ otpSent: boolean; otpCode?: string }>(
                "/api/platform/tenants/register/start",
                {
                  ...account,
                  ...v,
                }
              );
              setPending(false);
              if (res.error) {
                toast.error(res.error.message);
                return;
              }
              setCompany(v);
              if (res.data?.otpCode) {
                setAdminOtpCode(res.data.otpCode);
              }
              toast.success("Verification code issued! Check code below or owner email.");
              setResendTimer(30);
              setStep("otp");
            }}
            pending={pending}
          />
        ) : null}

        {step === "otp" ? (
          <div className="flex flex-col gap-6">
            {/* Admin Visible OTP Callout Banner */}
            {adminOtpCode ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/10 p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Platform Admin Verification Code</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                  >
                    Active Code
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  An email with this 6-digit OTP was dispatched to{" "}
                  <strong className="text-foreground font-medium">{account?.email}</strong>.
                  As a platform administrator, you can view and use the code below to immediately activate this tenant workspace.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-500/20">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-muted-foreground">Code:</span>
                    <span className="text-xl font-mono font-bold tracking-widest text-foreground px-3 py-1 rounded-md bg-background border border-border select-all">
                      {adminOtpCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                      onClick={() => {
                        setCode(adminOtpCode);
                        toast.success("OTP code auto-filled!");
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-fill OTP
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                      onClick={async () => {
                        await navigator.clipboard.writeText(adminOtpCode);
                        toast.success("Copied code to clipboard!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Enter the 6-digit verification code to activate this tenant.
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
                  const res = await apiPost<{ otpSent: boolean; otpCode?: string }>(
                    "/api/platform/tenants/register/start",
                    {
                      ...account,
                      ...company,
                    }
                  );
                  setIsResending(false);
                  if (res.error) {
                    toast.error(res.error.message);
                  } else {
                    if (res.data?.otpCode) {
                      setAdminOtpCode(res.data.otpCode);
                    }
                    toast.success("A new 6-digit verification code has been generated.");
                    setResendTimer(30);
                  }
                }}
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : isResending
                  ? "Generating code..."
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
                  const res = await apiPost<{
                    tenant: { id: string };
                    redirectUrl: string;
                  }>("/api/platform/tenants/register/verify", {
                    ...account,
                    ...company,
                    code,
                  });
                  setPending(false);
                  if (res.error) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success(`Workspace "${company.name}" verified and activated successfully!`);
                  if (res.data?.redirectUrl) {
                    router.push(res.data.redirectUrl);
                  } else if (res.data?.tenant?.id) {
                    router.push(`/tenants/${res.data.tenant.id}`);
                  } else {
                    router.push("/tenants");
                  }
                }}
                className="gap-2 h-10 px-6 cursor-pointer"
              >
                {pending ? "Activating…" : "Verify & Activate Tenant"}
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
/*  Step 1: Account Step Form                                         */
/* ------------------------------------------------------------------ */

function AccountForm({
  initial,
  onNext,
}: {
  initial: AccountValues | null;
  onNext: (v: AccountValues) => void;
}) {
  const { register, handleSubmit, formState, watch, setValue } = useForm<AccountValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: initial ?? {
      firstName: "",
      lastName: "",
      otherName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      mustChangePassword: false,
    },
  });

  const mustChangePassword = watch("mustChangePassword");
  const onSubmit = handleSubmit((v) => onNext(v));

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" />
          <span>Owner Personal Information</span>
        </div>

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
          label="Owner email address"
          htmlFor="email"
          required
          error={formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="owner@example.com"
            autoComplete="email"
            className="dark:bg-background h-10 shadow-xs rounded-lg"
            {...register("email")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Initial password"
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

        {/* Password Policy Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40 mt-1">
          <Checkbox
            id="mustChangePassword"
            checked={mustChangePassword}
            onCheckedChange={(checked) => setValue("mustChangePassword", !!checked)}
          />
          <label
            htmlFor="mustChangePassword"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            Require owner to change password on first login
          </label>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t">
          <Link href="/tenants">
            <Button
              type="button"
              variant="outline"
              className="gap-2 h-10 px-5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            className="gap-2 h-10 px-6 cursor-pointer"
          >
            Continue to Workspace Setup
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Company & Platform Configuration Step Form                */
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
    defaultValues: initial ?? {
      name: "",
      slug: "",
      companyEmail: "",
      companyPhone: "",
      website: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      status: "ACTIVE",
      enableTrial: true,
      trialDays: 14,
      activeModules: ["FLEET", "STATION"],
    },
  });

  const slug = watch("slug");
  const country = watch("country");
  const status = watch("status");
  const enableTrial = watch("enableTrial");
  const activeModules = watch("activeModules") || [];

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

  function toggleModule(mod: string) {
    if (activeModules.includes(mod)) {
      if (activeModules.length === 1) {
        toast.error("At least one module must be selected.");
        return;
      }
      setValue(
        "activeModules",
        activeModules.filter((m) => m !== mod),
        { shouldValidate: true }
      );
    } else {
      setValue("activeModules", [...activeModules, mod], { shouldValidate: true });
    }
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>Organization Profile</span>
        </div>

        <FormField
          label="Company name"
          htmlFor="name"
          required
          error={formState.errors.name?.message}
        >
          <Input
            id="name"
            placeholder="Acme Logistics Corp"
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
              placeholder="123 Commercial Ave"
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
              placeholder="Floor 4, Suite 10"
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
              placeholder="Lagos State"
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

        {/* Platform Admin Controls */}
        <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/30 p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Platform Admin Controls</span>
            </div>
            <Badge variant="outline" className="text-[11px]">
              Admin Only
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status Control */}
            <FormField label="Initial workspace status" htmlFor="status">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValue("status", "ACTIVE")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    status === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${status === "ACTIVE" ? "opacity-100" : "opacity-0"}`} />
                  Active (Operational)
                </button>

                <button
                  type="button"
                  onClick={() => setValue("status", "SUSPENDED")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    status === "SUSPENDED"
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${status === "SUSPENDED" ? "opacity-100" : "opacity-0"}`} />
                  Suspended (Blocked)
                </button>
              </div>
            </FormField>

            {/* Trial Lifecycle */}
            <FormField label="Free trial lifecycle" htmlFor="enableTrial">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3 py-1">
                  <Checkbox
                    id="enableTrial"
                    checked={enableTrial}
                    onCheckedChange={(checked) => setValue("enableTrial", !!checked)}
                  />
                  <label
                    htmlFor="enableTrial"
                    className="text-xs font-medium text-foreground cursor-pointer select-none"
                  >
                    Enable free trial period
                  </label>
                </div>

                {enableTrial ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="trialDays"
                      type="number"
                      min={1}
                      max={365}
                      className="w-24 h-8 text-xs dark:bg-background"
                      {...register("trialDays", { valueAsNumber: true })}
                    />
                    <span className="text-xs text-muted-foreground">Days trial duration</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No trial period (requires manual activation / sub)</span>
                )}
              </div>
            </FormField>
          </div>

          {/* Active Modules */}
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-2">
              Active application modules
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => toggleModule("STATION")}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeModules.includes("STATION")
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <Checkbox
                  id="mod-station"
                  checked={activeModules.includes("STATION")}
                  onCheckedChange={() => toggleModule("STATION")}
                />
                <div>
                  <div className="text-xs font-medium">Station Management</div>
                  <div className="text-[11px] text-muted-foreground">Pumps, tanks, sales logs, shift tracking</div>
                </div>
              </div>

              <div
                onClick={() => toggleModule("FLEET")}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeModules.includes("FLEET")
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <Checkbox
                  id="mod-fleet"
                  checked={activeModules.includes("FLEET")}
                  onCheckedChange={() => toggleModule("FLEET")}
                />
                <div>
                  <div className="text-xs font-medium">Fleet Logistics</div>
                  <div className="text-[11px] text-muted-foreground">Trucks, drivers, waybills, transport orders</div>
                </div>
              </div>
            </div>
          </div>
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
            Back to Owner Credentials
          </Button>

          <Button
            type="submit"
            disabled={
              pending || isCheckingSlug || (!!slug && slugStatus !== "Available.")
            }
            className="gap-2 h-10 px-6 cursor-pointer"
          >
            {pending ? "Issuing code..." : "Proceed to Verification"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

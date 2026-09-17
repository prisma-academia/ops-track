"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiPost, apiPatch } from "@/lib/client/api";
import { CheckCircle2, AlertCircle, Building2, CheckIcon, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  scope: z.enum(["STATION", "FLEET"]),
  accountName: z.string().min(2, "Account Name is required"),
  accountNumber: z.string().min(2, "Account Number is required"),
  bankName: z.string().min(2, "Bank Name is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface BankAccountFormModalProps {
  tenantSlug?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: (Partial<FormValues> & { id?: string }) | null;
  fixedScope?: "STATION" | "FLEET";
  hasTransactions?: boolean;
}

export function BankAccountFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  fixedScope,
  hasTransactions = false,
}: BankAccountFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [openBankSelect, setOpenBankSelect] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scope: initialData?.scope || fixedScope || "STATION",
      accountName: initialData?.accountName || "",
      accountNumber: initialData?.accountNumber || "",
      bankName: initialData?.bankName || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const accountName = watch("accountName");
  const accountNumber = watch("accountNumber");
  const bankName = watch("bankName");
  const isActive = watch("isActive");

  useEffect(() => {
    if (isOpen) {
      reset({
        scope: initialData?.scope || fixedScope || "STATION",
        accountName: initialData?.accountName || "",
        accountNumber: initialData?.accountNumber || "",
        bankName: initialData?.bankName || "",
        isActive: initialData?.isActive ?? true,
      });
      setIsVerified(!!initialData?.accountName);
      setVerificationError(null);
      setIsManualEntry(false);
      setSelectedBankCode("");
    }
  }, [isOpen, initialData, fixedScope, reset]);

  // Fetch Banks
  useEffect(() => {
    if (isOpen && banks.length === 0) {
      setIsFetchingBanks(true);
      fetch('/api/tenant/paystack/banks')
        .then(res => res.json())
        .then(res => {
          if (res?.data) {
            setBanks(res.data);
            if (initialData?.bankName) {
              const b = res.data.find((x: { name: string; code: string }) => x.name.toLowerCase() === initialData.bankName?.toLowerCase());
              if (b) setSelectedBankCode(b.code);
            }
          }
        })
        .catch(e => console.error("Failed to fetch banks", e))
        .finally(() => setIsFetchingBanks(false));
    }
  }, [isOpen, banks.length, initialData]);

  // Match bank code if banks already loaded and editing
  useEffect(() => {
    if (isOpen && initialData?.bankName && banks.length > 0 && !selectedBankCode) {
      const b = banks.find((x) => x.name.toLowerCase() === initialData.bankName?.toLowerCase());
      if (b) setSelectedBankCode(b.code);
    }
  }, [isOpen, initialData, banks, selectedBankCode]);

  // Debounced Verification
  useEffect(() => {
    if (!isOpen || hasTransactions || isVerified || isManualEntry) return;
    if (accountNumber?.length === 10 && selectedBankCode) {
      const timer = setTimeout(() => {
        verifyAccount(accountNumber, selectedBankCode);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [accountNumber, selectedBankCode, isOpen, hasTransactions, isVerified, isManualEntry]);

  const verifyAccount = async (accNum: string, bCode: string) => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await fetch(`/api/tenant/paystack/verify?account_number=${encodeURIComponent(accNum)}&bank_code=${encodeURIComponent(bCode)}`);
      const data = await res.json();
      if (data?.data?.account_name) {
        setValue("accountName", data.data.account_name, { shouldValidate: true });
        setIsVerified(true);
        setVerificationError(null);
        toast.success(`Account verified: ${data.data.account_name}`);
      } else {
        setValue("accountName", "");
        setIsVerified(false);
        const errMsg = data?.error?.message || "Could not verify account details with bank";
        setVerificationError(errMsg);
        toast.error(errMsg);
      }
    } catch {
      setValue("accountName", "");
      setIsVerified(false);
      setVerificationError("Failed to connect to verification service");
      toast.error("Failed to connect to verification service");
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        const payload = hasTransactions
          ? { ...data, accountNumber: initialData.accountNumber }
          : data;
        const res = await apiPatch(`/api/tenant/bank-accounts/${initialData.id}`, payload);
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await apiPost(`/api/tenant/bank-accounts`, data);
        if (res.error) throw new Error(res.error.message);
      }

      toast.success(initialData ? "Bank account updated" : "Bank account created");
      onSuccess();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        reset();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Scope (Only if not fixed by context) */}
          {!fixedScope && !initialData && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select 
                value={watch("scope")} 
                onValueChange={(value: "STATION" | "FLEET") => setValue("scope", value, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STATION">Station</SelectItem>
                  <SelectItem value="FLEET">Fleet</SelectItem>
                </SelectContent>
              </Select>
              {errors.scope && <p className="text-sm text-red-500">{errors.scope.message}</p>}
            </div>
          )}

          {/* 1. Bank Name Selection */}
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Popover open={openBankSelect} onOpenChange={setOpenBankSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openBankSelect}
                  className="w-full justify-between h-10 font-normal"
                  disabled={hasTransactions}
                >
                  {isFetchingBanks ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading banks...
                    </span>
                  ) : bankName ? (
                    <span className="font-medium text-foreground">{bankName}</span>
                  ) : (
                    <span className="text-muted-foreground">Select bank...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search bank..." />
                  <CommandList>
                    <CommandEmpty>No bank found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {banks.map((bank) => (
                        <CommandItem
                          key={bank.code}
                          value={bank.name}
                          onSelect={() => {
                            setValue("bankName", bank.name, { shouldValidate: true });
                            setSelectedBankCode(bank.code);
                            setIsVerified(false);
                            setVerificationError(null);
                            if (!isManualEntry) {
                              setValue("accountName", "");
                            }
                            setOpenBankSelect(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBankCode === bank.code ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {bank.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.bankName && <p className="text-sm text-red-500">{errors.bankName.message}</p>}
          </div>

          {/* 2. Account Number Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Account Number</Label>
              {hasTransactions && (
                <span className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">
                  Locked (has transactions)
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                {...register("accountNumber")}
                maxLength={10}
                placeholder="e.g. 0123456789"
                disabled={hasTransactions}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setValue("accountNumber", cleaned, { shouldValidate: true });
                  if (isVerified) {
                    setIsVerified(false);
                    setValue("accountName", "");
                  }
                  if (verificationError) setVerificationError(null);
                }}
                className={cn(
                  "font-mono tracking-wider",
                  hasTransactions && "bg-muted cursor-not-allowed opacity-80"
                )}
              />
              {isVerifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {hasTransactions ? (
              <p className="text-[11px] text-muted-foreground">
                Account number cannot be changed because this account has transaction records.
              </p>
            ) : errors.accountNumber ? (
              <p className="text-sm text-red-500">{errors.accountNumber.message}</p>
            ) : null}
          </div>

          {/* 3. Account Name - Alert-like box with Check icon (not an input) */}
          <div className="space-y-1.5">
            <Label>Account Name</Label>
            
            {isVerifying ? (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                    Verifying account name...
                  </p>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    Checking account details with NIBSS database
                  </p>
                </div>
              </div>
            ) : (isVerified && accountName) || (initialData?.accountName && accountName && !isManualEntry) ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="mt-0.5 rounded-full bg-emerald-100 p-0.5 dark:bg-emerald-900/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Verified Account Name
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 px-1.5 text-[10px] font-medium border-emerald-300 text-emerald-700 bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/30"
                    >
                      NIBSS Verified
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-foreground break-words">
                    {accountName}
                  </p>
                </div>
              </div>
            ) : verificationError ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 dark:border-red-900/40 dark:bg-red-950/20">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold text-red-900 dark:text-red-200">
                      Verification Failed
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {verificationError}
                    </p>
                    {!isManualEntry && (
                      <button
                        type="button"
                        onClick={() => setIsManualEntry(true)}
                        className="text-xs font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
                      >
                        Enter account name manually instead
                      </button>
                    )}
                  </div>
                </div>
                {isManualEntry && (
                  <Input
                    {...register("accountName")}
                    placeholder="e.g. Acme Station Account"
                    className="mt-1"
                  />
                )}
              </div>
            ) : isManualEntry ? (
              <div className="space-y-2">
                <Input
                  {...register("accountName")}
                  placeholder="e.g. Acme Station Account"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEntry(false);
                    if (accountNumber?.length === 10 && selectedBankCode) {
                      verifyAccount(accountNumber, selectedBankCode);
                    }
                  }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Re-enable automatic verification
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-muted-foreground">
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {!bankName
                      ? "Select a bank above to begin verification."
                      : (accountNumber?.length ?? 0) < 10
                      ? `Enter 10-digit account number (${accountNumber?.length ?? 0}/10)`
                      : "Resolving account name..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualEntry(true)}
                  className="text-[11px] text-muted-foreground underline hover:text-foreground shrink-0 ml-2"
                >
                  Enter manually
                </button>
              </div>
            )}
            {errors.accountName && (
              <p className="text-sm text-red-500">{errors.accountName.message}</p>
            )}
          </div>

          {/* 4. Boxed Active Status with Switch */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                  Account Status
                </Label>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5",
                    isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isActive
                  ? "This account is active and available for payment selections."
                  : "This account is inactive and hidden from active payment choices."}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked, { shouldValidate: true })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isVerifying}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


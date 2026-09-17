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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { apiPost, apiPatch } from "@/lib/client/api";
import { CheckIcon, ChevronsUpDown, Loader2 } from "lucide-react";
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
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [openBankSelect, setOpenBankSelect] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

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
            // If editing, try to find the matching bank code
            if (initialData?.bankName) {
              const b = res.data.find((x: any) => x.name === initialData.bankName);
              if (b) setSelectedBankCode(b.code);
            }
          }
        })
        .catch(e => console.error("Failed to fetch banks", e))
        .finally(() => setIsFetchingBanks(false));
    }
  }, [isOpen, banks.length, initialData]);

  const accountNumber = watch("accountNumber");
  const bankName = watch("bankName");

  // Debounced Verification
  useEffect(() => {
    if (!isOpen || hasTransactions || isVerified) return;
    if (accountNumber?.length === 10 && selectedBankCode) {
      const timer = setTimeout(() => {
        verifyAccount(accountNumber, selectedBankCode, bankName);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [accountNumber, selectedBankCode, isOpen, hasTransactions, isVerified]);

  const verifyAccount = async (accNum: string, bCode: string, bName: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/tenant/paystack/verify?account_number=${encodeURIComponent(accNum)}&bank_code=${encodeURIComponent(bCode)}`);
      const data = await res.json();
      if (data?.data?.account_name) {
        setValue("accountName", data.data.account_name);
        setIsVerified(true);
        toast.success(`Account verified: ${data.data.account_name}`, { icon: <CheckIcon className="h-4 w-4 text-green-500" /> });
      } else {
        toast.error(data.error?.message || "Could not verify account details");
      }
    } catch (e) {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select 
              value={watch("scope")} 
              onValueChange={(value: "STATION" | "FLEET") => setValue("scope", value)}
              disabled={!!fixedScope || !!initialData}
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

          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Popover open={openBankSelect} onOpenChange={setOpenBankSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openBankSelect}
                  className="w-full justify-between"
                  disabled={hasTransactions}
                >
                  {isFetchingBanks ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading banks...</span>
                  ) : bankName ? (
                    bankName
                  ) : (
                    "Select bank..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search bank..." />
                  <CommandList>
                    <CommandEmpty>No bank found.</CommandEmpty>
                    <CommandGroup>
                      {banks.map((bank) => (
                        <CommandItem
                          key={bank.code}
                          value={bank.name}
                          onSelect={(currentValue) => {
                            setValue("bankName", bank.name, { shouldValidate: true });
                            setSelectedBankCode(bank.code);
                            setIsVerified(false); // require re-verification
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

          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input 
              {...register("accountName")} 
              placeholder="e.g. Acme Station Account" 
              readOnly={isVerified}
              className={isVerified ? "bg-muted cursor-not-allowed opacity-90" : ""}
            />
            {isVerified && <p className="text-xs text-green-600">Verified securely via Paystack NIBSS.</p>}
            {errors.accountName && <p className="text-sm text-red-500">{errors.accountName.message}</p>}
          </div>

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
                placeholder="e.g. 1012345678"
                disabled={hasTransactions}
                onChange={(e) => {
                  setValue("accountNumber", e.target.value, { shouldValidate: true });
                  if (isVerified) setIsVerified(false);
                }}
                className={hasTransactions ? "bg-muted cursor-not-allowed opacity-80" : ""}
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

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="isActive" 
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked === true)} 
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

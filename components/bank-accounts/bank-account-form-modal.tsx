"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const formSchema = z.object({
  scope: z.enum(["STATION", "FLEET"]),
  accountName: z.string().min(2, "Account Name is required"),
  accountNumber: z.string().min(2, "Account Number is required"),
  bankName: z.string().min(2, "Bank Name is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface BankAccountFormModalProps {
  tenantSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // The bank account to edit
  fixedScope?: "STATION" | "FLEET";
}

export function BankAccountFormModal({
  tenantSlug,
  isOpen,
  onClose,
  onSuccess,
  initialData,
  fixedScope,
}: BankAccountFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        const res = await apiPatch(`/api/tenant/bank-accounts/${initialData.id}`, data);
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await apiPost(`/api/tenant/bank-accounts`, data);
        if (res.error) throw new Error(res.error.message);
      }

      toast.success(initialData ? "Bank account updated" : "Bank account created");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
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
          {!fixedScope && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select 
                value={watch("scope")} 
                onValueChange={(value: "STATION" | "FLEET") => setValue("scope", value)}
              >
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input {...register("bankName")} placeholder="e.g. Zenith Bank" />
            {errors.bankName && <p className="text-sm text-red-500">{errors.bankName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input {...register("accountName")} placeholder="e.g. Acme Station Account" />
            {errors.accountName && <p className="text-sm text-red-500">{errors.accountName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input {...register("accountNumber")} placeholder="e.g. 1012345678" />
            {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber.message}</p>}
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

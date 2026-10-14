"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { ArrowLeft, ChevronsUpDown, Save } from "lucide-react";
import {
  FieldIcon,
  IconSelectItems,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
} from "@/components/fleet/payments/payment-method-options";
import { PaymentConfirmDialog } from "@/components/fleet/payments/payment-dialogs";
import { apiPost } from "@/lib/client/api";
import { useFileUpload } from "@/hooks/use-file-upload";

function inferPaymentType(order: any | null, amount: string) {
  if (!order) return "ADVANCE_DEPOSIT";
  const outstanding = Number(order.balance || 0);
  const alreadyPaid = Number(order.paymentPaid || 0);
  const amt = Number(amount);
  if (amt > 0 && amt < outstanding) return "PART_PAYMENT";
  if (alreadyPaid > 0) return "DEBT_CLEARANCE";
  return "FULL_SETTLEMENT";
}

export default function SupplierOutgoingPaymentForm({
  metadata,
  loading,
  initialSupplierId = "",
  initialOrderId = "",
}: {
  metadata: any;
  loading: boolean;
  initialSupplierId?: string;
  initialOrderId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: initialSupplierId,
    orderId: initialOrderId || "none",
    amount: "",
    paymentType: "ADVANCE_DEPOSIT",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
    receiptUrl: "",
    bankAccountId: "",
    description: "",
  });

  useEffect(() => {
    if (initialSupplierId) {
      setFormData((p) => ({ ...p, supplierId: initialSupplierId }));
    }
    if (initialOrderId) {
      setFormData((p) => ({ ...p, orderId: initialOrderId }));
    }
  }, [initialSupplierId, initialOrderId]);

  const supplierOrders = (metadata?.orders || []).filter(
    (o: any) =>
      !formData.supplierId ||
      o.supplierId === formData.supplierId ||
      (metadata?.suppliers?.find((s: any) => s.id === formData.supplierId)?.name === o.supplier),
  );

  const selectedOrder =
    formData.orderId && formData.orderId !== "none"
      ? metadata?.orders?.find((o: any) => o.id === formData.orderId)
      : null;

  useEffect(() => {
    const nextType = inferPaymentType(selectedOrder ?? null, formData.amount);
    setFormData((prev) =>
      prev.paymentType === nextType ? prev : { ...prev, paymentType: nextType },
    );
  }, [formData.orderId, formData.amount, selectedOrder]);

  const maxSize = 5 * 1024 * 1024;
  const [{ files }, { getInputProps, openFileDialog, removeFile }] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf",
    maxSize,
    onFilesAdded: async (added) => {
      const file = added[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploading(true);
      try {
        const fileType =
          file.type ||
          (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png");
        const res = await apiPost<any>("/api/tenant/fleet/payments/upload", {
          contentType: fileType,
        });
        if (res.error || !res.data) return;
        let publicUrl = "";
        if (res.data.uploadType === "cloudinary") {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", res.data.apiKey);
          fd.append("timestamp", res.data.timestamp.toString());
          fd.append("signature", res.data.signature);
          const uploadRes = await fetch(res.data.url, { method: "POST", body: fd });
          if (!uploadRes.ok) return;
          publicUrl = (await uploadRes.json()).secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": fileType },
            body: file,
          });
          if (!put.ok) return;
          publicUrl = res.data.publicUrl;
        }
        setFormData((p) => ({ ...p, receiptUrl: publicUrl }));
      } finally {
        setUploading(false);
      }
    },
  });

  const selectedSupplier = metadata?.suppliers?.find(
    (s: any) => s.id === formData.supplierId,
  );
  const depositBalance = selectedSupplier
    ? Number(selectedSupplier.depositBalance || 0)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (selectedOrder && Number(formData.amount) > Number(selectedOrder.balance || 0)) {
      toast.error(
        `Amount cannot exceed remaining ₦${Number(selectedOrder.balance).toLocaleString()}`,
      );
      return;
    }
    if (
      formData.paymentMethod === "DEPOSIT" &&
      Number(formData.amount) > depositBalance
    ) {
      toast.error("Insufficient supplier deposit balance");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiPost("/api/tenant/fleet/payments/outflow/supplier", {
        supplierId: formData.supplierId,
        orderId: formData.orderId === "none" ? undefined : formData.orderId,
        amount: Number(formData.amount),
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        receiptUrl: formData.receiptUrl || undefined,
        description: formData.description || undefined,
        bankAccountId:
          formData.paymentMethod !== "CASH" && formData.paymentMethod !== "DEPOSIT"
            ? formData.bankAccountId
            : undefined,
      });
      if (!res.error) {
        toast.success("Supplier payment recorded");
        router.push("/admin/payments");
        return;
      }
      toast.error(res.error?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <SpinnerEllipsis />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href="/admin/payments">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Supplier Payment</h1>
          <p className="text-sm text-muted-foreground">Record payment to a product supplier</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                  {selectedSupplier?.name || "Select supplier..."}
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandList>
                    <CommandEmpty>No supplier found.</CommandEmpty>
                    <CommandGroup>
                      {(metadata?.suppliers || []).map((s: any) => (
                        <CommandItem
                          key={s.id}
                          value={s.name}
                          onSelect={() => {
                            setFormData((p) => ({
                              ...p,
                              supplierId: s.id,
                              orderId: "none",
                            }));
                            setSupplierOpen(false);
                          }}
                        >
                          {s.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Order (optional)</Label>
            <Popover open={orderOpen} onOpenChange={setOrderOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  disabled={!formData.supplierId}
                >
                  {selectedOrder
                    ? `${selectedOrder.reference || selectedOrder.id.slice(0, 8)} — ₦${Number(selectedOrder.balance).toLocaleString()} remaining`
                    : "Advance deposit / no order"}
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFormData((p) => ({ ...p, orderId: "none" }));
                          setOrderOpen(false);
                        }}
                      >
                        No specific order
                      </CommandItem>
                      {supplierOrders
                        .filter((o: any) => Number(o.balance) > 0)
                        .map((o: any) => (
                          <CommandItem
                            key={o.id}
                            value={o.reference || o.id}
                            onSelect={() => {
                              setFormData((p) => ({ ...p, orderId: o.id }));
                              setOrderOpen(false);
                            }}
                          >
                            {o.reference || o.id.slice(0, 8)} — {o.productType} — ₦
                            {Number(o.balance).toLocaleString()} due
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <FormattedNumberInput
                value={formData.amount}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, amount: e.target.value }))
                }
                max={formData.paymentMethod === "DEPOSIT" ? depositBalance : undefined}
              />
              {formData.paymentMethod === "DEPOSIT" && (
                <p className="text-xs text-muted-foreground">
                  Available deposit: ₦{depositBalance.toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.reference}
                onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FieldIcon icon={PAYMENT_TYPE_OPTIONS[0].icon} /> Payment type
              </Label>
              <Select
                value={formData.paymentType}
                onValueChange={(v) => setFormData((p) => ({ ...p, paymentType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <IconSelectItems options={PAYMENT_TYPE_OPTIONS} />
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(v) => setFormData((p) => ({ ...p, paymentMethod: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <IconSelectItems options={PAYMENT_METHOD_OPTIONS} />
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.paymentMethod !== "CASH" && formData.paymentMethod !== "DEPOSIT" && (
            <div className="space-y-2">
              <Label>Pay from bank account</Label>
              <Popover open={bankOpen} onOpenChange={setBankOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    {metadata?.bankAccounts?.find((b: any) => b.id === formData.bankAccountId)
                      ?.bankName || "Select account..."}
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {(metadata?.bankAccounts || []).map((b: any) => (
                          <CommandItem
                            key={b.id}
                            onSelect={() => {
                              setFormData((p) => ({ ...p, bankAccountId: b.id }));
                              setBankOpen(false);
                            }}
                          >
                            {b.bankName} — {b.accountNumber}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openFileDialog} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload receipt"}
              </Button>
              <input {...getInputProps()} className="sr-only" />
              {files[0] && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(files[0].id)}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            <Save className="size-4 mr-2" />
            Review payment
          </Button>
        </CardContent>
      </Card>

      <PaymentConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmedSubmit}
        confirming={submitting}
        tone="destructive"
        title="Confirm supplier payment"
        amountLabel={`₦${(Number(formData.amount) || 0).toLocaleString()}`}
        rows={[
          { label: "Supplier", value: selectedSupplier?.name || "—", emphasis: true },
          { label: "Type", value: formData.paymentType.replace(/_/g, " ") },
          { label: "Method", value: formData.paymentMethod.replace(/_/g, " ") },
          ...(selectedOrder
            ? [
                {
                  label: "Order",
                  value: selectedOrder.reference || selectedOrder.id.slice(0, 8),
                },
              ]
            : []),
        ]}
      />
    </form>
  );
}

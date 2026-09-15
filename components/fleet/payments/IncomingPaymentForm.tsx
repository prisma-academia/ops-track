"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import {
  Save,
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
  Loader2,
  ArrowLeft,
  ChevronsUpDown,
  FileText,
  ExternalLink,
  Eye,
} from "lucide-react";
import { FilePreviewTrigger } from "@/components/file-viewer-modal";
import { useFileUpload } from "@/hooks/use-file-upload";
import { apiPost } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PaymentConfirmDialog, type PaymentSummaryRow } from "@/components/fleet/payments/payment-dialogs";

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-b border-border/60 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right truncate max-w-[60%]", emphasis && "font-semibold")}>{value}</span>
    </div>
  );
}

function getSaleTransportFee(s: any) {
  if (!s) return 0;
  return s.transportCostBorneBy === "CLIENT" ? Number(s.transportCost || 0) : 0;
}

function getSaleTotalExpected(s: any) {
  if (!s) return 0;
  return Number(s.totalExpectedAmount || 0) + getSaleTransportFee(s);
}

function getSaleOutstanding(s: any) {
  if (!s) return 0;
  return getSaleTotalExpected(s) - Number(s.paymentReceived || 0);
}

function inferPaymentType(sale: any | null, amount: string) {
  if (!sale) return "ADVANCE_DEPOSIT";
  const outstanding = getSaleOutstanding(sale);
  const alreadyPaid = Number(sale.paymentReceived || 0);
  const amt = Number(amount);
  if (amt > 0 && amt < outstanding) return "PART_PAYMENT";
  if (alreadyPaid > 0) return "DEBT_CLEARANCE";
  return "FULL_SETTLEMENT";
}

export default function IncomingPaymentForm({ metadata, loading }: { metadata: any, loading: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const [saleOpen, setSaleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: "",
    saleId: "none",
    amount: "",
    paymentType: "ADVANCE_DEPOSIT",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
    receiptUrl: "",
    bankAccountId: "",
  });

  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const [
    { files, isDragging, errors: uploadErrors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadError(null);
      setUploading(true);
      try {
        const fileType =
          file.type ||
          (file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/png");
        const res = await apiPost<any>("/api/tenant/fleet/payments/upload", { contentType: fileType });
        if (res.error || !res.data) {
          setUploadError(res.error?.message ?? "Upload could not be started.");
          return;
        }

        let publicUrl = "";
        if (res.data.uploadType === "cloudinary") {
          const formDataObj = new FormData();
          formDataObj.append("file", file);
          formDataObj.append("api_key", res.data.apiKey);
          formDataObj.append("timestamp", res.data.timestamp.toString());
          formDataObj.append("signature", res.data.signature);

          const uploadRes = await fetch(res.data.url, { method: "POST", body: formDataObj });
          if (!uploadRes.ok) {
            setUploadError("Cloudinary upload failed.");
            return;
          }
          const cloudinaryData = await uploadRes.json();
          publicUrl = cloudinaryData.secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": fileType },
            body: file,
          });
          if (!put.ok) {
            setUploadError("S3 Upload failed.");
            return;
          }
          publicUrl = res.data.publicUrl;
        }
        setFormData((prev) => ({ ...prev, receiptUrl: publicUrl }));
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload.");
      } finally {
        setUploading(false);
      }
    }
  });

  const previewUrl = formData.receiptUrl || (files[0]?.preview || null);
  const displayFileName =
    (files[0]?.file instanceof File ? files[0].file.name : null) ||
    "Payment Receipt";
  const isPdf = Boolean(
    (files[0]?.file instanceof File &&
      (files[0].file.type === "application/pdf" ||
        files[0].file.name.toLowerCase().endsWith(".pdf"))) ||
      (previewUrl && previewUrl.toLowerCase().includes(".pdf"))
  );

  const selectedSaleDetails = formData.saleId && formData.saleId !== "none"
    ? metadata?.sales?.find((s: any) => s.id === formData.saleId)
    : null;

  useEffect(() => {
    const nextType = inferPaymentType(selectedSaleDetails ?? null, formData.amount);
    setFormData((prev) => (prev.paymentType === nextType ? prev : { ...prev, paymentType: nextType }));
  }, [formData.saleId, formData.amount, selectedSaleDetails]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast.error("Please select a client or station");
      return;
    }

    if (selectedSaleDetails) {
      const outstanding = getSaleOutstanding(selectedSaleDetails);
      if (Number(formData.amount) > outstanding) {
        toast.error(`Amount cannot exceed the outstanding balance of ₦${outstanding.toLocaleString()}`);
        return;
      }
    }

    setConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        customerId: formData.clientId,
        deliveryId: formData.saleId === "none" ? undefined : formData.saleId,
        amount: Number(formData.amount),
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        receiptUrl: formData.receiptUrl,
        bankAccountId: formData.paymentMethod !== "CASH" && formData.paymentMethod !== "DEPOSIT" ? formData.bankAccountId : undefined,
      };
      const res = await apiPost<any>(`/api/tenant/fleet/payments/inflow`, payload);
      if (!res.error) {
        setConfirmOpen(false);
        toast.success("Payment recorded", {
          description: `₦${Number(formData.amount).toLocaleString()} has been logged successfully.`,
        });
        router.push("/admin/payments");
        return;
      }
      setConfirmOpen(false);
      toast.error(res.error?.message || "Failed to record payment. Please try again.");
    } catch (e: any) {
      console.error(e);
      setConfirmOpen(false);
      toast.error(e?.message || "Something went wrong while recording this payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><SpinnerEllipsis /></div>;

  const selectedCustomer = metadata?.customers?.find((c: any) => c.id === formData.clientId);
  const selectedStation = metadata?.stations?.find((s: any) => s.id === formData.clientId);
  const depositBalance = selectedCustomer ? Number(selectedCustomer.depositBalance || 0) : 0;
  const selectedBank = formData.bankAccountId
    ? metadata?.bankAccounts?.find((a: any) => a.id === formData.bankAccountId)
    : null;

  const confirmRows: PaymentSummaryRow[] = [
    { label: "Client / Station", value: selectedCustomer?.name || selectedStation?.name || "—", emphasis: true },
    { label: "Payment Type", value: formData.paymentType.replace(/_/g, " ") },
    { label: "Payment Method", value: formData.paymentMethod.replace(/_/g, " ") },
    ...(selectedSaleDetails
      ? [{ label: "Applied To Sale", value: `${Number(selectedSaleDetails.litersDespatched).toLocaleString()} L despatch` }]
      : []),
    ...(selectedBank ? [{ label: "Receiving Account", value: `${selectedBank.bankName}${selectedBank.accountName ? " • " + selectedBank.accountName : ""}` }] : []),
    ...(formData.reference ? [{ label: "Reference", value: formData.reference }] : []),
  ];

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
                <Link href="/admin/payments">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <CardTitle className="text-xl">Log Incoming Payment</CardTitle>
                <CardDescription>Record a payment received from a customer or station.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
              {/* SECTION: General Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">General Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col justify-end">
                  <Label>Client / Station Name *</Label>
                  <Popover open={clientOpen} onOpenChange={setClientOpen}>
                    <PopoverTrigger asChild className="w-full">
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientOpen}
                        className="w-full justify-between font-normal"
                      >
                        {formData.clientId
                          ? (metadata?.customers?.find((c: any) => c.id === formData.clientId)?.name ||
                            metadata?.stations?.find((s: any) => s.id === formData.clientId)?.name)
                          : "Select Client or Station..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="p-0" 
                      style={{ width: 'var(--radix-popover-trigger-width)' }} 
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search clients/stations..." />
                        <CommandList>
                          <CommandEmpty>No clients or stations found.</CommandEmpty>
                          <CommandGroup heading="Customers">
                            {metadata?.customers?.map((c: any) => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => {
                                  setFormData({ ...formData, clientId: c.id, saleId: "none" });
                                  setClientOpen(false);
                                }}
                                data-checked={formData.clientId === c.id}
                              >
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup heading="Stations">
                            {metadata?.stations?.map((s: any) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.name} ${s.code}`}
                                onSelect={() => {
                                  setFormData({ ...formData, clientId: s.id, saleId: "none" });
                                  setClientOpen(false);
                                }}
                                data-checked={formData.clientId === s.id}
                              >
                                {s.name} ({s.code})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

        <div className="space-y-2 flex flex-col justify-end">
          <Label>Pending Sale (Optional)</Label>
          <Popover open={saleOpen} onOpenChange={setSaleOpen}>
            <PopoverTrigger asChild className="w-full">
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={saleOpen}
                className="w-full justify-between font-normal text-left h-auto py-2"
                disabled={!formData.clientId}
              >
                <span className="truncate pr-4">
                  {formData.saleId !== "none"
                    ? (() => {
                        const s = metadata?.sales?.find((s: any) => s.id === formData.saleId);
                        if (s) {
                          const out = getSaleOutstanding(s);
                          const t = metadata?.transports?.find((tr: any) => tr.id === s.transportId);
                          const ref = t?.order?.reference || "Direct Sale";
                          return `${ref} • ${Number(s.litersDespatched).toLocaleString()} L • Out: ₦${out.toLocaleString()}`;
                        }
                        return "Select Sale...";
                      })()
                    : "No specific sale (Account level)"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="p-0" 
              style={{ width: 'var(--radix-popover-trigger-width)' }} 
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search sales..." />
                <CommandList>
                  <CommandEmpty>No pending sales found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        setFormData({ ...formData, saleId: "none" });
                        setSaleOpen(false);
                      }}
                      data-checked={formData.saleId === "none"}
                    >
                      No specific sale (Account level)
                    </CommandItem>
                    {metadata?.sales?.filter((s: any) => s.customerId === formData.clientId || s.stationId === formData.clientId).map((s: any) => {
                      const outstanding = getSaleOutstanding(s);
                      const t = metadata?.transports?.find((tr: any) => tr.id === s.transportId);
                      const ref = t?.order?.reference || "Direct Sale";
                      const searchValue = `${s.id} ${ref} ${s.litersDespatched} ${outstanding} ${new Date(s.createdAt).toLocaleDateString()}`.toLowerCase();
                      
                      return (
                        <CommandItem
                          key={s.id}
                          value={searchValue}
                          onSelect={() => {
                            setFormData({
                              ...formData,
                              saleId: s.id,
                              amount: outstanding > 0 ? String(outstanding) : formData.amount,
                            });
                            setSaleOpen(false);
                          }}
                          data-checked={formData.saleId === s.id}
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-xs">
                              {ref} • {Number(s.litersDespatched).toLocaleString()} L
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              Date: {new Date(s.createdAt).toLocaleDateString()} • Debt: ₦{outstanding.toLocaleString()}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>

    {/* SECTION: Financial Details */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financial Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Amount Paid (₦) *</Label>
            {formData.paymentMethod === "DEPOSIT" && selectedCustomer && (
              <span className="text-xs text-muted-foreground">
                Available Deposit: ₦{depositBalance.toLocaleString()}
              </span>
            )}
          </div>
          <FormattedNumberInput 
            required
            max={formData.paymentMethod === "DEPOSIT" ? depositBalance : undefined}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="e.g. 50000"
            prefixText="₦"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Type *</Label>
          <Select 
            value={formData.paymentType} 
            onValueChange={(val) => setFormData({ ...formData, paymentType: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Payment Type" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ADVANCE_DEPOSIT">Advance Deposit</SelectItem>
              <SelectItem value="PART_PAYMENT">Part Payment</SelectItem>
              <SelectItem value="FULL_SETTLEMENT">Full Settlement</SelectItem>
              <SelectItem value="DEBT_CLEARANCE">Debt Clearance</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.saleId === "none"
              ? "No sale selected — recorded as an advance deposit."
              : formData.paymentType === "PART_PAYMENT"
                ? "Amount is less than the outstanding balance."
                : formData.paymentType === "DEBT_CLEARANCE"
                  ? "Clears remaining balance on a previously part-paid sale."
                  : "Covers the full outstanding balance on this sale."}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Payment Method *</Label>
          <Select 
            value={formData.paymentMethod} 
            onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Payment Method" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="DEPOSIT">Apply Deposit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.paymentMethod !== "CASH" && formData.paymentMethod !== "DEPOSIT" && (
          <div className="space-y-2">
            <Label>Receiving Bank Account *</Label>
            <Popover open={bankOpen} onOpenChange={setBankOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={bankOpen}
                  className="h-9 w-full justify-between font-normal"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {formData.bankAccountId
                      ? (() => {
                          const account = metadata?.bankAccounts?.find((a: any) => a.id === formData.bankAccountId);
                          return account
                            ? `${account.accountName ? account.accountName + " - " : ""}${account.bankName}`
                            : "Select Bank Account...";
                        })()
                      : "Select Bank Account..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0" 
                style={{ width: 'var(--radix-popover-trigger-width)' }} 
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search bank account..." />
                  <CommandList>
                    <CommandEmpty>No bank accounts found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.bankAccounts?.map((account: any) => (
                        <CommandItem
                          key={account.id}
                          value={`${account.bankName} ${account.accountName || ""} ${account.accountNumber}`}
                          onSelect={() => {
                            setFormData({ ...formData, bankAccountId: account.id });
                            setBankOpen(false);
                          }}
                          data-checked={formData.bankAccountId === account.id}
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-sm">{account.bankName}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {account.accountName ? account.accountName + " • " : ""}{account.accountNumber}
                            </span>
                          </div>
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
          <Label>Transaction Reference</Label>
          <Input 
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="e.g. TXN-12345 (Optional)"
          />
        </div>
      </div>
    </div>

    {/* SECTION: Proof of Payment */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Proof of Payment</h3>
      </div>
      <div className="space-y-2">
        <Label>Attach Proof</Label>
          <div className="relative">
            <div
              className="relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
              data-dragging={isDragging || undefined}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input {...getInputProps()} aria-label="Upload receipt file" className="sr-only" disabled={uploading} />
              
              {uploading ? (
                <div className="flex flex-col items-center justify-center p-4">
                   <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                   <p className="text-sm font-medium">Uploading receipt...</p>
                </div>
              ) : previewUrl ? (
                <FilePreviewTrigger
                  fileUrl={previewUrl}
                  fileName={displayFileName}
                  className="absolute inset-0 flex items-center justify-center p-4 bg-background cursor-pointer group"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <div className="mb-2 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <FileText className="size-8" />
                      </div>
                      <p className="text-sm font-medium text-foreground max-w-[240px] truncate mb-1">
                        {displayFileName}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium mb-2">
                        PDF Document
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                        <Eye className="size-3" /> Preview Document
                      </span>
                    </div>
                  ) : (
                    <div className="relative flex size-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={displayFileName}
                        className="mx-auto max-h-full rounded object-contain transition-transform duration-200 group-hover:scale-102"
                        src={previewUrl}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 rounded-lg">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
                          <Eye className="size-3.5" /> Preview Receipt
                        </span>
                      </div>
                    </div>
                  )}
                </FilePreviewTrigger>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                  <div aria-hidden="true" className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background">
                    <UploadIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1.5 font-medium text-sm">Drop your receipt here</p>
                  <p className="text-muted-foreground text-xs">PDF, PNG, JPG or WEBP (max. {maxSizeMB}MB)</p>
                  <Button className="mt-4" onClick={openFileDialog} variant="outline" type="button">
                    <UploadIcon aria-hidden="true" className="-ms-1 size-4 opacity-60" /> Select file
                  </Button>
                </div>
              )}
            </div>

            {previewUrl && !uploading && (
              <div className="absolute top-4 right-4 z-50">
                <button
                  aria-label="Remove receipt"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => {
                     removeFile(files[0]?.id);
                     setFormData((prev) => ({ ...prev, receiptUrl: "" }));
                  }}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
          </div>

          {(uploadErrors.length > 0 || uploadError) && (
            <div className="flex items-center gap-1 text-destructive text-xs mt-2" role="alert">
              <AlertCircleIcon className="size-3 shrink-0" />
              <span>{uploadErrors[0] || uploadError}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/30">
            <Button 
              type="submit" 
              disabled={submitting}
              className="h-10 rounded-full px-6 gap-2"
            >
              {submitting ? (
                <>
                  <SpinnerEllipsis />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Log Payment</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
  
  {/* Right Column: Sale Details Card */}
  <div className="lg:col-span-1">
    <div className="sticky top-6 rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="font-medium text-sm">Sale Summary</h3>
        {Number(formData.amount) > 0 && (
          <span className="text-sm font-semibold tabular-nums">₦{Number(formData.amount).toLocaleString()}</span>
        )}
      </div>

      <div>
      {selectedSaleDetails ? (
        <>
          <SummaryRow label="Despatched On" value={new Date(selectedSaleDetails.createdAt).toLocaleDateString()} />
          <SummaryRow label="Volume (Despatched)" value={`${Number(selectedSaleDetails.litersDespatched).toLocaleString()} L`} />
          {selectedSaleDetails.litersReceived !== null && (
            <SummaryRow
              label="Volume (Received)"
              value={(() => {
                const variance = Number(selectedSaleDetails.litersReceived) - Number(selectedSaleDetails.litersDespatched);
                const base = `${Number(selectedSaleDetails.litersReceived).toLocaleString()} L`;
                if (variance === 0) return base;
                return `${base} (${variance > 0 ? "+" : ""}${variance.toLocaleString()} L)`;
              })()}
            />
          )}
          <SummaryRow label="Product Amount" value={`₦${Number(selectedSaleDetails.totalExpectedAmount).toLocaleString()}`} />
          {Number(selectedSaleDetails.transportCost || 0) > 0 && (
            <SummaryRow
              label={`Transport Fee (${selectedSaleDetails.transportCostBorneBy === "CLIENT" ? "Client Billed" : "Company Borne"})`}
              value={`₦${Number(selectedSaleDetails.transportCost).toLocaleString()}`}
            />
          )}
          <SummaryRow label="Total Expected" value={`₦${getSaleTotalExpected(selectedSaleDetails).toLocaleString()}`} emphasis />
          <SummaryRow label="Amount Paid" value={`₦${Number(selectedSaleDetails.paymentReceived).toLocaleString()}`} />
          <SummaryRow label="Outstanding" value={`₦${getSaleOutstanding(selectedSaleDetails).toLocaleString()}`} emphasis />
        </>
      ) : selectedCustomer || selectedStation ? (
        <>
          <SummaryRow label="Account" value={selectedCustomer?.name || selectedStation?.name || "—"} />
          {selectedCustomer && <SummaryRow label="Deposit Balance" value={`₦${depositBalance.toLocaleString()}`} />}
          <div className="px-4 py-3 text-center border-t border-border/60">
            <p className="text-xs text-muted-foreground/80">No specific sale selected — this will be applied at the account level.</p>
          </div>
        </>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground font-medium">No Client Selected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Select a client or station to view sale and balance details here.</p>
        </div>
      )}

      {(formData.paymentMethod || selectedBank) && (
        <>
          <SummaryRow label="Method" value={formData.paymentMethod.replace(/_/g, " ")} />
          {selectedBank && <SummaryRow label="To Account" value={selectedBank.bankName} />}
        </>
      )}
      </div>
    </div>
  </div>
</div>

<PaymentConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  onConfirm={handleConfirmedSubmit}
  confirming={submitting}
  title="Confirm incoming payment"
  description="Please review the payment details below before it is logged."
  amountLabel={`₦${(Number(formData.amount) || 0).toLocaleString()}`}
  rows={confirmRows}
  confirmLabel="Confirm & Log Payment"
/>
</>
);
}

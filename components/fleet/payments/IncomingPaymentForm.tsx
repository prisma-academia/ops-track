"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Save, AlertCircleIcon, ImageIcon, UploadIcon, XIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { apiPost } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export default function IncomingPaymentForm() {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: "",
    saleId: "none",
    amount: "",
    paymentType: "FULL_SETTLEMENT",
    paymentMethod: "Bank Transfer",
    reference: "",
    receiptUrl: "",
  });

  const maxSizeMB = 2;
  const maxSize = maxSizeMB * 1024 * 1024;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clientOpen, setClientOpen] = useState(false);

  const [
    { files, isDragging, errors: uploadErrors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps },
  ] = useFileUpload({
    accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadError(null);
      setUploading(true);
      try {
        const res = await apiPost<any>("/api/tenant/fleet/payments/upload", { contentType: file.type });
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
            headers: { "Content-Type": file.type },
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
  const displayFileName = files[0]?.file.name || "Payment Receipt";

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tenant/fleet/payments/metadata`);
        if (res.ok) {
          const body = await res.json();
          setMetadata(body.data || body);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!formData.clientId) {
      toast.error("Please select a client or station");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        customerId: formData.clientId,
        saleId: formData.saleId === "none" ? undefined : formData.saleId,
        amount: Number(formData.amount),
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        receiptUrl: formData.receiptUrl,
      };
      
      const res = await apiPost<any>(`/api/tenant/fleet/payments/inflow`, payload);
      if (!res.error) {
        toast.success("Payment recorded successfully!");
        setFormData({ ...formData, amount: "", reference: "", receiptUrl: "", saleId: "none" });
      } else {
        toast.error(res.error?.message || "Failed to record payment.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error recording payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><SpinnerEllipsis /></div>;

  const selectedSaleDetails = formData.saleId && formData.saleId !== "none" 
    ? metadata?.sales?.find((s: any) => s.id === formData.saleId)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className={cn("grid grid-cols-1 gap-6", selectedSaleDetails ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        <div className={cn("space-y-6", selectedSaleDetails ? "lg:col-span-2" : "md:col-span-2")}>
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
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                      >
                        <Check className={cn("mr-2 h-4 w-4", formData.clientId === c.id ? "opacity-100" : "opacity-0")} />
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
                      >
                        <Check className={cn("mr-2 h-4 w-4", formData.clientId === s.id ? "opacity-100" : "opacity-0")} />
                        {s.name} ({s.code})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Pending Sale (Optional)</Label>
          <Select 
            value={formData.saleId} 
            onValueChange={(val) => {
              const selectedSale = metadata?.sales?.find((s: any) => s.id === val);
              const amount = selectedSale ? (Number(selectedSale.totalExpectedAmount) - Number(selectedSale.paymentReceived)).toString() : formData.amount;
              setFormData({ ...formData, saleId: val, amount });
            }}
            disabled={!formData.clientId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Sale" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="none">No specific sale (Account level)</SelectItem>
              {metadata?.sales?.filter((s: any) => s.customerId === formData.clientId || s.stationId === formData.clientId).map((s: any) => {
                const outstanding = Number(s.totalExpectedAmount) - Number(s.paymentReceived);
                return (
                  <SelectItem key={s.id} value={s.id}>
                    Despatched: {new Date(s.createdAt).toLocaleDateString()} | Outstanding: ₦{outstanding.toLocaleString()}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount Paid (₦) *</Label>
          <Input 
            required
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="e.g. 50000"
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
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Transaction Reference</Label>
          <Input 
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="e.g. TXN-12345 (Optional)"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
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
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-background">
                  <img alt={displayFileName} className="mx-auto max-h-full rounded object-contain" src={previewUrl} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                  <div aria-hidden="true" className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background">
                    <ImageIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1.5 font-medium text-sm">Drop your receipt here</p>
                  <p className="text-muted-foreground text-xs">SVG, PNG, JPG or WEBP (max. {maxSizeMB}MB)</p>
                  <Button className="mt-4" onClick={openFileDialog} variant="outline" type="button">
                    <UploadIcon aria-hidden="true" className="-ms-1 size-4 opacity-60" /> Select image
                  </Button>
                </div>
              )}
            </div>

            {previewUrl && !uploading && (
              <div className="absolute top-4 right-4">
                <button
                  aria-label="Remove image"
                  className="z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
    </div>
    
    {/* Right Column: Sale Details Card */}
    {selectedSaleDetails && (
      <div className="lg:col-span-1">
        <div className="sticky top-6 border rounded-2xl bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Sale Summary</h3>
            <p className="text-sm text-muted-foreground">Details for the selected pending sale.</p>
          </div>
          
          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Despatched On</span>
              <span className="font-medium text-sm">{new Date(selectedSaleDetails.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Volume</span>
              <span className="font-medium text-sm">{Number(selectedSaleDetails.litersDespatched).toLocaleString()} L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Expected Amount</span>
              <span className="font-medium text-sm">₦{Number(selectedSaleDetails.totalExpectedAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-500">
              <span className="text-sm">Amount Paid</span>
              <span className="font-medium text-sm">₦{Number(selectedSaleDetails.paymentReceived).toLocaleString()}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Outstanding</span>
              <span className="font-bold text-destructive">
                ₦{(Number(selectedSaleDetails.totalExpectedAmount) - Number(selectedSaleDetails.paymentReceived)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
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
  );
}

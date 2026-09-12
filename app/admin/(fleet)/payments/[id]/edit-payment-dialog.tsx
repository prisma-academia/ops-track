"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { apiPatch, apiPost } from "@/lib/client/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  initialDescription: string | null;
  initialReceiptUrl: string | null;
}

export function EditPaymentDialog({
  open,
  onOpenChange,
  transactionId,
  initialDescription,
  initialReceiptUrl,
}: EditPaymentDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [receiptUrl, setReceiptUrl] = useState(initialReceiptUrl ?? "");
  const [receiptPreview, setReceiptPreview] = useState(initialReceiptUrl ?? "");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Receipt must be a PNG, JPEG, or WebP image.");
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL / Cloudinary signature
      const uploadRes = await apiPost<{
        uploadType: "cloudinary" | "s3";
        url?: string;
        apiKey?: string;
        timestamp?: number;
        signature?: string;
        key?: string;
        publicUrl?: string;
      }>("/api/tenant/fleet/payments/upload", {
        contentType: file.type,
      });

      if (uploadRes.error) {
        toast.error(uploadRes.error.message);
        return;
      }

      const data = uploadRes.data!;

      if (data.uploadType === "cloudinary") {
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", data.apiKey!);
        formData.append("timestamp", String(data.timestamp));
        formData.append("signature", data.signature!);
        const cloudRes = await fetch(data.url!, {
          method: "POST",
          body: formData,
        });
        const cloudJson = await cloudRes.json();
        if (cloudJson.secure_url) {
          setReceiptUrl(cloudJson.secure_url);
          setReceiptPreview(cloudJson.secure_url);
        } else {
          throw new Error("Cloudinary upload failed.");
        }
      } else {
        // Upload to S3
        await fetch(data.url!, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        setReceiptUrl(data.publicUrl!);
        setReceiptPreview(data.publicUrl!);
      }

      toast.success("Receipt uploaded.");
    } catch {
      toast.error("Failed to upload receipt.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl("");
    setReceiptPreview("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPatch(
        `/api/tenant/fleet/payments/${transactionId}`,
        {
          description: description || null,
          receiptUrl: receiptUrl || null,
        },
      );
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Payment updated.");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update the description or receipt for this payment. Financial details
            cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Add a description or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Receipt */}
          <div className="space-y-2">
            <Label>Receipt / Proof of Payment</Label>
            {receiptPreview ? (
              <div className="relative rounded-lg border border-border bg-muted/50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-40 w-full object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleRemoveReceipt}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:bg-muted/50">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload receipt"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

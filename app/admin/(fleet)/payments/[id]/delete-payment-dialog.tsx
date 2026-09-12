"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiDelete } from "@/lib/client/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeletePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  amount: number;
  reference: string;
}

export function DeletePaymentDialog({
  open,
  onOpenChange,
  transactionId,
  amount,
  reference,
}: DeletePaymentDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiDelete(
        `/api/tenant/fleet/payments/${transactionId}`,
      );
      if (res.error) {
        toast.error(res.error.message);
        setDeleting(false);
        return;
      }
      toast.success("Payment deleted successfully.");
      router.push("/admin/payments");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Payment</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete payment{" "}
              <strong className="text-foreground">{reference}</strong> of{" "}
              <strong className="text-foreground">
                ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
              ?
            </span>
            <span className="block text-destructive font-medium">
              This action is irreversible and will reverse all associated
              financial changes including delivery status, customer balance, and
              transport fees.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

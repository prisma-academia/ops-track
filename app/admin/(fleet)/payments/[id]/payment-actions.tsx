"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditPaymentDialog } from "./edit-payment-dialog";
import { DeletePaymentDialog } from "./delete-payment-dialog";

interface PaymentActionsProps {
  transactionId: string;
  description: string | null;
  receiptUrl: string | null;
  amount: number;
  reference: string;
  tripOutstanding?: number | null;
}

export function PaymentActions({
  transactionId,
  description,
  receiptUrl,
  amount,
  reference,
  tripOutstanding,
}: PaymentActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {tripOutstanding !== undefined && tripOutstanding !== null && (
        <Card className="print:hidden border-amber-500/30 bg-amber-500/5 mb-4">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Trip Outstanding
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₦{tripOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Remaining balance on this transport trip
            </span>
          </CardContent>
        </Card>
      )}
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-3 p-4">
          {/* Back button — full width, primary color */}
          <Button
            className="w-full"
            size={"icon-lg"}
            onClick={() => router.push("/admin/payments")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Button>

          {/* Edit button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEditOpen(true)}
            size={"icon-lg"}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Payment
          </Button>

          {/* Print button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePrint}
            size={"icon-lg"}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>

          {/* Delete button — full width, destructive */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Payment
          </Button>
        </CardContent>
      </Card>

      <EditPaymentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transactionId={transactionId}
        initialDescription={description}
        initialReceiptUrl={receiptUrl}
      />

      <DeletePaymentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transactionId={transactionId}
        amount={amount}
        reference={reference}
      />
    </>
  );
}

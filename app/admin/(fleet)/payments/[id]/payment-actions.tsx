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
}

export function PaymentActions({
  transactionId,
  description,
  receiptUrl,
  amount,
  reference,
}: PaymentActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-3 p-4">
          {/* Back button — full width, primary color */}
          <Button
            className="w-full"
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
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          {/* Print button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
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

"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface InvoiceActionsProps {
  backHref: string;
  backLabel?: string;
  waybillHref?: string;
}

export function InvoiceActions({
  backHref,
  backLabel = "Back to Deliveries",
  waybillHref,
}: InvoiceActionsProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="print:hidden">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Back button — full width, primary color */}
        <Button
          className="w-full"
          size={"icon-lg"}
          onClick={() => router.push(backHref)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>

        {/* Print button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handlePrint}
          size={"icon-lg"}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>

        {/* View Waybill button */}
        {waybillHref && (
          <Button
            variant="outline"
            className="w-full"
            size={"icon-lg"}
            asChild
          >
            <Link href={waybillHref}>
              <FileText className="mr-2 h-4 w-4" />
              View Driver Waybill
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

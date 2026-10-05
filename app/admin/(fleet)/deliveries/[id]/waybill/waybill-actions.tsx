"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface WaybillActionsProps {
  backHref: string;
  backLabel?: string;
  invoiceHref?: string;
}

export function WaybillActions({
  backHref,
  backLabel = "Back to Deliveries",
  invoiceHref,
}: WaybillActionsProps) {
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
          Print Waybill
        </Button>

        {/* View Invoice button */}
        {invoiceHref && (
          <Button
            variant="outline"
            className="w-full"
            size={"icon-lg"}
            asChild
          >
            <Link href={invoiceHref}>
              <FileText className="mr-2 h-4 w-4" />
              View Invoice
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

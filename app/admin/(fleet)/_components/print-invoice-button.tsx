"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton({
  label = "Print Invoice",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      className={`print:hidden gap-2 ${className || ""}`}
    >
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}

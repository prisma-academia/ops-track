"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import IncomingPaymentForm from "@/components/fleet/payments/IncomingPaymentForm";
import { Button } from "@/components/ui/button";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export default function NewIncomingPaymentPage() {
  const { metadata, loading } = usePaymentMetadata();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/payments/new">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Incoming Payment</h1>
          <p className="text-muted-foreground mt-1">Record a payment received from a customer or station.</p>
        </div>
      </div>

      <IncomingPaymentForm metadata={metadata} loading={loading} />
    </div>
  );
}

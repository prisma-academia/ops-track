"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";
import { Button } from "@/components/ui/button";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export function OutgoingPaymentView() {
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
          <h1 className="text-3xl font-bold tracking-tight">Log Outgoing Payment</h1>
          <p className="text-muted-foreground mt-1">Record transport fee payouts and operational expenses.</p>
        </div>
      </div>

      <OutgoingPaymentForm metadata={metadata} loading={loading} />
    </div>
  );
}

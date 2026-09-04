"use client";

import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export function OutgoingPaymentView() {
  const { metadata, loading } = usePaymentMetadata();

  return <OutgoingPaymentForm metadata={metadata} loading={loading} />;
}

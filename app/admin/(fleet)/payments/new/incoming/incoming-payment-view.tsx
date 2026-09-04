"use client";

import IncomingPaymentForm from "@/components/fleet/payments/IncomingPaymentForm";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export function IncomingPaymentView() {
  const { metadata, loading } = usePaymentMetadata();

  return <IncomingPaymentForm metadata={metadata} loading={loading} />;
}

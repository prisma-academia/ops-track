"use client";

import { useSearchParams } from "next/navigation";
import SupplierOutgoingPaymentForm from "@/components/fleet/payments/SupplierOutgoingPaymentForm";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export function SupplierPaymentView() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplierId") || "";
  const orderId = searchParams.get("orderId") || "";
  const { metadata, loading } = usePaymentMetadata();

  return (
    <SupplierOutgoingPaymentForm
      metadata={metadata}
      loading={loading}
      initialSupplierId={supplierId}
      initialOrderId={orderId}
    />
  );
}

"use client";

import { useSearchParams } from "next/navigation";

import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";
import { usePaymentMetadata } from "@/hooks/use-payment-metadata";

export function OutgoingPaymentView() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplierId") || "";
  const orderId = searchParams.get("orderId") || "";
  const { metadata, loading } = usePaymentMetadata();

  const initialSupplierLink =
    supplierId || orderId
      ? {
          supplierId,
          supplierOrderId: orderId,
        }
      : undefined;

  return (
    <OutgoingPaymentForm
      metadata={metadata}
      loading={loading}
      initialSupplierLink={initialSupplierLink}
    />
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { InvoiceReceipt } from "./invoice-receipt";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      delivery: {
        include: { customer: true, station: true },
      },
      customer: true,
      station: true,
      transporter: true,
      truck: true,
      order: true,
      transport: true,
      tenant: true,
      bankAccount: true,
    },
  });

  if (!transaction || transaction.tenantId !== actor.tenantId) {
    redirect("/admin/payments");
  }

  let logoUrl = null;
  if (transaction.tenant?.settingsJson) {
    const settings = transaction.tenant.settingsJson as { logoKey?: string };
    if (settings.logoKey) {
      if (settings.logoKey.startsWith("http")) {
        logoUrl = settings.logoKey;
      } else if (s3Configured()) {
        logoUrl = publicUrlForKey(settings.logoKey);
      }
    }
  }

  const safeTransactionForClient = {
    id: transaction.id,
    type: transaction.type,
    reference: transaction.reference,
    category: transaction.category,
    paymentType: transaction.paymentType,
    paymentPurpose: transaction.paymentPurpose,
    feeLeg: transaction.feeLeg,
    amount: Number(transaction.amount),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    description: transaction.description,
    paymentMethod: transaction.paymentMethod,
    receiptUrl: transaction.receiptUrl,
    customer: transaction.customer ? { name: transaction.customer.name } : null,
    station: transaction.station ? { name: transaction.station.name, code: transaction.station.code } : null,
    delivery: transaction.delivery
      ? {
          id: transaction.delivery.id,
          customer: transaction.delivery.customer ? { name: transaction.delivery.customer.name } : null,
          station: transaction.delivery.station ? { name: transaction.delivery.station.name } : null,
        }
      : null,
    order: transaction.order ? { id: transaction.order.id, reference: transaction.order.reference } : null,
    transport: transaction.transport ? { id: transaction.transport.id, destination: transaction.transport.destination } : null,
    transporter: transaction.transporter ? { id: transaction.transporter.id, name: transaction.transporter.name } : null,
    truck: transaction.truck
      ? { id: transaction.truck.id, name: transaction.truck.name, plateNumber: transaction.truck.plateNumber }
      : null,
    tenant: transaction.tenant ? { name: transaction.tenant.name, logoUrl } : null,
    bankAccount: transaction.bankAccount
      ? {
          bankName: transaction.bankAccount.bankName,
          accountNumber: transaction.bankAccount.accountNumber,
          accountName: transaction.bankAccount.accountName,
        }
      : null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/payments">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
          <p className="text-muted-foreground mt-1">Ref: {transaction.reference || transaction.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <InvoiceReceipt transaction={safeTransactionForClient} />
    </div>
  );
}

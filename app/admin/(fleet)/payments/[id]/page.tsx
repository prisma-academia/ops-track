import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { InvoiceReceipt } from "./invoice-receipt";
import { PaymentActions } from "./payment-actions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { isStationLedgerTransaction } from "@/lib/finance/fleet-ledger";
import { parseTenantSettings } from "@/lib/tenant/settings";
import {
  getFeeLegBreakdown,
  getFeeLegLabel,
  getRemainingForLeg,
} from "@/lib/fleet/transport-fees";

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_PAYMENTS_READ.key);

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      organization: true,
      delivery: {
        include: {
          customer: true,
          station: true,
          organization: true,
          transport: {
            include: {
              order: true,
              transporter: true,
              truck: true,
            },
          },
        },
      },
      customer: true,
      station: true,
      transporter: true,
      truck: true,
      order: true,
      transport: {
        include: {
          order: true,
          transporter: true,
          truck: true,
        },
      },
      tenant: true,
      bankAccount: true,
    },
  });

  if (!transaction || transaction.tenantId !== actor.tenantId || isStationLedgerTransaction(transaction)) {
    redirect("/admin/payments");
  }

  let logoUrl = null;
  let signatureUrl = null;
  if (transaction.tenant?.settingsJson) {
    const settings = transaction.tenant.settingsJson as { logoKey?: string; signatureKey?: string };
    if (settings.logoKey) {
      if (settings.logoKey.startsWith("http")) {
        logoUrl = settings.logoKey;
      } else if (s3Configured()) {
        logoUrl = publicUrlForKey(settings.logoKey);
      }
    }
    if (settings.signatureKey) {
      if (settings.signatureKey.startsWith("http")) {
        signatureUrl = settings.signatureKey;
      } else if (s3Configured()) {
        signatureUrl = publicUrlForKey(settings.signatureKey);
      }
    }
  }

  const transportId =
    transaction.transportId ||
    transaction.transport?.id ||
    transaction.delivery?.transport?.id ||
    null;

  let tripFinancials: {
    tripExpected: number;
    tripPaid: number;
    tripOutstanding: number;
    lossDeduction: number;
    fleetExpense: number;
    legRemaining: number | null;
    feeLegLabel: string | null;
    destination: string | null;
    truckPlate: string | null;
    transporterName: string | null;
  } | null = null;

  if (transportId) {
    const fullTransport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        deliveries: {
          include: {
            station: true,
            customer: true,
          },
        },
        lossLogs: true,
        transactions: true,
        transporter: true,
        truck: true,
        order: true,
      },
    });

    if (fullTransport) {
      const tenantSettings = parseTenantSettings(transaction.tenant?.settingsJson);
      const originToDepotFee = tenantSettings.originToDepotFee ?? 0;

      const feeTransactions = fullTransport.transactions.filter(
        (t) => t.category === "TRANSPORT_PAYMENT"
      );
      const breakdown = getFeeLegBreakdown(fullTransport, feeTransactions, { originToDepotFee });
      const fullTripRow = breakdown.find((row) => row.feeLeg === "FULL_TRIP");

      const ratePerLiter = Number(fullTransport.ratePerLiter) || 0;
      let lossDeduction = 0;
      for (const log of fullTransport.lossLogs) {
        const liters = Number(log.lostQuantity) || 0;
        const logged = Number(log.expensesIncurred) || 0;
        lossDeduction += logged > 0 ? logged : liters * ratePerLiter;
      }

      const fleetExpense = fullTransport.transactions
        .filter((txn) => txn.category === "EXPENSE" || txn.category === "FLEET_EXPENSE")
        .reduce((sum, txn) => sum + Number(txn.amount), 0);

      const tripExpected =
        fullTripRow?.expected ??
        (ratePerLiter * (Number(fullTransport.litersCarried) || 0));
      const tripPaid =
        fullTripRow?.paid ?? Number(fullTransport.netTransportFeePaid) ?? 0;
      const tripOutstanding = Math.max(
        0,
        tripExpected - tripPaid - lossDeduction - fleetExpense
      );

      let legRemaining: number | null = null;
      let feeLegLabel: string | null = null;
      if (transaction.feeLeg) {
        feeLegLabel = getFeeLegLabel(transaction.feeLeg, null, {
          destination: fullTransport.destination,
          sourceDepot: fullTransport.order?.sourceDepot,
          supplier: fullTransport.order?.supplier,
        });
        legRemaining = getRemainingForLeg(
          fullTransport,
          feeTransactions,
          transaction.feeLeg,
          {
            deliveryId: transaction.deliveryId ?? undefined,
            originToDepotFee,
          }
        );
      }

      const transporterName =
        fullTransport.transporter?.name ||
        fullTransport.oneTimeTransporterName ||
        null;
      const truckPlate =
        fullTransport.truck?.plateNumber ||
        fullTransport.truck?.name ||
        fullTransport.oneTimeTruckPlate ||
        null;

      tripFinancials = {
        tripExpected,
        tripPaid,
        tripOutstanding,
        lossDeduction,
        fleetExpense,
        legRemaining,
        feeLegLabel,
        destination: fullTransport.destination,
        truckPlate,
        transporterName,
      };
    }
  }

  // Determine the "receiver" (counterparty) — same priority order the
  // receipt uses to label who the money went to/came from.
  let receiver: {
    label: string;
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null = null;

  if (transaction.customer) {
    receiver = {
      label: "Customer",
      name: transaction.customer.name,
      contactPerson: transaction.customer.contactPerson,
      email: transaction.customer.email,
      phone: transaction.customer.contactPhone || transaction.customer.phone,
      address: [transaction.customer.address, transaction.customer.lga, transaction.customer.state]
        .filter(Boolean)
        .join(", ") || null,
    };
  } else if (transaction.organization) {
    receiver = {
      label: "Organization",
      name: transaction.organization.name,
      contactPerson: transaction.organization.contactPerson,
      phone: transaction.organization.companyPhone || transaction.organization.contactPhone,
      email: transaction.organization.companyEmail,
      address: [transaction.organization.address, transaction.organization.lga, transaction.organization.state]
        .filter(Boolean)
        .join(", ") || null,
    };
  } else if (transaction.station) {
    receiver = {
      label: "Station",
      name: `${transaction.station.name}${transaction.station.code ? ` (${transaction.station.code})` : ""}`,
      address: [transaction.station.location, transaction.station.lga, transaction.station.state]
        .filter(Boolean)
        .join(", ") || null,
    };
  } else if (transaction.delivery?.customer) {
    receiver = { label: "Customer", name: transaction.delivery.customer.name };
  } else if (transaction.delivery?.organization) {
    receiver = { label: "Organization", name: transaction.delivery.organization.name };
  } else if (transaction.delivery?.station) {
    receiver = { label: "Station", name: transaction.delivery.station.name };
  } else if (transaction.transporter) {
    receiver = {
      label: "Transporter",
      name: transaction.transporter.name,
      contactPerson: transaction.transporter.contactPerson,
      email: transaction.transporter.email,
      phone: transaction.transporter.contactPhone || transaction.transporter.phone,
      address: [transaction.transporter.address, transaction.transporter.lga, transaction.transporter.state]
        .filter(Boolean)
        .join(", ") || null,
    };
  } else if (tripFinancials?.transporterName) {
    receiver = {
      label: "Transporter",
      name: tripFinancials.transporterName,
      address: tripFinancials.truckPlate ? `Truck: ${tripFinancials.truckPlate}` : null,
    };
  } else if (transaction.order?.supplier) {
    receiver = {
      label: "Supplier",
      name: transaction.order.supplier,
    };
  } else if (transaction.truck) {
    receiver = {
      label: "Truck",
      name: transaction.truck.plateNumber || transaction.truck.name || "Fleet Vehicle",
    };
  }

  const ref = transaction.reference || transaction.id.substring(0, 8).toUpperCase();

  // Build an absolute link back to this record so the QR code can be
  // scanned to pull up the payment on another device for verification.
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const verifyUrl = host ? `${protocol}://${host}/admin/payments/${transaction.id}` : null;

  const qrCodeDataUrl = verifyUrl
    ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200, color: { dark: "#111827", light: "#ffffff" } })
    : null;

  // Resolve station from transaction, linked delivery, or explicit stationId
  let resolvedStation = transaction.station ?? transaction.delivery?.station ?? null;
  if (!resolvedStation) {
    const stationId = transaction.stationId ?? transaction.delivery?.stationId ?? null;
    if (stationId) {
      resolvedStation = await prisma.station.findFirst({
        where: { id: stationId, tenantId: actor.tenantId },
      });
    }
  }

  const resolvedOrder =
    transaction.order ??
    transaction.transport?.order ??
    transaction.delivery?.transport?.order ??
    null;

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
    organization: transaction.organization
      ? { id: transaction.organization.id, name: transaction.organization.name }
      : transaction.delivery?.organization
        ? { id: transaction.delivery.organization.id, name: transaction.delivery.organization.name }
        : null,
    station: resolvedStation
      ? { name: resolvedStation.name, code: resolvedStation.code }
      : null,
    delivery: transaction.delivery
      ? {
          id: transaction.delivery.id,
          litersDespatched: Number(transaction.delivery.litersDespatched),
          amountPerLiter: Number(transaction.delivery.amountPerLiter),
          totalExpectedAmount: Number(transaction.delivery.totalExpectedAmount),
          paymentReceived: Number(transaction.delivery.paymentReceived),
          status: transaction.delivery.status,
          createdAt: transaction.delivery.createdAt,
          customer: transaction.delivery.customer ? { name: transaction.delivery.customer.name } : null,
          station: resolvedStation
            ? { name: resolvedStation.name, code: resolvedStation.code }
            : transaction.delivery.station
              ? { name: transaction.delivery.station.name, code: transaction.delivery.station.code }
              : null,
          organization: transaction.delivery.organization
            ? { id: transaction.delivery.organization.id, name: transaction.delivery.organization.name }
            : null,
          transport: transaction.delivery.transport
            ? {
                id: transaction.delivery.transport.id,
                destination: transaction.delivery.transport.destination,
                order: transaction.delivery.transport.order
                  ? {
                      id: transaction.delivery.transport.order.id,
                      reference: transaction.delivery.transport.order.reference,
                    }
                  : null,
              }
            : null,
        }
      : null,
    order: resolvedOrder
      ? { id: resolvedOrder.id, reference: resolvedOrder.reference }
      : null,
    transport: transaction.transport
      ? {
          id: transaction.transport.id,
          destination: transaction.transport.destination,
          order: transaction.transport.order
            ? { id: transaction.transport.order.id, reference: transaction.transport.order.reference }
            : null,
        }
      : transaction.delivery?.transport
        ? {
            id: transaction.delivery.transport.id,
            destination: transaction.delivery.transport.destination,
            order: transaction.delivery.transport.order
              ? {
                  id: transaction.delivery.transport.order.id,
                  reference: transaction.delivery.transport.order.reference,
                }
              : null,
          }
        : null,
    transporter: transaction.transporter
      ? { id: transaction.transporter.id, name: transaction.transporter.name }
      : tripFinancials?.transporterName
        ? { id: "", name: tripFinancials.transporterName }
        : null,
    truck: transaction.truck
      ? { id: transaction.truck.id, name: transaction.truck.name, plateNumber: transaction.truck.plateNumber }
      : tripFinancials?.truckPlate
        ? { id: "", name: tripFinancials.truckPlate, plateNumber: tripFinancials.truckPlate }
        : null,
    tenant: transaction.tenant
      ? {
          name: transaction.tenant.name,
          logoUrl,
          signatureUrl,
          email: transaction.tenant.companyEmail,
          phone: transaction.tenant.companyPhone,
          address: [transaction.tenant.addressLine1, transaction.tenant.addressLine2, transaction.tenant.city, transaction.tenant.region]
            .filter(Boolean)
            .join(", ") || null,
        }
      : null,
    bankAccount: transaction.bankAccount
      ? {
          bankName: transaction.bankAccount.bankName,
          accountNumber: transaction.bankAccount.accountNumber,
          accountName: transaction.bankAccount.accountName,
        }
      : null,
    receiver,
    qrCodeDataUrl,
    tripFinancials,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight print:hidden">Payment Details</h1>
        <p className="text-muted-foreground mt-1 print:hidden">Ref: {transaction.reference || transaction.id.substring(0, 8).toUpperCase()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
        {/* Actions Card */}
        <div className="md:sticky md:top-6">
          <PaymentActions
            transactionId={transaction.id}
            description={transaction.description}
            receiptUrl={transaction.receiptUrl}
            amount={Number(transaction.amount)}
            reference={ref}
            tripOutstanding={tripFinancials?.tripOutstanding ?? null}
          />
        </div>

        {/* Receipt */}
        <InvoiceReceipt transaction={safeTransactionForClient} />
      </div>
    </div>
  );
}

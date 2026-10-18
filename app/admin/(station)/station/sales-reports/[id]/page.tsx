import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { fetchExpectedOpeningBeforeSession } from "@/lib/dipping/session-context";
import { requiresOpeningGapConfirmation } from "@/lib/dipping/expected-opening";
import { SalesReportDetails } from "./sales-report-details";

const userSelect = {
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
};

const bankSelect = {
  select: {
    id: true,
    accountName: true,
    accountNumber: true,
    bankName: true,
  },
};

const paymentListInclude = {
  orderBy: { createdAt: "asc" as const },
  include: {
    bankAccount: bankSelect,
    reviews: {
      orderBy: { reviewedAt: "asc" as const },
      include: { reviewedBy: userSelect },
    },
  },
};

const repaymentSelect = {
  id: true,
  amountPos: true,
  amountTransfer: true,
  appliedCredit: true,
  status: true,
  logDate: true,
  createdAt: true,
  posReceiptUrl: true,
  transferReceiptUrl: true,
  recordedBy: userSelect,
  approvedBy: userSelect,
  reason: true,
  posBankAccount: bankSelect,
  transferBankAccount: bankSelect,
  payments: paymentListInclude,
};

/** Mobile sales link via `sales_logs.dippingClosingId`; Prisma `dippingClosing` uses `generateddeliveryId`. */
const dippingClosingForReportSelect = {
  id: true,
  recordedAt: true,
  closingLiters: true,
  session: {
    select: {
      id: true,
      openingLiters: true,
      openingGapConfirmed: true,
      openedAt: true,
      tankId: true,
      tenantId: true,
      tank: { select: { name: true } },
    },
  },
} as const;

export default async function SalesReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SALES_REPORTS_READ.key);
  const resolvedParams = await params;

  const report = await prisma.salesLog.findUnique({
    where: {
      id: resolvedParams.id,
      tenantId: actor.tenantId,
    },
    include: {
      station: {
        select: { id: true, name: true, code: true },
      },
      dippingClosing: { select: dippingClosingForReportSelect },
      recordedBy: userSelect,
      approvedBy: userSelect,
      posBankAccount: bankSelect,
      transferBankAccount: bankSelect,
      payments: paymentListInclude,
      debtRepayments: {
        select: repaymentSelect,
      },
      parentSale: {
        select: {
          id: true,
          logDate: true,
          createdAt: true,
          productType: true,
          litersSold: true,
          pricePerLiter: true,
          amountPos: true,
          amountTransfer: true,
          appliedCredit: true,
          posReceiptUrl: true,
          transferReceiptUrl: true,
          status: true,
          recordedBy: userSelect,
          approvedBy: userSelect,
          reason: true,
          posBankAccount: bankSelect,
          transferBankAccount: bankSelect,
          payments: paymentListInclude,
          debtRepayments: {
            select: repaymentSelect,
          },
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  let linkedDippingClosing = report.dippingClosing;
  if (!linkedDippingClosing?.session && report.dippingClosingId) {
    linkedDippingClosing = await prisma.dippingClosing.findFirst({
      where: {
        id: report.dippingClosingId,
        session: { tenantId: actor.tenantId },
      },
      select: dippingClosingForReportSelect,
    });
  }

  type DippingUiContext = {
    openingLiters: number;
    expectedOpening: number;
    sessionId: string;
    tankName: string;
    closingLiters: number;
  };

  let dippingContext: DippingUiContext | null = null;
  let dippingAlert: DippingUiContext | null = null;

  if (linkedDippingClosing?.session) {
    const session = linkedDippingClosing.session;
    const expectedOpening = await fetchExpectedOpeningBeforeSession(prisma, session);
    const openingLiters = Number(session.openingLiters);
    const base = {
      openingLiters,
      expectedOpening: expectedOpening ?? openingLiters,
      sessionId: session.id,
      tankName: session.tank.name,
      closingLiters: Number(linkedDippingClosing.closingLiters),
    };
    dippingContext = base;
    if (
      expectedOpening != null &&
      requiresOpeningGapConfirmation(expectedOpening, openingLiters)
    ) {
      dippingAlert = { ...base, expectedOpening };
    }
  }

  const serializedReport = JSON.parse(JSON.stringify(report));
  if (!serializedReport.dippingClosing && linkedDippingClosing) {
    serializedReport.dippingClosing = JSON.parse(JSON.stringify(linkedDippingClosing));
  }

  return (
    <SalesReportDetails
      report={serializedReport}
      dippingAlert={dippingAlert}
      dippingContext={dippingContext}
      canCorrectDipping={hasPermission(actor, PERMISSIONS.TENANT_DIPPINGS_WRITE.key)}
    />
  );
}

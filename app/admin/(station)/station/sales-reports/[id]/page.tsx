import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
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
  posReceiptUrl: true,
  transferReceiptUrl: true,
  recordedBy: userSelect,
  approvedBy: userSelect,
  reason: true,
  posBankAccount: bankSelect,
  transferBankAccount: bankSelect,
  payments: paymentListInclude,
};

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

  const serializedReport = JSON.parse(JSON.stringify(report));

  return <SalesReportDetails report={serializedReport} />;
}

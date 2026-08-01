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

export default async function SalesReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SHIFTS_READ.key);
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
      debtRepayments: {
        select: {
          id: true,
          amountPos: true,
          amountTransfer: true,
          status: true,
          logDate: true,
          posReceiptUrl: true,
          recordedBy: userSelect,
          approvedBy: userSelect,
          reason: true,

        },
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
          posReceiptUrl: true,
          status: true,
          recordedBy: userSelect,
          approvedBy: userSelect,
          reason: true,

          debtRepayments: {
            select: {
              id: true,
              amountPos: true,
              amountTransfer: true,
              status: true,
              logDate: true,
              posReceiptUrl: true,
              recordedBy: userSelect,
              approvedBy: userSelect,
              reason: true,

            }
          }
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

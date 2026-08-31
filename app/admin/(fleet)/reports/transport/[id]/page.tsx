import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { TransportReportDetailsManager } from "./transport-report-details-manager";
import {
  mapTransportReportDelivery,
  mapTransportReportRow,
  toNum,
} from "@/lib/fleet/transport-report";

export default async function TransportReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);
  const { id } = await params;

  const transport = await prisma.transport.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      truck: {
        select: { plateNumber: true },
      },
      driver: {
        select: { firstName: true, lastName: true },
      },
      transporter: {
        select: { id: true, name: true },
      },
      order: {
        select: { id: true, reference: true, sourceDepot: true },
      },
      deliveries: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          litersDespatched: true,
          litersReceived: true,
          amountPerLiter: true,
          transportRate: true,
          transportCost: true,
          transportCostBorneBy: true,
          customer: { select: { name: true } },
          station: { select: { name: true } },
        },
      },
      transactions: {
        select: {
          type: true,
          category: true,
          amount: true,
        },
      },
      lossLogs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          lossType: true,
          lostQuantity: true,
          expensesIncurred: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  if (!transport) {
    notFound();
  }

  const row = mapTransportReportRow(transport);

  return (
    <TransportReportDetailsManager
      transport={{
        ...row,
        deliveries: transport.deliveries.map(mapTransportReportDelivery),
        lossLogs: transport.lossLogs.map((log) => ({
          id: log.id,
          lossType: log.lossType,
          lostQuantity: toNum(log.lostQuantity),
          expensesIncurred: toNum(log.expensesIncurred),
          comment: log.comment,
          createdAt: log.createdAt.toISOString(),
        })),
      }}
    />
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PnlReportManager } from "./pnl-report-manager";

export default async function PnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_PNL_REPORTS_READ.key);

  const transactions = await prisma.transaction.findMany({
    where: { 
      tenantId: actor.tenantId,
      category: {
        in: ["STATION_SALE", "STATION_EXPENSE"]
      }
    },
    orderBy: { createdAt: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      }
    }
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const serializedTransactions = JSON.parse(JSON.stringify(transactions));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <PnlReportManager
      initialTransactions={serializedTransactions}
      stations={serializedStations}
    />
  );
}

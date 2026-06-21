import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SalesReportsManager } from "./sales-reports-manager";

export default async function SalesReportsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_OPERATIONS_READ.key);

  const salesReports = await prisma.dailySalesLog.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { logDate: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const serializedReports = JSON.parse(JSON.stringify(salesReports));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <SalesReportsManager
      initialReports={serializedReports}
      stations={serializedStations}
    />
  );
}

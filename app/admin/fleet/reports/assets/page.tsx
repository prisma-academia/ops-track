import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AssetsReportManager } from "./assets-report-manager";

export default async function AssetsReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId },
    include: {
      transports: {
        select: {
          id: true,
          litersCarried: true,
          status: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          deliveries: {
            select: {
              litersReceived: true,
              litersDespatched: true
            }
          }
        }
      },
      transactions: {
        where: {
          category: "FLEET_EXPENSE",
          type: "OUTFLOW"
        },
        select: {
          id: true,
          amount: true,
        }
      }
    },
    orderBy: { plateNumber: "asc" }
  });

  const serializedTrucks = JSON.parse(JSON.stringify(trucks));

  return (
    <AssetsReportManager
      initialTrucks={serializedTrucks}
    />
  );
}

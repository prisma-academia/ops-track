import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { StockMovementsManager, type StockMovementRow } from "./stock-movements-manager";

export const metadata = { title: "Stock Movements" };

export default async function StockMovementsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const stationWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const movementWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
  };

  const [stations, movements] = await Promise.all([
    prisma.station.findMany({
      where: stationWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: movementWhere,
      orderBy: { recordedAt: "desc" },
      include: {
        station: { select: { id: true, name: true, code: true } },
        tank: { select: { id: true, name: true, productType: true } },
        recordedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  const rows: StockMovementRow[] = movements.map((movement) => {
    const recordedBy = movement.recordedBy;
    const recordedByName = recordedBy
      ? `${recordedBy.firstName ?? ""} ${recordedBy.lastName ?? ""}`.trim() || recordedBy.email
      : "—";

    return {
      id: movement.id,
      stationId: movement.stationId,
      stationName: movement.station.name,
      stationCode: movement.station.code,
      tankId: movement.tankId,
      tankName: movement.tank.name,
      productType: movement.productType,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      balanceAfter: Number(movement.balanceAfter),
      notes: movement.notes,
      referenceType: movement.referenceType,
      recordedByName,
      recordedAt: movement.recordedAt.toISOString(),
    };
  });

  return (
    <StockMovementsManager
      initialRows={JSON.parse(JSON.stringify(rows))}
      stations={JSON.parse(JSON.stringify(stations))}
    />
  );
}

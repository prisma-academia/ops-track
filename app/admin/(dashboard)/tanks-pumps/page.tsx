import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cookies } from "next/headers";
import { TanksPumpsManager } from "./tanks-pumps-manager";

export default async function TanksPumpsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const userWithStations = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { stations: { select: { id: true } } },
  });
  const assignedStationIds = userWithStations?.stations.map((s) => s.id) || [];
  const isRestricted = !actor.isOwner && assignedStationIds.length > 0;

  const jar = await cookies();
  const activeStationId = jar.get("active-station-id")?.value || "all";

  let targetStationIds: string[] = [];
  if (activeStationId !== "all") {
    if (isRestricted) {
      if (assignedStationIds.includes(activeStationId)) {
        targetStationIds = [activeStationId];
      } else {
        targetStationIds = assignedStationIds;
      }
    } else {
      targetStationIds = [activeStationId];
    }
  } else if (isRestricted) {
    targetStationIds = assignedStationIds;
  }

  const stationFilter = targetStationIds.length > 0
    ? { id: { in: targetStationIds }, tenantId: actor.tenantId }
    : { tenantId: actor.tenantId };

  const tanks = await prisma.tank.findMany({
    where: {
      station: stationFilter,
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      dippings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const pumps = await prisma.pump.findMany({
    where: {
      station: stationFilter,
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      tank: {
        select: {
          id: true,
          name: true,
          productType: true,
        },
      },
      nozzles: true,
    },
    orderBy: { name: "asc" },
  });

  const stations = await prisma.station.findMany({
    where: stationFilter,
    select: {
      id: true,
      name: true,
      code: true,
      tanks: {
        select: {
          id: true,
          name: true,
          productType: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const serializedTanks = JSON.parse(JSON.stringify(tanks));
  const serializedPumps = JSON.parse(JSON.stringify(pumps));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  let passedActiveStationId = activeStationId;
  if (activeStationId === "all" && isRestricted && assignedStationIds.length === 1) {
    passedActiveStationId = assignedStationIds[0];
  }

  return (
    <TanksPumpsManager
      tanks={serializedTanks}
      pumps={serializedPumps}
      stations={serializedStations}
      activeStationId={passedActiveStationId}
    />
  );
}

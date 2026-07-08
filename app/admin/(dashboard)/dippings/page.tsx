import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cookies } from "next/headers";
import { DippingsManager } from "./dippings-manager";

export default async function DippingsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_DIPPINGS_READ.key);

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

  const dippings = await prisma.tankDipping.findMany({
    where: {
      tank: {
        station: stationFilter,
      },
    },
    include: {
      tank: {
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

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
    },
    orderBy: { name: "asc" },
  });

  const activeShifts = await prisma.shiftLog.findMany({
    where: {
      closingMeter: null,
      nozzle: {
        pump: {
          station: stationFilter,
        },
      },
    },
    include: {
      nozzle: {
        include: {
          pump: {
            select: {
              id: true,
              name: true,
              tankId: true,
              stationId: true,
            },
          },
        },
      },
      attendant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const serializedDippings = JSON.parse(JSON.stringify(dippings));
  const serializedTanks = JSON.parse(JSON.stringify(tanks));
  const serializedActiveShifts = JSON.parse(JSON.stringify(activeShifts));

  let passedActiveStationId = activeStationId;
  if (activeStationId === "all" && isRestricted && assignedStationIds.length === 1) {
    passedActiveStationId = assignedStationIds[0];
  }

  return (
    <DippingsManager
      dippings={serializedDippings}
      tanks={serializedTanks}
      activeShifts={serializedActiveShifts}
      activeStationId={passedActiveStationId}
    />
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cookies } from "next/headers";
import { ShiftsManager } from "./shifts-manager";

export default async function ShiftsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SHIFTS_READ.key);

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

  const shifts = await prisma.shiftLog.findMany({
    where: {
      tenantId: actor.tenantId,
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
      reconciledBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { shiftDate: "desc" },
      { createdAt: "desc" }
    ],
    take: 200,
  });

  const stations = await prisma.station.findMany({
    where: stationFilter,
    select: {
      id: true,
      name: true,
      code: true,
      pumps: {
        select: {
          id: true,
          name: true,
          tank: {
            select: {
              id: true,
              name: true,
              productType: true,
            },
          },
          nozzles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const tenantUsers = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { email: "asc" },
  });

  const serializedShifts = JSON.parse(JSON.stringify(shifts));
  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedTenantUsers = JSON.parse(JSON.stringify(tenantUsers));

  let passedActiveStationId = activeStationId;
  if (activeStationId === "all" && isRestricted && assignedStationIds.length === 1) {
    passedActiveStationId = assignedStationIds[0];
  }

  return (
    <ShiftsManager
      shifts={serializedShifts}
      stations={serializedStations}
      tenantUsers={serializedTenantUsers}
      activeStationId={passedActiveStationId}
    />
  );
}

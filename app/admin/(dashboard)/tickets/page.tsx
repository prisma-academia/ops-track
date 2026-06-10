import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cookies } from "next/headers";
import { TicketsManager } from "./tickets-manager";

export default async function TicketsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_TICKETS_READ.key);

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

  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId: actor.tenantId,
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
      raisedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const stations = await prisma.station.findMany({
    where: stationFilter,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const serializedTickets = JSON.parse(JSON.stringify(tickets));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  let passedActiveStationId = activeStationId;
  if (activeStationId === "all" && isRestricted && assignedStationIds.length === 1) {
    passedActiveStationId = assignedStationIds[0];
  }

  return (
    <TicketsManager
      tickets={serializedTickets}
      stations={serializedStations}
      activeStationId={passedActiveStationId}
    />
  );
}

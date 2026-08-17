import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TicketsManager } from "./tickets-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export const metadata = { title: "Tickets | Rafuel" };

export default async function TicketsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const ticketWhere: any = { tenantId: actor.tenantId };
  if (activeOrgId) {
    ticketWhere.station = { organizationId: activeOrgId };
  }

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    orderBy: { createdAt: "desc" },
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
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      varianceLog: true,
    },
  });

  const stations = await prisma.station.findMany({
    where: stationWhere,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const serializedTickets = JSON.parse(JSON.stringify(tickets));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <TicketsManager
      initialTickets={serializedTickets}
      stations={serializedStations}
    />
  );
}

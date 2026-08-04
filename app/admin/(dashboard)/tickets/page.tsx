import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TicketsManager } from "./tickets-manager";

export const metadata = { title: "Tickets | Rafuel" };

export default async function TicketsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  const tickets = await prisma.ticket.findMany({
    where: { tenantId: actor.tenantId },
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
    where: { tenantId: actor.tenantId },
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

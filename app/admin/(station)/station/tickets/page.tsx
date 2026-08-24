import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { TicketsManager } from "./tickets-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import { withOriginStory } from "@/lib/tickets/ticket-service";

export const metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const actor = await requireTenantPage(undefined, "STATION");
  if (
    !hasPermission(actor, PERMISSIONS.TENANT_TICKETS_READ.key) &&
    !hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_READ.key)
  ) {
    redirect("/admin/station");
  }

  const activeOrgId = await resolveActiveOrgId(actor);

  const ticketWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
  };

  const stationWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    orderBy: { createdAt: "desc" },
    include: TICKET_INCLUDE,
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

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { tenantId: actor.tenantId, scope: "STATION", isActive: true },
    select: { id: true, bankName: true, accountName: true, accountNumber: true },
    orderBy: { bankName: "asc" },
  });

  const serializedTickets = JSON.parse(JSON.stringify(tickets.map(withOriginStory)));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <Suspense>
      <TicketsManager
        initialTickets={serializedTickets}
        stations={serializedStations}
        bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
        canCreate={hasPermission(actor, PERMISSIONS.TENANT_TICKETS_WRITE.key)}
      />
    </Suspense>
  );
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import { withOriginStory } from "@/lib/tickets/ticket-service";
import { TicketDetails } from "./ticket-details";
import { orgStationBankAccountWhere } from "@/lib/bank-accounts/queries";

export const metadata = { title: "Ticket details" };

export default async function TicketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(undefined, "STATION");
  if (
    !hasPermission(actor, PERMISSIONS.TENANT_TICKETS_READ.key) &&
    !hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_READ.key)
  ) {
    redirect("/admin/station");
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: TICKET_INCLUDE,
  });

  if (!ticket || ticket.tenantId !== actor.tenantId) {
    notFound();
  }

  const bankAccounts = await prisma.bankAccount.findMany({
    where: orgStationBankAccountWhere({
      tenantId: actor.tenantId,
      stationId: ticket.stationId,
      isActive: true,
    }),
    select: { id: true, bankName: true, accountName: true, accountNumber: true },
    orderBy: { bankName: "asc" },
  });

  return (
    <TicketDetails
      ticket={JSON.parse(JSON.stringify(withOriginStory(ticket)))}
      canResolve={hasPermission(actor, PERMISSIONS.TENANT_TICKETS_WRITE.key)}
      bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { TICKET_INCLUDE } from "@/lib/tickets/includes";
import { withOriginStory } from "@/lib/tickets/ticket-service";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import {
  ORGANIZATION_BRAND_SELECT,
  printCompanyFromOrganization,
} from "@/lib/print/org-branding";
import { Button } from "@/components/ui/button";
import { TicketPrintView } from "./ticket-print-view";

export const metadata = { title: "Print ticket" };

export default async function PrintTicketPage({
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

  const station = ticket.stationId
    ? await prisma.station.findUnique({
        where: { id: ticket.stationId },
        select: { organization: { select: ORGANIZATION_BRAND_SELECT } },
      })
    : null;

  let company = station?.organization
    ? printCompanyFromOrganization(station.organization)
    : null;

  if (!company) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: {
        name: true,
        companyEmail: true,
        companyPhone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        region: true,
        settingsJson: true,
      },
    });

    let logoUrl: string | null = null;
    if (tenant?.settingsJson) {
      const settings = tenant.settingsJson as { logoKey?: string };
      if (settings.logoKey) {
        if (settings.logoKey.startsWith("http")) {
          logoUrl = settings.logoKey;
        } else if (s3Configured()) {
          logoUrl = publicUrlForKey(settings.logoKey);
        }
      }
    }

    company = {
      name: tenant?.name || "Company",
      slug: null,
      logoUrl,
      email: tenant?.companyEmail ?? null,
      phone: tenant?.companyPhone ?? null,
      address:
        [tenant?.addressLine1, tenant?.addressLine2, tenant?.city, tenant?.region].filter(Boolean).join(", ") || null,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/admin/station/tickets/${ticket.id}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Print ticket</h1>
          <p className="mt-1 text-muted-foreground">
            {ticket.title} • {ticket.station?.name || "Station"}
          </p>
        </div>
      </div>

      <TicketPrintView ticket={JSON.parse(JSON.stringify(withOriginStory(ticket)))} company={company} />
    </div>
  );
}

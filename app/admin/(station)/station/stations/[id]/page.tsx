import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { StationDetailsManager } from "./station-details-manager";

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const station = await prisma.station.findUnique({
    where: { id },
    include: {
      staff: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      tanks: true,
      pumps: {
        include: {
          nozzles: true,
          tank: true,
        },
      },
      priceControls: {
        orderBy: { effectiveFrom: "desc" },
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        include: {
          raisedBy: { select: { firstName: true, lastName: true, email: true } },
          approvedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!station || station.tenantId !== actor.tenantId) {
    redirect("/admin/station/stations");
  }

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    orderBy: { email: "asc" },
  });

  const serializedStation = JSON.parse(JSON.stringify(station));

  return (
    <StationDetailsManager
      station={serializedStation}
      users={users}
    />
  );
}

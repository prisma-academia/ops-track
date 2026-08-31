import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { reconcileNegativeTanks } from "@/lib/inventory/tank-balance";
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
      tanks: {
        include: {
          dippingSessions: {
            where: { closings: { some: {} } },
            orderBy: { openedAt: "desc" as const },
            take: 1,
            include: {
              closings: {
                orderBy: { recordedAt: "desc" as const },
                take: 1,
                select: { closingLiters: true, recordedAt: true },
              },
            },
          },
        },
      },
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

  const negativeTankIds = station.tanks
    .filter((tank) => Number(tank.currentLiters) < 0)
    .map((tank) => tank.id);

  if (negativeTankIds.length > 0) {
    await prisma.$transaction((tx) => reconcileNegativeTanks(tx as never, negativeTankIds));
    const repairedTanks = await prisma.tank.findMany({
      where: { stationId: id },
      include: {
        dippingSessions: {
          where: { closings: { some: {} } },
          orderBy: { openedAt: "desc" },
          take: 1,
          include: {
            closings: {
              orderBy: { recordedAt: "desc" },
              take: 1,
              select: { closingLiters: true, recordedAt: true },
            },
          },
        },
      },
    });
    station.tanks = repairedTanks;
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

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
      tanks: {
        include: {
          dippings: {
            orderBy: { recordedAt: "desc" },
            take: 100,
          },
        },
      },
      pumps: {
        include: {
          nozzles: {
            include: {
              shiftLogs: {
                orderBy: { shiftDate: "desc" },
                include: {
                  attendant: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
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
      dailySalesLogs: {
        orderBy: { logDate: "desc" },
        take: 30,
      },
      waybills: {
        orderBy: { dispatchedAt: "desc" },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!station || station.tenantId !== actor.tenantId) {
    redirect("/admin/stations");
  }

  // Fetch all tenant users to allow assigning attendants/cashiers in modals
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

  const serializedStation = JSON.parse(JSON.stringify(station));
  const serializedTenantUsers = JSON.parse(JSON.stringify(tenantUsers));

  return (
    <StationDetailsManager
      station={serializedStation}
      tenantUsers={serializedTenantUsers}
      currentUserId={actor.userId}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { TenantProfileView } from "@/components/profile/tenant-profile-view";

export default async function StationProfilePage() {
  const actor = await requireTenantPage(undefined, "STATION");
  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          companyEmail: true,
          companyPhone: true,
          activeModules: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
        },
      },
      stations: {
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!user || user.tenantId !== actor.tenantId) {
    notFound();
  }

  const initialUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    otherName: user.otherName,
    phone: user.phone,
    isOwner: user.isOwner,
    status: user.status,
    bannedReason: user.bannedReason,
    activeModules: user.activeModules,
    stationPermissions: user.stationPermissions,
    fleetPermissions: user.fleetPermissions,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    tenant: user.tenant,
    organization: user.organization,
    stations: user.stations,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" backHref="/admin/station" />
      <TenantProfileView initialUser={initialUser} />
    </div>
  );
}

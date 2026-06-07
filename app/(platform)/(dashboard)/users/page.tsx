import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { PlatformUsersDashboard } from "./users-dashboard";

export default async function PlatformUsersPage() {
  const actor = await requirePlatformPage(PERMISSIONS.PLATFORM_USERS_READ.key);
  
  const canInvite = hasPermission(actor, PERMISSIONS.PLATFORM_USERS_WRITE.key);

  const users = await prisma.platformUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      isSuperAdmin: true,
      lastLoginAt: true,
    },
  });

  const rows = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <PlatformUsersDashboard
      initialUsers={rows}
      canInvite={canInvite}
    />
  );
}

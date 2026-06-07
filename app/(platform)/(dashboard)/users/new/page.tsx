import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, ALL_PLATFORM_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { InviteUserForm } from "./invite-form";

export default async function NewPlatformUserPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_USERS_WRITE.key);
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "PLATFORM" },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true },
  });
  return (
    <div>
      <PageHeader title="Invite platform user" />
      <InviteUserForm roles={roles} allPermissions={ALL_PLATFORM_PERMISSION_KEYS} />
    </div>
  );
}

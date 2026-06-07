import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { ALL_PLATFORM_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { RoleDetailEditor } from "./editor";

export default async function PlatformRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformPage(PERMISSIONS.PLATFORM_ROLES_READ.key);
  const { id } = await params;
  const role = await prisma.roleTemplate.findUnique({ where: { id } });
  if (!role || role.scope !== "PLATFORM") notFound();
  return (
    <div>
      <PageHeader title={role.name} />
      <Card>
        <RoleDetailEditor
          id={role.id}
          name={role.name}
          isSystem={role.isSystem}
          initial={role.permissions}
          allPermissions={ALL_PLATFORM_PERMISSION_KEYS}
          endpoint={`/api/platform/role-templates/${role.id}`}
        />
      </Card>
    </div>
  );
}

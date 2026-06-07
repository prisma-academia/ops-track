import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { RolesTable } from "./table";

export default async function PlatformRolesPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_ROLES_READ.key);
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "PLATFORM" },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isSystem: true, permissions: true, createdAt: true },
  });
  const rows = roles.map((r) => ({
    ...r,
    permissionCount: r.permissions.length,
    createdAt: r.createdAt.toISOString(),
  }));
  return (
    <div>
      <DataTableToolbar title="Platform role templates" createHref="/role-templates/new" createLabel="New role" />
      <RolesTable data={rows} />
    </div>
  );
}

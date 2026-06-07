import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TenantsTable } from "./table";
import { DataTableToolbar } from "@/components/data-table-toolbar";

export default async function TenantsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      companyEmail: true,
      createdAt: true,
    },
  });
  const rows = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));
  return (
    <div>
      <DataTableToolbar title="Tenants" createHref="/tenants/new" createLabel="New tenant" />
      <TenantsTable data={rows} />
    </div>
  );
}

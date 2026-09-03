import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { resolveLogoUrl } from "@/lib/email/branding";
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
      settingsJson: true,
      users: {
        where: { isOwner: true },
        take: 1,
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });
  const rows = tenants.map((t) => {
    const owner = t.users[0];
    const ownerName = owner
      ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email
      : null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      companyEmail: t.companyEmail,
      createdAt: t.createdAt.toISOString(),
      logoUrl: resolveLogoUrl(parseTenantSettings(t.settingsJson).logoKey),
      ownerName,
    };
  });
  return (
    <div>
      <DataTableToolbar
        title="Tenants"
        description="Workspaces on the platform"
        createHref="/tenants/new"
        createLabel="New tenant"
      />
      <TenantsTable data={rows} />
    </div>
  );
}

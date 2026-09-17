import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { DemoRequestsTable } from "./_table";
import { DataTableToolbar } from "@/components/data-table-toolbar";

export default async function DemoRequestsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);

  const rows = await prisma.demoRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <DataTableToolbar
        title={`Demo Requests${pendingCount > 0 ? ` (${pendingCount} new)` : ""}`}
        description="Incoming leads from the Book a Demo form"
      />
      <DemoRequestsTable data={rows.map((r) => ({
        id: r.id,
        companyName: r.companyName,
        contactName: r.contactName,
        email: r.email,
        interestedIn: r.interestedIn,
        country: r.country,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))} />
    </div>
  );
}
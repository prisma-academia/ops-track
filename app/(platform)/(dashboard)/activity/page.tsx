import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { ActivityTable } from "./table";

export default async function PlatformActivityPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const data = rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    actorType: r.actorType,
    actorId: r.actorId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
  }));
  return (
    <div>
      <PageHeader title="System activity" />
      <ActivityTable data={data} />
    </div>
  );
}

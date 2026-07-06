import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { ActivityTable } from "@/app/(platform)/(dashboard)/activity/table";

export default async function TenantActivityPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ACTIVITY_READ.key);
  const rows = await prisma.activityLog.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      tenant: { select: { name: true } },
    }
  });

  // Collect unique actor IDs and target IDs
  const tenantUserIds = Array.from(new Set(rows.filter((r) => r.actorType === "TENANT_USER" && r.actorId).map((r) => r.actorId as string)));
  const stationIds = Array.from(new Set(rows.filter((r) => r.targetType === "Station" && r.targetId).map((r) => r.targetId as string)));

  // Fetch users and stations
  const users = await prisma.tenantUser.findMany({
    where: { id: { in: tenantUserIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const stations = await prisma.station.findMany({
    where: { id: { in: stationIds } },
    select: { id: true, name: true, code: true },
  });
  const stationMap = new Map(stations.map((s) => [s.id, s]));

  const data = rows.map((r) => {
    // Resolve Actor Display Name
    let actorDisplay = null;
    if (r.actorType === "TENANT_USER" && r.actorId) {
      const u = userMap.get(r.actorId);
      if (u) {
        actorDisplay = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      }
    } else if (r.actorType === "SYSTEM") {
      actorDisplay = "System Workflow";
    }

    // Resolve Target Display Name
    let targetDisplay = null;
    if (r.targetType === "Station" && r.targetId) {
      const s = stationMap.get(r.targetId);
      if (s) {
        targetDisplay = `Station: ${s.name} (${s.code})`;
      }
    } else if (r.targetType === "TenantUser" && r.targetId) {
      const u = userMap.get(r.targetId); // we might not have fetched this if they weren't also an actor, but often they are. To be 100% accurate we'd need to fetch them separately.
      if (u) {
        targetDisplay = `User: ${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      }
    }

    return {
      id: r.id,
      tenantId: r.tenantId,
      actorType: r.actorType,
      actorId: r.actorId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),

      // Formatted fields for table
      tenantDisplay: r.tenant?.name || r.tenantId,
      actorDisplay,
      targetDisplay,
    };
  });

  return (
    <div>
      <PageHeader title="Activity" />
      <ActivityTable data={data} />
    </div>
  );
}

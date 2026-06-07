import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";

export default async function PlatformOverviewPage() {
  await requirePlatformPage();
  const [tenantCount, userCount, recentLogs] = await Promise.all([
    prisma.tenant.count(),
    prisma.platformUser.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Overview" />
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-xs uppercase text-stone-500">Tenants</div>
          <div className="mt-1 text-2xl font-semibold">{tenantCount}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-stone-500">Platform users</div>
          <div className="mt-1 text-2xl font-semibold">{userCount}</div>
        </Card>
      </div>
      <h2 className="mt-8 mb-2 text-sm font-semibold uppercase text-stone-500">Recent activity</h2>
      <Card>
        <ul className="divide-y divide-stone-100 text-sm">
          {recentLogs.length === 0 ? (
            <li className="py-3 text-stone-500">No activity yet.</li>
          ) : (
            recentLogs.map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span className="font-mono text-xs text-stone-700">{l.action}</span>
                <span className="text-xs text-stone-500">{l.createdAt.toISOString()}</span>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

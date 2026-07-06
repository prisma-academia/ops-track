import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";

export default async function FleetOverviewPage() {
  const actor = await requireTenantPage();
  
  // Dashboard stats
  const [transportersCount, trucksCount, driversCount, activeTransports] = await Promise.all([
    prisma.transporter.count({ where: { tenantId: actor.tenantId } }),
    prisma.truck.count({ where: { tenantId: actor.tenantId } }),
    prisma.driver.count({ where: { tenantId: actor.tenantId } }),
    prisma.transport.count({ where: { tenantId: actor.tenantId, status: "IN_TRANSIT" } }),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Fleet Overview</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Transporters</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{transportersCount}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Trucks</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{trucksCount}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Drivers</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{driversCount}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Transports</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{activeTransports}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

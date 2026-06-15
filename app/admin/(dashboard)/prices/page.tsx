import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PricesManager } from "./prices-manager";

export default async function PricesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_OPERATIONS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      region: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all prices ordered by most recent first
  const allPrices = await prisma.priceControl.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { effectiveFrom: "desc" },
  });

  // Derive current active price per station+product (latest with effectiveFrom <= now)
  const now = new Date();
  const currentPricesMap = new Map();
  for (const pc of allPrices) {
    if (new Date(pc.effectiveFrom) > now) continue;
    const key = `${pc.stationId}-${pc.productType}`;
    if (!currentPricesMap.has(key)) {
      currentPricesMap.set(key, pc);
    }
  }
  const currentPrices = Array.from(currentPricesMap.values());

  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedPrices = JSON.parse(JSON.stringify(currentPrices));
  const serializedAllPrices = JSON.parse(JSON.stringify(allPrices));

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Fuel Prices Management"
        description="Monitor and update fuel prices across all stations."
      />
      <PricesManager
        stations={serializedStations}
        currentPrices={serializedPrices}
        allPrices={serializedAllPrices}
      />
    </div>
  );
}

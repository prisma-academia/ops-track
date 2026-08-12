import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PricesManager } from "./prices-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function PricesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_PRICES_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const priceWhere: any = { tenantId: actor.tenantId };
  if (activeOrgId) {
    priceWhere.station = { organizationId: activeOrgId };
  }

  const stations = await prisma.station.findMany({
    where: stationWhere,
    select: {
      id: true,
      name: true,
      code: true,
      state: true,
      lga: true,
      ward: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all prices ordered by most recent first
  const allPrices = await prisma.priceControl.findMany({
    where: priceWhere,
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
        description="Monitor fuel prices across all stations."
        createHref="/admin/prices/update"
        createLabel="Update Prices"
      />
      <PricesManager
        stations={serializedStations}
        currentPrices={serializedPrices}
        allPrices={serializedAllPrices}
      />
    </div>
  );
}

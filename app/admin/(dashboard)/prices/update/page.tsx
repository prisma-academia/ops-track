import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { UpdatePricesManager } from "./update-prices-manager";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function UpdatePricesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_PRICES_WRITE.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
          <Link href="/admin/prices">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <DataTableToolbar
          title="Update Fuel Prices"
          description="Set new fuel prices for your selected stations."
        />
      </div>
      <UpdatePricesManager
        stations={serializedStations}
        currentPrices={serializedPrices}
        allPrices={serializedAllPrices}
      />
    </div>
  );
}

import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { PageHeader } from "@/components/shell";
import { ClientDispenseTerminal } from "./dispense-terminal";

export default async function ClientDispensePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_WRITE.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      location: true,
      state: true,
      priceControls: {
        orderBy: { effectiveFrom: "desc" },
        take: 5,
        select: {
          productType: true,
          pricePerLiter: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const serializedStations = stations.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    location: s.location,
    state: s.state,
    prices: s.priceControls.map((p) => ({
      productType: p.productType,
      price: Number(p.pricePerLiter),
    })),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader
        title="Corporate Client Fuel Dispensing Terminal"
        backHref="/admin/station/clients"
      />
      <ClientDispenseTerminal stations={serializedStations} />
    </div>
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { CreateWaybillForm } from "./create-form";

export default async function CreateWaybillPage() {
  const actor = await requireTenantPage();
  
  if (
    !actor.permissions.has(PERMISSIONS.TENANT_WAYBILLS_WRITE.key) && 
    !actor.permissions.has(PERMISSIONS.TENANT_FLEET_WRITE.key)
  ) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  // Fetch stations for allocation dropdown
  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch lookups: suppliers, depots, transportCompanies
  const [suppliers, depots, transportCompanies, tenant] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.depot.findMany({ orderBy: { name: "asc" } }),
    prisma.transporter.findMany({ orderBy: { name: "asc" } }),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { slug: true },
    }),
  ]);

  // Serialize to avoid Next.js serialization warnings
  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedSuppliers = JSON.parse(JSON.stringify(suppliers));
  const serializedDepots = JSON.parse(JSON.stringify(depots));
  const serializedTransportCompanies = JSON.parse(JSON.stringify(transportCompanies));

  return (
    <div className="space-y-6">
      <CreateWaybillForm
        stations={serializedStations}
        initialSuppliers={serializedSuppliers}
        initialDepots={serializedDepots}
        initialTransportCompanies={serializedTransportCompanies}
        tenantSlug={tenant?.slug || "TEN"}
      />
    </div>
  );
}

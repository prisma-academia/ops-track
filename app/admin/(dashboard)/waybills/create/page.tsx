import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateWaybillForm } from "./create-form";

export default async function CreateWaybillPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">New Fuel Dispatch</h2>
        <p className="text-muted-foreground">
          Create a new waybill to track fuel delivery to a retail station.
        </p>
      </div>

      <CreateWaybillForm stations={stations} />
    </div>
  );
}

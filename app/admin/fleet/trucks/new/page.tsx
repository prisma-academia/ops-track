import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTruckForm } from "./truck-form"; 

export default async function NewTruckPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <CreateTruckForm transporters={transporters} />
    </div>
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateDriverForm } from "./driver-form"; 

export default async function NewDriverPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <CreateDriverForm transporters={transporters} />
    </div>
  );
}

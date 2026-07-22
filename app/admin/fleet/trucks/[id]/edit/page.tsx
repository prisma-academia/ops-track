import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTruckForm } from "../../new/truck-form"; 

export default async function EditTruckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const truck = await prisma.truck.findFirst({
    where: { id, tenantId: actor.tenantId },
  });

  if (!truck) {
    notFound();
  }

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <CreateTruckForm transporters={transporters} truck={JSON.parse(JSON.stringify(truck))} />
    </div>
  );
}

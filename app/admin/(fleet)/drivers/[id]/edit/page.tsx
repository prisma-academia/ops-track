import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateDriverForm } from "../../new/driver-form"; 

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_DRIVERS_WRITE.key);

  const driver = await prisma.driver.findFirst({
    where: { id, tenantId: actor.tenantId },
  });

  if (!driver) {
    notFound();
  }

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <CreateDriverForm transporters={transporters} driver={JSON.parse(JSON.stringify(driver))} />
    </div>
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateSaleForm } from "./sale-form"; 

export default async function NewSalePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const customers = await prisma.customer.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  
  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId, status: { in: ["IN_TRANSIT", "COMPLETED"] } },
    select: { 
      id: true, 
      destination: true, 
      truck: { select: { name: true } },
      transporter: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <CreateSaleForm 
        customers={customers} 
        transports={transports} 
      />
    </div>
  );
}

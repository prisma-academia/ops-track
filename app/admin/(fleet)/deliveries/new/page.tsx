import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateSaleForm } from "./delivery-form"; 

export default async function NewSalePage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_WRITE.key);

  const customers = await prisma.customer.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  
  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  
  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId, status: { in: ["IN_TRANSIT", "COMPLETED"] } },
    select: { 
      id: true, 
      destination: true, 
      litersCarried: true,
      ratePerLiter: true,
      status: true,
      order: { select: { reference: true, productType: true, litersOrdered: true, supplier: true, sourceDepot: true, status: true } },
      deliveries: { select: { litersDespatched: true } },
      truck: { select: { name: true, plateNumber: true, capacityLiters: true } },
      transporter: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <CreateSaleForm 
        customers={customers} 
        stations={stations}
        transports={JSON.parse(JSON.stringify(transports))} 
        preselectedTransportId={typeof searchParams.transportId === 'string' ? searchParams.transportId : undefined}
      />
    </div>
  );
}

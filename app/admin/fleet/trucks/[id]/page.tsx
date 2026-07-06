import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TruckDetailsManager } from "./truck-details-manager";

export default async function TruckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const truck = await prisma.truck.findUnique({
    where: { id },
    include: {
      transporter: {
        select: { id: true, name: true, phone: true },
      },
      transports: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, reference: true, productType: true } },
        },
      },
    },
  });

  if (!truck || truck.tenantId !== actor.tenantId) {
    redirect("/admin/fleet/trucks");
  }

  const serializedTruck = JSON.parse(JSON.stringify(truck));

  return <TruckDetailsManager truck={serializedTruck} />;
}

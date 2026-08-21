import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { DriverDetailsManager } from "./driver-details-manager";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_DRIVERS_READ.key);

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      transporter: {
        select: { id: true, name: true, phone: true },
      },
      transports: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          truck: { select: { id: true, name: true, plateNumber: true } },
          order: { select: { id: true, reference: true, productType: true } },
        },
      },
    },
  });

  if (!driver || driver.tenantId !== actor.tenantId) {
    redirect("/admin/drivers");
  }

  const serializedDriver = JSON.parse(JSON.stringify(driver));

  return <DriverDetailsManager driver={serializedDriver} />;
}

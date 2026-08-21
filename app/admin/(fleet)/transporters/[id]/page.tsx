import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TransporterDetailsManager } from "./transporter-details-manager";

export default async function TransporterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key);

  const transporter = await prisma.transporter.findUnique({
    where: { id },
    include: {
      trucks: {
        orderBy: { createdAt: "desc" },
      },
      drivers: {
        orderBy: { createdAt: "desc" },
      },
      transports: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          truck: { select: { id: true, name: true, plateNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, reference: true, productType: true } },
        },
      },
    },
  });

  if (!transporter || transporter.tenantId !== actor.tenantId) {
    redirect("/admin/transporters");
  }

  // Parse to strip Dates to JSON compatible strings (like StationDetailsManager)
  const serializedTransporter = JSON.parse(JSON.stringify(transporter));

  return <TransporterDetailsManager transporter={serializedTransporter} />;
}

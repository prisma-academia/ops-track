import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { TransportDetailsManager } from "./transport-details-manager";

export default async function TransportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { id } = await params;

  const transport = await prisma.transport.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      order: true,
      transporter: true,
      truck: true,
      driver: true,
      lossLogs: {
        orderBy: { createdAt: "desc" }
      },
      sales: {
        include: { customer: true, station: true }
      }
    },
  });

  if (!transport) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <TransportDetailsManager transport={JSON.parse(JSON.stringify(transport))} />
    </div>
  );
}

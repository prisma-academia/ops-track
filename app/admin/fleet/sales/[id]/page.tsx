import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { SalesDetailsManager } from "./sales-details-manager";

export default async function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      customer: true,
      station: true,
      transport: {
        include: {
          transporter: true,
          truck: true,
          driver: true,
          order: true,
        }
      },
      transactions: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!sale) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SalesDetailsManager sale={JSON.parse(JSON.stringify(sale))} />
    </div>
  );
}

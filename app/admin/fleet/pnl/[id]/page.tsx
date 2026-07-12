import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { calculateOrderPnL } from "@/lib/fleet/financials";
import { PnLDetailedView } from "./pnl-detailed-view";

export default async function PnLDetailedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      transports: {
        include: {
          truck: true,
        }
      },
      transactions: {
        where: { category: "EXPENSE" }
      }
    },
  });

  if (!order || order.tenantId !== actor.tenantId) {
    redirect("/admin/fleet/pnl");
  }

  const pnl = await calculateOrderPnL(order.id);
  const serializedOrder = JSON.parse(JSON.stringify(order));

  return <PnLDetailedView order={serializedOrder} pnl={pnl} />;
}

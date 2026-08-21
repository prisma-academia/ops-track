import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { WaybillPrintView } from "../waybill-print-view";

export default async function PrintSaleWaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_READ.key);
  const { id } = await params;

  const delivery = await prisma.delivery.findFirst({
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
    },
  });

  if (!delivery) notFound();

  return (
    <>
      <WaybillPrintView delivery={JSON.parse(JSON.stringify(delivery))} />
      <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />
    </>
  );
}


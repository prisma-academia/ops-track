import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTransporterForm } from "../../new/transporter-form"; 

export default async function EditTransporterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_TRUCKS_WRITE.key);

  const transporter = await prisma.transporter.findFirst({
    where: { id, tenantId: actor.tenantId },
  });

  if (!transporter) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CreateTransporterForm transporter={JSON.parse(JSON.stringify(transporter))} />
    </div>
  );
}

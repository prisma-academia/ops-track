import { PERMISSIONS, requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { TankDetailsClient } from "./tank-details-client";

export default async function TankDetailsPage(props: {
  params: Promise<{ id: string; tankId: string }>;
}) {
  const params = await props.params;
  const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key);

  const tank = await prisma.tank.findFirst({
    where: {
      id: params.tankId,
      stationId: params.id,
      tenantId: actor.tenantId,
    },
  });

  if (!tank) {
    notFound();
  }

  const serializedTank = JSON.parse(JSON.stringify(tank));

  return (
    <div className="p-6">
      <TankDetailsClient stationId={params.id} tankId={params.tankId} tank={serializedTank} />
    </div>
  );
}

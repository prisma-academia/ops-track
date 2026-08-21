import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { NoAccessView } from "@/components/no-access";

export default async function FleetUnauthorizedPage() {
  const actor = await requireTenantPage(undefined, "FLEET");
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { activeModules: true },
  });
  const hasStation = tenant?.activeModules.includes("STATION") ?? false;

  return (
    <NoAccessView
      homeHref={hasStation ? "/admin/station" : undefined}
      homeLabel={hasStation ? "Open Station" : undefined}
    />
  );
}

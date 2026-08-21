import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { NoAccessView } from "@/components/no-access";

export default async function StationUnauthorizedPage() {
  const actor = await requireTenantPage(undefined, "STATION");
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { activeModules: true },
  });
  const hasFleet = tenant?.activeModules.includes("FLEET") ?? false;

  return (
    <NoAccessView
      homeHref={hasFleet ? "/admin" : undefined}
      homeLabel={hasFleet ? "Open Fleet" : undefined}
    />
  );
}

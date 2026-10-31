import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { parseTenantSettings } from "@/lib/tenant/settings";

type CapacityResource = "users" | "stations" | "organizations";

const LABELS: Record<CapacityResource, string> = {
  users: "users",
  stations: "stations",
  organizations: "organizations",
};

/** Enforce platform-set limits from tenant settings. Throws when the cap is reached. */
export async function assertTenantCapacity(tenantId: string, resource: CapacityResource) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

  const settings = parseTenantSettings(tenant.settingsJson);
  const max =
    resource === "users"
      ? settings.maxUsers
      : resource === "stations"
        ? settings.maxStations
        : settings.maxOrganizations;

  const count =
    resource === "users"
      ? await prisma.tenantUser.count({ where: { tenantId } })
      : resource === "stations"
        ? await prisma.station.count({ where: { tenantId } })
        : await prisma.organization.count({ where: { tenantId } });

  if (count >= max) {
    throw new DomainError(
      403,
      "capacity_reached",
      `This workspace is limited to ${max} ${LABELS[resource]}. Ask OpsTrack to raise the limit.`,
    );
  }
}

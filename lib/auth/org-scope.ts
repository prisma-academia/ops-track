import { TenantActor } from "./permissions";
import { AuthError } from "./guards";
import { prisma } from "@/lib/db/client";
import { cookies } from "next/headers";

/**
 * For Station module queries: fleet-wide users see only INTERNAL org stations.
 * Org-scoped users see only their org's stations.
 */
export function stationModuleFilter(actor: TenantActor, tenantInternalOrgId: string) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  // Fleet-wide user in Station module -> only internal org
  return { organizationId: tenantInternalOrgId };
}

/**
 * For Fleet module queries: fleet-wide users see ALL orgs.
 * Org-scoped users see only their org.
 * Dual membership (FLEET + STATION): fleet stays tenant-wide even if
 * organizationId is set for the station side.
 */
export function fleetModuleFilter(actor: TenantActor) {
  const hasFleet = actor.activeModules.includes("FLEET");
  const hasStation = actor.activeModules.includes("STATION");
  if (hasFleet && hasStation) {
    return {};
  }
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  return {}; // No filter -> see all
}

/**
 * Generic org filter for org-scoped users.
 * Org-scoped users see only their org. Fleet-wide users see all.
 */
export function genericOrgFilter(actor: TenantActor) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId };
  }
  return {}; // No filter -> see all
}

/**
 * Throws 403 if actor tries to access a resource outside their org scope.
 */
export function assertOrgAccess(actor: TenantActor, resourceOrgId: string | null): void {
  if (actor.organizationId && actor.organizationId !== resourceOrgId) {
    throw new AuthError(403, "Access denied: resource belongs to a different organization.");
  }
}

/**
 * Resolves the effective organization ID for station module queries by reading
 * the `active-station-id` cookie. The cookie value can be:
 *   - "all"          → no org filter (fleet-wide users see everything)
 *   - a station ID   → resolve to that station's organizationId
 *   - an org ID      → use directly
 *
 * Org-scoped actors always return their own organizationId regardless of the cookie.
 * 
 * For use in Server Components (pages) only.
 */
export async function resolveActiveOrgId(actor: TenantActor): Promise<string | null> {
  // Org-scoped users are always locked to their own org
  if (actor.organizationId) {
    return actor.organizationId;
  }

  const jar = await cookies();
  const activeStationId = jar.get("active-station-id")?.value || "all";

  if (activeStationId === "all") {
    return null; // No org filter
  }

  // Try as a station ID first
  const station = await prisma.station.findUnique({
    where: { id: activeStationId },
    select: { organizationId: true },
  });
  if (station?.organizationId) {
    return station.organizationId;
  }

  // Try as an organization ID
  const org = await prisma.organization.findUnique({
    where: { id: activeStationId },
    select: { id: true },
  });
  if (org) {
    return org.id;
  }

  return null; // Fallback: no filter
}

/**
 * Same as resolveActiveOrgId but for API routes — reads the cookie from
 * the `cookies()` function from next/headers.
 */
export async function resolveActiveOrgIdFromCookie(actor: TenantActor): Promise<string | null> {
  return resolveActiveOrgId(actor);
}


import { TenantActor } from "./permissions";
import { AuthError } from "./guards";

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
 */
export function fleetModuleFilter(actor: TenantActor) {
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

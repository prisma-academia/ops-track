import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import { hasPermission, PERMISSIONS, isFleetPermissionKey, type TenantActor } from "@/lib/auth/permissions";
import { AuthError } from "@/lib/auth/guards";

export type MembershipMode = "FLEET" | "STATION";

export function canManageFleetUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_USERS_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_USERS_WRITE.key);
}

export function canWriteFleetUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_USERS_WRITE.key);
}

export function canManageStationUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_STATION_USERS_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_STATION_USERS_WRITE.key) ||
    canManageFleetUsers(actor);
}

export function canWriteStationUsers(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_STATION_USERS_WRITE.key) ||
    canWriteFleetUsers(actor);
}

export function canManageFleetRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_ROLES_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);
}

export function canWriteFleetRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);
}

export function canManageStationRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_STATION_ROLES_READ.key) ||
    hasPermission(actor, PERMISSIONS.TENANT_STATION_ROLES_WRITE.key) ||
    canManageFleetRoles(actor);
}

export function canWriteStationRoles(actor: TenantActor): boolean {
  return hasPermission(actor, PERMISSIONS.TENANT_STATION_ROLES_WRITE.key) ||
    canWriteFleetRoles(actor);
}

export function requireAnyPermission(actor: TenantActor, ok: boolean): void {
  if (!ok) throw new AuthError(403, "Forbidden.");
}

export function requireUserWriteAccess(
  actor: TenantActor,
  target: { organizationId: string | null; activeModules: Array<"STATION" | "FLEET"> | string[] },
): void {
  const stationOnly = target.activeModules.includes("STATION") && !target.activeModules.includes("FLEET");
  if (stationOnly) {
    requireAnyPermission(actor, canWriteStationUsers(actor));
    if (actor.organizationId && target.organizationId && actor.organizationId !== target.organizationId) {
      throw new AuthError(403, "Forbidden.");
    }
    return;
  }
  requireAnyPermission(actor, canWriteFleetUsers(actor));
}

export function filterPermissionsForModule(keys: string[], module: MembershipMode): string[] {
  if (module === "FLEET") return keys.filter((k) => isFleetPermissionKey(k));
  return keys.filter((k) => !isFleetPermissionKey(k));
}

export async function assertRoleUsable(params: {
  actor: TenantActor;
  roleId: string;
  mode: MembershipMode;
}): Promise<{
  id: string;
  name: string;
  module: "STATION" | "FLEET";
  permissions: string[];
  organizationId: string | null;
  isSystem: boolean;
}> {
  const role = await prisma.roleTemplate.findUnique({ where: { id: params.roleId } });
  if (!role || role.scope !== "TENANT" || role.tenantId !== params.actor.tenantId) {
    throw new DomainError(400, "invalid_role", "Role template not in this tenant.");
  }
  if (params.mode === "FLEET") {
    if (role.module !== "FLEET" || role.organizationId) {
      throw new DomainError(400, "invalid_role", "Fleet invites must use a fleet role template.");
    }
  } else {
    if (role.module !== "STATION") {
      throw new DomainError(400, "invalid_role", "Station invites must use a station role template.");
    }
    const orgId = params.actor.organizationId;
    if (role.organizationId && orgId && role.organizationId !== orgId) {
      throw new DomainError(403, "forbidden", "You can only use roles from your own organization.");
    }
    if (role.organizationId === null && !role.isSystem) {
      throw new DomainError(400, "invalid_role", "Custom station roles must belong to an organization.");
    }
  }
  return {
    id: role.id,
    name: role.name,
    module: role.module,
    permissions: role.permissions,
    organizationId: role.organizationId,
    isSystem: role.isSystem,
  };
}

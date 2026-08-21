import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { runWithContext, enterContext } from "@/lib/db/tenant-context";
import { getSession, readSessionToken } from "@/lib/auth/session";
import {
  PERMISSIONS,
  hasPermission,
  type PermissionKey,
  type PlatformActor,
  type TenantActor,
  type ClientActor,
} from "@/lib/auth/permissions";

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requirePlatformActor(permission?: PermissionKey): Promise<PlatformActor> {
  const token = await readSessionToken("PLATFORM");
  const session = await getSession(token);
  if (!session || session.userType !== "PLATFORM") {
    throw new AuthError(401, "Authentication required.");
  }
  if (session.scope !== "FULL") {
    throw new AuthError(401, "Must complete password change.");
  }
  // Bind platform context for the remainder of this request handler.
  enterContext({ mode: "platform", tenantId: null });
  const user = await prisma.platformUser.findUnique({
    where: { id: session.userId },
  });
  if (!user || user.status !== "ACTIVE") throw new AuthError(401, "User not found or inactive.");

  const actor: PlatformActor = {
    kind: "platform",
    userId: user.id,
    isSuperAdmin: user.isSuperAdmin,
    permissions: new Set(user.permissions),
  };
  if (permission && !hasPermission(actor, permission)) {
    throw new AuthError(403, "Forbidden.");
  }
  return actor;
}

export async function requireTenantActor(
  permission?: PermissionKey,
  module?: "FLEET" | "STATION"
): Promise<TenantActor> {
  const token = await readSessionToken("TENANT");
  const session = await getSession(token);
  if (!session || session.userType !== "TENANT" || !session.tenantId) {
    throw new AuthError(401, "Authentication required.");
  }
  if (session.scope !== "FULL") {
    throw new AuthError(401, "Must complete password change.");
  }
  // Bind tenant context for the remainder of this request handler.
  enterContext({ mode: "tenant-admin", tenantId: session.tenantId });
  const user = await prisma.tenantUser.findUnique({
    where: { id: session.userId },
  });
  if (!user || user.status !== "ACTIVE" || user.tenantId !== session.tenantId) {
    throw new AuthError(401, "User not found or inactive.");
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { activeModules: true }
  });

  if (module && tenant && !tenant.activeModules.includes(module)) {
    throw new AuthError(403, `Module ${module} is not enabled for this tenant.`);
  }

  const actor: TenantActor = {
    kind: "tenant",
    userId: user.id,
    tenantId: user.tenantId,
    isOwner: user.isOwner,
    organizationId: user.organizationId,
    permissions: new Set([...user.stationPermissions, ...user.fleetPermissions]),
  };
  const scopedPermissions =
    module === "FLEET"
      ? user.fleetPermissions
      : module === "STATION"
        ? user.stationPermissions
        : [...user.stationPermissions, ...user.fleetPermissions];
  if (
    permission &&
    !hasPermission({ ...actor, permissions: new Set(scopedPermissions) }, permission)
  ) {
    throw new AuthError(403, "Forbidden.");
  }
  return actor;
}

export async function requireClientActor(): Promise<ClientActor> {
  const token = await readSessionToken("CLIENT");
  const session = await getSession(token);
  if (!session || session.userType !== "CLIENT" || !session.tenantId) {
    throw new AuthError(401, "Authentication required.");
  }
  if (session.scope !== "FULL") {
    throw new AuthError(401, "Must complete password change.");
  }
  // Bind tenant-client context for the remainder of this request handler.
  enterContext({ mode: "tenant-client", tenantId: session.tenantId });
  const client = await prisma.client.findUnique({
    where: { id: session.userId },
  });
  if (!client || client.status !== "ACTIVE" || client.tenantId !== session.tenantId) {
    throw new AuthError(401, "Client not found or inactive.");
  }
  return { kind: "client", clientId: client.id, tenantId: client.tenantId };
}

/**
 * Run `fn` bound to the actor's tenant so the Prisma tenant-scope guard
 * (lib/db/extension.ts) injects the correct tenantId. Use for tenant/client
 * API route bodies after the guard succeeds.
 */
export function withTenantContext<T>(
  actor: TenantActor | ClientActor,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return runWithContext(
    {
      mode: actor.kind === "client" ? "tenant-client" : "tenant-admin",
      tenantId: actor.tenantId,
    },
    fn
  );
}

/** Run `fn` in platform context (no bound tenant). */
export function withPlatformContext<T>(fn: () => Promise<T> | T): Promise<T> | T {
  return runWithContext({ mode: "platform", tenantId: null }, fn);
}

export async function resolvedHostMode(): Promise<{ mode: string; tenantId: string | null }> {
  const h = await headers();
  return {
    mode: h.get("x-app-mode") ?? "platform",
    tenantId: h.get("x-tenant-id"),
  };
}

export { PERMISSIONS };

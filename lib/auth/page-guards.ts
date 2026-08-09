import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, readSessionToken } from "@/lib/auth/session";
import { enterContext } from "@/lib/db/tenant-context";
import {
  hasPermission,
  type PermissionKey,
  type PlatformActor,
  type TenantActor,
  type ClientActor,
} from "@/lib/auth/permissions";

/**
 * Redirect-based page mirrors of the API guards in `lib/auth/guards.ts`.
 *
 * API guards throw `AuthError`; server components/layouts cannot surface that
 * as a useful response, so these validate the session the same way (revoked /
 * expired via `getSession`, user status, scope) and `redirect()` instead.
 * They bind the Prisma tenant context (`enterContext`) just like the API
 * guards, so callers can query immediately after. Fail-closed.
 */

export async function requirePlatformPage(
  permission?: PermissionKey
): Promise<PlatformActor> {
  const session = await getSession(await readSessionToken("PLATFORM"));
  if (!session || session.userType !== "PLATFORM") redirect("/auth/login");
  if (session.scope === "MUST_CHANGE_PASSWORD") {
    redirect("/auth/change-password");
  }
  enterContext({ mode: "platform", tenantId: null });
  const user = await prisma.platformUser.findUnique({
    where: { id: session.userId },
  });
  if (!user || user.status !== "ACTIVE") redirect("/auth/login");

  const actor: PlatformActor = {
    kind: "platform",
    userId: user.id,
    isSuperAdmin: user.isSuperAdmin,
    permissions: new Set(user.permissions),
  };
  if (permission && !hasPermission(actor, permission)) redirect("/dashboard?error=unauthorized");
  return actor;
}

export async function requireTenantPage(
  permission?: PermissionKey
): Promise<TenantActor> {
  const session = await getSession(await readSessionToken("TENANT"));
  if (!session || session.userType !== "TENANT" || !session.tenantId) {
    redirect("/admin/auth/login");
  }
  if (session.scope === "MUST_CHANGE_PASSWORD") {
    redirect("/admin/auth/change-password");
  }
  enterContext({ mode: "tenant-admin", tenantId: session.tenantId });
  const user = await prisma.tenantUser.findUnique({
    where: { id: session.userId },
  });
  if (!user || user.status !== "ACTIVE" || user.tenantId !== session.tenantId) {
    redirect("/admin/auth/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { status: true },
  });
  if (!tenant) redirect("/admin/auth/login");
  if (tenant.status !== "ACTIVE") redirect("/maintenance");

  const actor: TenantActor = {
    kind: "tenant",
    userId: user.id,
    tenantId: user.tenantId,
    isOwner: user.isOwner,
    organizationId: user.organizationId,
    permissions: new Set([...user.stationPermissions, ...user.fleetPermissions]),
  };
  if (permission && !hasPermission(actor, permission)) {
    redirect("/admin/dashboard?error=unauthorized");
  }
  return actor;
}

export async function requireClientPage(): Promise<ClientActor> {
  const session = await getSession(await readSessionToken("CLIENT"));
  if (!session || session.userType !== "CLIENT" || !session.tenantId) {
    redirect("/auth/login");
  }
  if (session.scope === "MUST_CHANGE_PASSWORD") {
    redirect("/auth/change-password");
  }
  enterContext({ mode: "tenant-client", tenantId: session.tenantId });
  const client = await prisma.client.findUnique({
    where: { id: session.userId },
  });
  if (
    !client ||
    client.status !== "ACTIVE" ||
    client.tenantId !== session.tenantId
  ) {
    redirect("/auth/login");
  }
  return { kind: "client", clientId: client.id, tenantId: client.tenantId };
}

const DASHBOARD_BY_AREA = {
  platform: { type: "PLATFORM", dest: "/dashboard" },
  admin: { type: "TENANT", dest: "/admin/dashboard" },
  client: { type: "CLIENT", dest: "/dashboard" },
} as const;

/**
 * Inverse guard for auth UIs (login / register / forgot / reset). If a valid
 * FULL-scope session exists, bounce to that area's dashboard. A
 * MUST_CHANGE_PASSWORD session is left alone so the user can still reach the
 * change-password page (which lives outside the guarded route group).
 */
export async function redirectIfAuthenticated(
  area: "platform" | "admin" | "client"
): Promise<void> {
  const { type, dest } = DASHBOARD_BY_AREA[area];
  const session = await getSession(await readSessionToken(type));
  if (!session) return;
  if (session.scope === "MUST_CHANGE_PASSWORD") return;
  redirect(dest);
}

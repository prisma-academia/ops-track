import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import {
  runWithContext,
  enterContext,
  type ContextMode,
} from "@/lib/db/tenant-context";

/**
 * Helpers for server components (RSC pages/layouts) to bind the Prisma
 * tenant-scope guard. Unlike API routes there is no actor guard here, so the
 * tenant is resolved from the subdomain.
 */

export type TenantPageContext = {
  tenant: { id: string; slug: string; name: string; status: string } | null;
  /** "tenant" | "platform" | "unknown" from host resolution. */
  mode: "platform" | "tenant" | "unknown";
};

/**
 * Resolve the current host to a tenant (Tenant is a global model, so this
 * lookup is safe without a bound context).
 */
export async function loadTenantPageContext(): Promise<TenantPageContext> {
  const h = await headers();
  const ctx = resolveHost(h.get("host"));
  if (ctx.mode !== "tenant") return { tenant: null, mode: ctx.mode };
  const tenant = await prisma.tenant.findUnique({
    where: { slug: ctx.slug },
    select: { id: true, slug: true, name: true, status: true },
  });
  return { tenant, mode: "tenant" };
}

/**
 * Bind platform context for the rest of this server component's render.
 * Call at the top of platform dashboard pages that read NULLABLE_SCOPED
 * models (RoleTemplate / ActivityLog) so the Prisma guard lets them through.
 */
export function bindPlatformPageContext(): void {
  enterContext({ mode: "platform", tenantId: null });
}

/**
 * Resolve the tenant from the host and bind tenant context for the rest of
 * this server component's render. Returns the resolved tenant (or null).
 */
export async function bindTenantPageContext(
  mode: ContextMode = "tenant-admin"
): Promise<TenantPageContext> {
  const page = await loadTenantPageContext();
  if (page.tenant) {
    enterContext({ mode, tenantId: page.tenant.id });
  }
  return page;
}

/** Run `fn` with the Prisma guard bound to `tenantId`. */
export function inTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T> | T,
  mode: ContextMode = "tenant-admin"
): Promise<T> | T {
  return runWithContext({ mode, tenantId }, fn);
}

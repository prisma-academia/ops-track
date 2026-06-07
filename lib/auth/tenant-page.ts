import { notFound, redirect } from "next/navigation";
import {
  loadTenantPageContext,
  type TenantPageContext,
} from "@/lib/db/page-context";

/**
 * Guard for any route served on a tenant host (admin + client areas).
 *
 * - Platform / non-tenant host: pass through (returns the resolved context).
 * - Tenant host whose tenant row does NOT exist: `notFound()` → renders
 *   `app/not-found.tsx` at HTTP 404. This is the single place the
 *   "valid-format slug, no tenant" case is caught; `proxy.ts` is sync and
 *   cannot do a DB lookup.
 * - Tenant exists but is not ACTIVE: redirect to the maintenance screen
 *   (PRD §13 lifecycle).
 *
 * Does NOT bind the Prisma tenant context — the dashboard guards / layouts
 * do that after a successful session check.
 */
export async function requireExistingTenant(): Promise<TenantPageContext> {
  const page = await loadTenantPageContext();
  if (page.mode !== "tenant") return page;
  if (!page.tenant) notFound();
  if (page.tenant.status !== "ACTIVE") redirect("/maintenance");
  return page;
}

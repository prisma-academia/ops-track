import { prisma } from "@/lib/db/client";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

/**
 * Public, unauthenticated. Lists ACTIVE tenants for the platform login
 * "Go to your workspace" picker. `Tenant` is a global (non-scoped) model,
 * so this needs no bound tenant context. Suspended/archived tenants are
 * not advertised (fail-closed; matches login rejecting non-ACTIVE).
 */
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });
    return ok({ tenants });
  } catch (e) {
    return handleError(e);
  }
}

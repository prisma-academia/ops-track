import { prisma } from "@/lib/db/client";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { resolveLogoUrl } from "@/lib/email/branding";

/**
 * Public, unauthenticated. Lists ACTIVE tenants for the platform login
 * "Go to your workspace" picker. `Tenant` is a global (non-scoped) model,
 * so this needs no bound tenant context. Suspended/archived tenants are
 * not advertised (fail-closed; matches login rejecting non-ACTIVE).
 *
 * Also returns `logoUrl` derived from each tenant's `settingsJson.logoKey`
 * (stored as a Cloudinary secure_url) so mobile/web pickers can show logos.
 */
export async function GET() {
  try {
    const rows = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, name: true, settingsJson: true },
      orderBy: { name: "asc" },
    });
    const tenants = rows.map((t) => {
      const settings = parseTenantSettings(t.settingsJson);
      return {
        slug: t.slug,
        name: t.name,
        logoUrl: resolveLogoUrl(settings.logoKey),
      };
    });
    return ok({ tenants });
  } catch (e) {
    return handleError(e);
  }
}

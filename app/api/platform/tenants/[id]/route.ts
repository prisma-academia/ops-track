import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({
  action: z.enum(["suspend", "archive", "restore"]),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const { action } = Body.parse(await request.json());
    const meta = requestMeta(request);

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    let next: { status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"; archivedAt: Date | null };
    if (action === "suspend") next = { status: "SUSPENDED", archivedAt: null };
    else if (action === "archive") next = { status: "ARCHIVED", archivedAt: new Date() };
    else next = { status: "ACTIVE", archivedAt: null };

    const updated = await prisma.tenant.update({
      where: { id },
      data: next,
    });
    if (action === "suspend" || action === "archive") {
      await revokeAllSessionsForTenant(id);
    }
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: `tenant.${action}`,
      tenantId: id,
      targetType: "Tenant",
      targetId: id,
      before: { status: tenant.status },
      after: { status: updated.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ tenant: updated });
  } catch (e) {
    return handleError(e);
  }
}

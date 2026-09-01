import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requireUserWriteAccess } from "@/lib/auth/membership";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const { id } = await ctx.params;
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    if (target.status === "ACTIVE") {
      throw new DomainError(409, "not_banned", "This user is not banned.");
    }
    requireUserWriteAccess(actor, target);

    await prisma.tenantUser.update({
      where: { id },
      data: { status: "ACTIVE", bannedReason: null },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.unban",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      after: { status: "ACTIVE" } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ unbanned: true });
  } catch (e) {
    return handleError(e);
  }
}

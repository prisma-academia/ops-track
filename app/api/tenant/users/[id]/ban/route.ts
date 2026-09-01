import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requireUserWriteAccess } from "@/lib/auth/membership";

const BanBody = z.object({
  reason: z.string().trim().min(3, "Reason must be at least 3 characters.").max(500),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const { id } = await ctx.params;
    const { reason } = BanBody.parse(await request.json());
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    if (target.isOwner) {
      throw new DomainError(409, "owner_protected", "The owner cannot be banned.");
    }
    if (target.id === actor.userId) {
      throw new DomainError(409, "self_forbidden", "You cannot ban your own account.");
    }
    requireUserWriteAccess(actor, target);
    if (target.status === "SUSPENDED") {
      throw new DomainError(409, "already_banned", "This user is already banned.");
    }

    await prisma.tenantUser.update({
      where: { id },
      data: { status: "SUSPENDED", bannedReason: reason },
    });
    await revokeAllSessionsForUser("TENANT", id);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.ban",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      after: { status: "SUSPENDED", reason } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ banned: true });
  } catch (e) {
    return handleError(e);
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({
  action: z.enum(["revoke"]),
  revokedReason: z.string().max(500).optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);
    const sub = await prisma.tenantSubscription.findUnique({ where: { id } });
    if (!sub) throw new DomainError(404, "not_found", "Subscription not found.");
    if (sub.status !== "ACTIVE") throw new DomainError(400, "not_active", "Subscription is not active.");
    const updated = await prisma.tenantSubscription.update({
      where: { id },
      data: { status: "REVOKED", revokedById: actor.userId, revokedAt: new Date(), revokedReason: body.revokedReason ?? null },
    });
    await audit({
      actorType: "PLATFORM_USER", actorId: actor.userId,
      action: "tenant.subscription.revoke", tenantId: sub.tenantId,
      targetType: "TenantSubscription", targetId: id,
      before: { status: "ACTIVE" }, after: { status: "REVOKED", revokedReason: body.revokedReason },
      ip: meta.ip, userAgent: meta.userAgent,
    });
    return ok({ subscription: updated });
  } catch (e) {
    return handleError(e);
  }
}
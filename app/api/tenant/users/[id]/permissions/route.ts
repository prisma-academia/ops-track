import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({ permissions: z.array(z.string()) });

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    if (target.isOwner) {
      throw new DomainError(409, "owner_protected", "Owner permissions cannot be reduced.");
    }
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const cleaned = body.permissions.filter((p) => allowed.has(p));
    const before = target.permissions;
    await prisma.tenantUser.update({
      where: { id },
      data: { permissions: cleaned },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.update_permissions",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      before: { permissions: before } as object,
      after: { permissions: cleaned } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ permissions: cleaned });
  } catch (e) {
    return handleError(e);
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_PLATFORM_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_ROLES_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.roleTemplate.findUnique({ where: { id } });
    if (!existing || existing.scope !== "PLATFORM") {
      throw new DomainError(404, "not_found", "Role template not found.");
    }
    if (existing.isSystem) {
      throw new DomainError(409, "system_role", "System roles cannot be modified.");
    }
    const allowed = new Set<string>(ALL_PLATFORM_PERMISSION_KEYS);
    const cleaned = body.permissions?.filter((p) => allowed.has(p));
    const updated = await prisma.roleTemplate.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(cleaned ? { permissions: cleaned } : {}),
      },
    });
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "platform_role.update",
      tenantId: null,
      targetType: "RoleTemplate",
      targetId: id,
      before: { name: existing.name, permissions: existing.permissions } as object,
      after: { name: updated.name, permissions: updated.permissions } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ role: updated });
  } catch (e) {
    return handleError(e);
  }
}

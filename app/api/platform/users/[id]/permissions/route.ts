import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_PLATFORM_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({ permissions: z.array(z.string()) });

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_USERS_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) throw new DomainError(404, "not_found", "User not found.");
    const allowed = new Set<string>(ALL_PLATFORM_PERMISSION_KEYS);
    const cleaned = body.permissions.filter((p) => allowed.has(p));
    const before = target.permissions;
    await prisma.platformUser.update({
      where: { id },
      data: { permissions: cleaned },
    });
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "platform_user.update_permissions",
      tenantId: null,
      targetType: "PlatformUser",
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

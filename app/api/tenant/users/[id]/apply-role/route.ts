import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({ roleTemplateId: z.string().min(1) });

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const { id } = await ctx.params;
    const { roleTemplateId } = Body.parse(await request.json());
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    if (target.isOwner) {
      throw new DomainError(409, "owner_protected", "Owner permissions cannot be reduced.");
    }
    const role = await prisma.roleTemplate.findUnique({ where: { id: roleTemplateId } });
    if (!role || role.scope !== "TENANT" || role.tenantId !== actor.tenantId) {
      throw new DomainError(400, "invalid_role", "Role template not in this tenant.");
    }
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const perms = role.permissions.filter((p) => allowed.has(p));
    const before = target.permissions;
    await prisma.tenantUser.update({
      where: { id },
      data: { permissions: perms },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.apply_role",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      before: { permissions: before } as object,
      after: { permissions: perms, role: role.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ permissions: perms });
  } catch (e) {
    return handleError(e);
  }
}

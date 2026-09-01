import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  canWriteFleetRoles,
  canWriteStationRoles,
  filterPermissionsForModule,
  requireAnyPermission,
} from "@/lib/auth/membership";

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.roleTemplate.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Role template not found.");
    }
    if (existing.module === "STATION") {
      requireAnyPermission(actor, canWriteStationRoles(actor));
      if (actor.organizationId && existing.organizationId && actor.organizationId !== existing.organizationId) {
        throw new DomainError(403, "forbidden", "You can only edit roles in your organization.");
      }
    } else {
      requireAnyPermission(actor, canWriteFleetRoles(actor));
    }
    if (existing.isSystem && existing.name === "Owner") {
      throw new DomainError(409, "system_role", "Owner role is immutable.");
    }
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const cleaned = body.permissions
      ? filterPermissionsForModule(body.permissions.filter((p) => allowed.has(p)), existing.module)
      : undefined;
    const updated = await prisma.roleTemplate.update({
      where: { id },
      data: {
        ...(body.name && !existing.isSystem ? { name: body.name } : {}),
        ...(cleaned ? { permissions: cleaned } : {}),
      },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_role.update",
      tenantId: actor.tenantId,
      targetType: "RoleTemplate",
      targetId: id,
      module: updated.module,
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

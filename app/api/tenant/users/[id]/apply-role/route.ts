import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import type { AppModule } from "@/lib/generated/prisma/client";
import {
  assertRoleUsable,
  canWriteFleetUsers,
  canWriteStationUsers,
  filterPermissionsForModule,
  requireAnyPermission,
} from "@/lib/auth/membership";

const Body = z.object({ roleTemplateId: z.string().min(1) });

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
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

    const preview = await prisma.roleTemplate.findUnique({ where: { id: roleTemplateId } });
    const mode = preview?.module === "STATION" ? "STATION" : "FLEET";
    if (mode === "STATION") requireAnyPermission(actor, canWriteStationUsers(actor));
    else requireAnyPermission(actor, canWriteFleetUsers(actor));

    if (mode === "STATION") {
      if (actor.organizationId && target.organizationId && actor.organizationId !== target.organizationId) {
        throw new DomainError(403, "forbidden", "You can only manage users in your organization.");
      }
    }

    const role = await assertRoleUsable({ actor, roleId: roleTemplateId, mode });
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const perms = filterPermissionsForModule(role.permissions.filter((p) => allowed.has(p)), mode);

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId }, select: { activeModules: true } });
    if (!tenant || !tenant.activeModules.includes(role.module)) {
      throw new DomainError(403, "module_disabled", `Tenant does not have access to the ${role.module} module.`);
    }

    const before = mode === "STATION" ? target.stationPermissions : target.fleetPermissions;
    const activeModules = Array.from(new Set<AppModule>([...target.activeModules, mode]));

    await prisma.tenantUser.update({
      where: { id },
      data: mode === "STATION"
        ? { stationPermissions: perms, activeModules }
        : { fleetPermissions: perms, activeModules },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.apply_role",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      module: role.module,
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

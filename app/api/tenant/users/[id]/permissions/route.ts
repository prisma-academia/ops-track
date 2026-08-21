import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS, splitTenantPermissions } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z
  .object({
    permissions: z.array(z.string()).optional(),
    module: z.enum(["STATION", "FLEET"]).optional(),
    fleetPermissions: z.array(z.string()).optional(),
    stationPermissions: z.array(z.string()).optional(),
  })
  .refine(
    (b) =>
      (b.module && b.permissions) ||
      b.fleetPermissions !== undefined ||
      b.stationPermissions !== undefined,
    { message: "Provide module permissions or fleet/station permission arrays." }
  );

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

    let fleetPermissions = target.fleetPermissions;
    let stationPermissions = target.stationPermissions;

    if (body.module && body.permissions) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: actor.tenantId },
        select: { activeModules: true },
      });
      if (!tenant || !tenant.activeModules.includes(body.module)) {
        throw new DomainError(403, "module_disabled", `Tenant does not have access to the ${body.module} module.`);
      }
      const cleaned = body.permissions.filter((p) => allowed.has(p));
      if (body.module === "STATION") stationPermissions = cleaned;
      else fleetPermissions = cleaned;
    } else {
      if (body.fleetPermissions) {
        fleetPermissions = body.fleetPermissions.filter((p) => allowed.has(p));
      }
      if (body.stationPermissions) {
        stationPermissions = body.stationPermissions.filter((p) => allowed.has(p));
      }
    }

    // Keep fleet vs station keys in the matching column even if the client mixed them.
    const splitFleet = splitTenantPermissions(fleetPermissions);
    const splitStation = splitTenantPermissions(stationPermissions);
    fleetPermissions = Array.from(new Set([...splitFleet.fleetPermissions, ...splitStation.fleetPermissions]));
    stationPermissions = Array.from(new Set([...splitFleet.stationPermissions, ...splitStation.stationPermissions]));

    const before = { fleetPermissions: target.fleetPermissions, stationPermissions: target.stationPermissions };
    await prisma.tenantUser.update({
      where: { id },
      data: { fleetPermissions, stationPermissions },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.update_permissions",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      before: before as object,
      after: { fleetPermissions, stationPermissions } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ fleetPermissions, stationPermissions, permissions: [...fleetPermissions, ...stationPermissions] });
  } catch (e) {
    return handleError(e);
  }
}

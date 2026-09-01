import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  canManageFleetRoles,
  canManageStationRoles,
  canWriteFleetRoles,
  canWriteStationRoles,
  filterPermissionsForModule,
  requireAnyPermission,
} from "@/lib/auth/membership";
import { resolveActiveOrgIdFromCookie } from "@/lib/auth/org-scope";

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  module: z.enum(["STATION", "FLEET"]),
  permissions: z.array(z.string()).min(0),
  organizationId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    const url = new URL(request.url);
    const moduleFilter = url.searchParams.get("module") as "STATION" | "FLEET" | null;
    const organizationId = url.searchParams.get("organizationId");

    if (moduleFilter === "STATION") {
      requireAnyPermission(actor, canManageStationRoles(actor));
    } else {
      requireAnyPermission(actor, canManageFleetRoles(actor));
    }

    const orgId =
      moduleFilter === "STATION"
        ? actor.organizationId || organizationId || (await resolveActiveOrgIdFromCookie(actor))
        : null;

    const rows = await prisma.roleTemplate.findMany({
      where: {
        scope: "TENANT",
        tenantId: actor.tenantId,
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(moduleFilter === "FLEET" ? { organizationId: null } : {}),
        ...(moduleFilter === "STATION"
          ? {
              OR: [
                { organizationId: null, isSystem: true, module: "STATION" },
                ...(orgId ? [{ organizationId: orgId, module: "STATION" as const }] : []),
              ],
            }
          : {}),
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);

    if (body.module === "STATION") {
      requireAnyPermission(actor, canWriteStationRoles(actor));
    } else {
      requireAnyPermission(actor, canWriteFleetRoles(actor));
    }

    const organizationId =
      body.module === "FLEET"
        ? null
        : actor.organizationId || body.organizationId || (await resolveActiveOrgIdFromCookie(actor));

    if (body.module === "STATION" && !organizationId) {
      throw new DomainError(400, "invalid_input", "An organization is required to create station roles.");
    }

    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const cleaned = filterPermissionsForModule(
      body.permissions.filter((p) => allowed.has(p)),
      body.module,
    );

    const existing = await prisma.roleTemplate.findFirst({
      where: {
        scope: "TENANT",
        tenantId: actor.tenantId,
        module: body.module,
        name: body.name,
        organizationId,
      },
    });
    if (existing) throw new DomainError(409, "name_taken", "Role name already exists.");

    const created = await prisma.roleTemplate.create({
      data: {
        scope: "TENANT",
        tenantId: actor.tenantId,
        name: body.name,
        module: body.module,
        permissions: cleaned,
        isSystem: false,
        organizationId,
      },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_role.create",
      tenantId: actor.tenantId,
      targetType: "RoleTemplate",
      targetId: created.id,
      module: body.module,
      after: { name: created.name, permissions: cleaned, organizationId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ role: created });
  } catch (e) {
    return handleError(e);
  }
}

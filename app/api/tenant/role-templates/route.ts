import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  permissions: z.array(z.string()).min(0),
});

export async function GET() {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_ROLES_READ.key);
    const rows = await prisma.roleTemplate.findMany({
      where: { scope: "TENANT", tenantId: actor.tenantId },
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_ROLES_WRITE.key);
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const cleaned = body.permissions.filter((p) => allowed.has(p));
    const existing = await prisma.roleTemplate.findFirst({
      where: { scope: "TENANT", tenantId: actor.tenantId, name: body.name },
    });
    if (existing) throw new DomainError(409, "name_taken", "Role name already exists.");
    const created = await prisma.roleTemplate.create({
      data: {
        scope: "TENANT",
        tenantId: actor.tenantId,
        name: body.name,
        permissions: cleaned,
        isSystem: false,
      },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_role.create",
      tenantId: actor.tenantId,
      targetType: "RoleTemplate",
      targetId: created.id,
      after: { name: created.name, permissions: cleaned } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ role: created });
  } catch (e) {
    return handleError(e);
  }
}

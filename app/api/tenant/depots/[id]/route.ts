import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { formatDepotRow, normalizeDepotName } from "@/lib/fleet/depots";

const UpdateDepotSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  country: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  lga: z.string().max(100).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const depot = await prisma.depot.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!depot) throw new DomainError(404, "not_found", "Depot not found.");

    const ordersUsingDepot = await prisma.order.count({
      where: {
        tenantId: actor.tenantId,
        sourceDepot: { equals: depot.name, mode: "insensitive" },
      },
    });

    return ok({ ...formatDepotRow(depot), ordersUsingDepot });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const body = UpdateDepotSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.depot.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Depot not found.");

    let newName = existing.name;
    if (body.name !== undefined) {
      newName = normalizeDepotName(body.name);
      if (newName !== existing.name) {
        const duplicate = await prisma.depot.findFirst({
          where: { tenantId: actor.tenantId, name: newName, id: { not: id } },
        });
        if (duplicate) {
          throw new DomainError(409, "duplicate", "A depot with this name already exists.");
        }
        await prisma.order.updateMany({
          where: {
            tenantId: actor.tenantId,
            sourceDepot: { equals: existing.name, mode: "insensitive" },
          },
          data: { sourceDepot: newName },
        });
      }
    }

    const depot = await prisma.depot.update({
      where: { id },
      data: {
        name: body.name !== undefined ? newName : undefined,
        country: body.country !== undefined ? body.country || null : undefined,
        state: body.state !== undefined ? body.state || null : undefined,
        lga: body.lga !== undefined ? body.lga || null : undefined,
        latitude: body.latitude !== undefined ? body.latitude : undefined,
        longitude: body.longitude !== undefined ? body.longitude : undefined,
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "depot.update",
      tenantId: actor.tenantId,
      targetType: "Depot",
      targetId: depot.id,
      before: { name: existing.name } as object,
      after: { name: depot.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ depot: formatDepotRow(depot) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const meta = requestMeta(request);

    const depot = await prisma.depot.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!depot) throw new DomainError(404, "not_found", "Depot not found.");

    const ordersUsingDepot = await prisma.order.count({
      where: {
        tenantId: actor.tenantId,
        sourceDepot: { equals: depot.name, mode: "insensitive" },
      },
    });
    if (ordersUsingDepot > 0) {
      throw new DomainError(
        400,
        "in_use",
        `Cannot delete depot: ${ordersUsingDepot} order(s) reference this depot name.`
      );
    }

    await prisma.depot.delete({ where: { id } });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "depot.delete",
      tenantId: actor.tenantId,
      targetType: "Depot",
      targetId: id,
      before: { name: depot.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

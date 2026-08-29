import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { computeStationOverpayment } from "@/lib/sales/payments";

const UpdateStationSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).max(100).optional(),
  location: z.string().max(255).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  lga: z.string().max(100).optional().nullable(),
  ward: z.string().max(100).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  altitude: z.number().optional().nullable(),
  staffUserIds: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tanks: true,
        pumps: {
          include: {
            nozzles: true,
          },
        },
        priceControls: {
          orderBy: { effectiveFrom: "desc" },
          take: 5,
        },
      },
    });

    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const derivedBalance = await computeStationOverpayment(id, actor.tenantId);

    return ok({ ...station, derivedBalance });
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");
    const body = UpdateStationSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.station.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    if (body.code && body.code.toUpperCase() !== existing.code) {
      const codeDuplicate = await prisma.station.findUnique({
        where: {
          tenantId_code: {
            tenantId: actor.tenantId,
            code: body.code.toUpperCase(),
          },
        },
      });
      if (codeDuplicate) {
        throw new DomainError(409, "code_taken", "Station code is already in use for this tenant.");
      }
    }

    // Set up staff changes
    const staffData = body.staffUserIds
      ? {
          set: body.staffUserIds.map((userId) => ({ id: userId })),
        }
      : undefined;

    const station = await prisma.station.update({
      where: { id },
      data: {
        code: body.code ? body.code.toUpperCase() : undefined,
        name: body.name,
        location: body.location,
        state: body.state,
        lga: body.lga,
        ward: body.ward,
        latitude: body.latitude,
        longitude: body.longitude,
        altitude: body.altitude,
        staff: staffData,
      },
      include: {
        staff: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "station.update",
      tenantId: actor.tenantId,
      targetType: "Station",
      targetId: station.id,
      before: { code: existing.code, name: existing.name } as object,
      after: { code: station.code, name: station.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ station });
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    await prisma.station.delete({ where: { id } });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "station.delete",
      tenantId: actor.tenantId,
      targetType: "Station",
      targetId: id,
      before: { code: station.code, name: station.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

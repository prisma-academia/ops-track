import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const DeliverWaybillSchema = z.object({
  litersReceived: z.coerce.number().positive().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  pictures: z.array(z.string()).optional(),
  arrivalTime: z.string().optional().nullable(),
  truckNumberVerified: z.boolean().optional(),
  driverVerified: z.boolean().optional(),
  waybillVerified: z.boolean().optional(),
  arrivalPictures: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key);

    const waybill = await prisma.waybill.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        dippings: {
          include: {
            tank: true,
            recordedBy: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
    });

    if (!waybill || waybill.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill not found.");
    }

    return ok(waybill);
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_WRITE.key);
    const body = DeliverWaybillSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.waybill.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill not found.");
    }

    if (existing.status !== "DISPATCHED") {
      throw new DomainError(400, "already_processed", `Waybill status is currently: ${existing.status}`);
    }

    const updatedPictures = [...(existing.pictures || []), ...(body.pictures || [])];

    const waybill = await prisma.waybill.update({
      where: { id },
      data: {
        status: "DELIVERED",
        litersReceived: body.litersReceived,
        gpsLatitude: body.gpsLatitude !== undefined ? body.gpsLatitude : existing.gpsLatitude,
        gpsLongitude: body.gpsLongitude !== undefined ? body.gpsLongitude : existing.gpsLongitude,
        pictures: updatedPictures,
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : existing.arrivalTime,
        truckNumberVerified: body.truckNumberVerified ?? existing.truckNumberVerified,
        driverVerified: body.driverVerified ?? existing.driverVerified,
        waybillVerified: body.waybillVerified ?? existing.waybillVerified,
        arrivalPictures: body.arrivalPictures ?? existing.arrivalPictures,
        deliveredAt: new Date(),
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill.deliver",
      tenantId: actor.tenantId,
      targetType: "Waybill",
      targetId: waybill.id,
      before: { status: existing.status } as object,
      after: {
        status: waybill.status,
        litersLoaded: waybill.litersLoaded,
        litersReceived: waybill.litersReceived,
        variance: Number(waybill.litersLoaded) - Number(waybill.litersReceived),
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ waybill });
  } catch (e) {
    return handleError(e);
  }
}

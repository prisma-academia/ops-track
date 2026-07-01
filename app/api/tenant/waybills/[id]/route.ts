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

    const allocation = await prisma.waybillAllocation.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        waybill: {
          include: {
            recordedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        dippings: {
          include: {
            tank: true,
            recordedBy: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
    });

    if (!allocation || allocation.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill allocation not found.");
    }

    const mapped = {
      id: allocation.id,
      stationId: allocation.stationId,
      number: allocation.waybill.number,
      productType: allocation.waybill.productType,
      litersLoaded: Number(allocation.litersToDispense),
      litersReceived: allocation.litersReceived ? Number(allocation.litersReceived) : null,
      truckPlate: allocation.waybill.truckPlate,
      driverName: allocation.waybill.driverName,
      driverPhone: allocation.waybill.driverPhone,
      status: allocation.status,
      gpsLatitude: allocation.gpsLatitude ? Number(allocation.gpsLatitude) : null,
      gpsLongitude: allocation.gpsLongitude ? Number(allocation.gpsLongitude) : null,
      pictures: allocation.waybill.pictures || [],
      arrivalPictures: allocation.arrivalPictures || [],
      deliveryDatetime: allocation.waybill.deliveryDatetime?.toISOString() ?? null,
      arrivalTime: allocation.arrivalTime?.toISOString() ?? null,
      supplier: allocation.waybill.supplier,
      depot: allocation.waybill.depot,
      transportCompany: allocation.waybill.transportCompany,
      truckNumberVerified: allocation.truckNumberVerified,
      driverVerified: allocation.driverVerified,
      waybillVerified: allocation.waybillVerified,
      dispatchedAt: allocation.waybill.dispatchedAt.toISOString(),
      deliveredAt: allocation.deliveredAt?.toISOString() ?? null,
      recordedById: allocation.waybill.recordedById,
      recordedBy: allocation.waybill.recordedBy,
      station: allocation.station,
      dippings: allocation.dippings,
    };

    return ok(mapped);
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

    const existing = await prisma.waybillAllocation.findUnique({
      where: { id },
      include: { waybill: true }
    });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Waybill allocation not found.");
    }

    if (existing.status !== "DISPATCHED") {
      throw new DomainError(400, "already_processed", `Waybill allocation status is currently: ${existing.status}`);
    }

    const updatedPictures = [...(existing.waybill.pictures || []), ...(body.pictures || [])];

    const allocation = await prisma.waybillAllocation.update({
      where: { id },
      data: {
        status: "DELIVERED",
        litersReceived: body.litersReceived,
        gpsLatitude: body.gpsLatitude !== undefined ? body.gpsLatitude : existing.gpsLatitude,
        gpsLongitude: body.gpsLongitude !== undefined ? body.gpsLongitude : existing.gpsLongitude,
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : existing.arrivalTime,
        truckNumberVerified: body.truckNumberVerified ?? existing.truckNumberVerified,
        driverVerified: body.driverVerified ?? existing.driverVerified,
        waybillVerified: body.waybillVerified ?? existing.waybillVerified,
        arrivalPictures: body.arrivalPictures ?? existing.arrivalPictures,
        deliveredAt: new Date(),
      },
      include: {
        waybill: true
      }
    });

    // Update dispatch pictures if any new dispatch pictures were uploaded
    if (body.pictures && body.pictures.length > 0) {
      await prisma.waybill.update({
        where: { id: existing.waybillId },
        data: {
          pictures: updatedPictures
        }
      });
    }

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill.deliver",
      tenantId: actor.tenantId,
      targetType: "WaybillAllocation",
      targetId: allocation.id,
      before: { status: existing.status } as object,
      after: {
        status: allocation.status,
        litersLoaded: Number(allocation.litersToDispense),
        litersReceived: allocation.litersReceived ? Number(allocation.litersReceived) : null,
        variance: Number(allocation.litersToDispense) - (allocation.litersReceived ? Number(allocation.litersReceived) : 0),
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const mapped = {
      id: allocation.id,
      stationId: allocation.stationId,
      number: allocation.waybill.number,
      productType: allocation.waybill.productType,
      litersLoaded: Number(allocation.litersToDispense),
      litersReceived: allocation.litersReceived ? Number(allocation.litersReceived) : null,
      truckPlate: allocation.waybill.truckPlate,
      driverName: allocation.waybill.driverName,
      driverPhone: allocation.waybill.driverPhone,
      status: allocation.status,
      gpsLatitude: allocation.gpsLatitude ? Number(allocation.gpsLatitude) : null,
      gpsLongitude: allocation.gpsLongitude ? Number(allocation.gpsLongitude) : null,
      pictures: updatedPictures,
      arrivalPictures: allocation.arrivalPictures || [],
      deliveryDatetime: allocation.waybill.deliveryDatetime?.toISOString() ?? null,
      arrivalTime: allocation.arrivalTime?.toISOString() ?? null,
      supplier: allocation.waybill.supplier,
      depot: allocation.waybill.depot,
      transportCompany: allocation.waybill.transportCompany,
      truckNumberVerified: allocation.truckNumberVerified,
      driverVerified: allocation.driverVerified,
      waybillVerified: allocation.waybillVerified,
      dispatchedAt: allocation.waybill.dispatchedAt.toISOString(),
      deliveredAt: allocation.deliveredAt?.toISOString() ?? null,
      recordedById: allocation.waybill.recordedById,
      stationId_number: `${allocation.stationId}_${allocation.waybill.number}` // compatibility field if any
    };

    return ok({ waybill: mapped });
  } catch (e) {
    return handleError(e);
  }
}

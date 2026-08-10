import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { checkAndCreateVarianceTicket } from "@/lib/variance";

const DeliverWaybillSchema = z.object({
  litersReceived: z.coerce.number().positive().optional().nullable(),
  tankId: z.string().optional().nullable(),
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
    console.log("PATCH /api/tenant/waybills/[id] HIT! ID:", id);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_WRITE.key);
    console.log("ACTOR:", actor);
    const body = DeliverWaybillSchema.parse(await request.json());
    console.log("BODY PARSED:", body);
    const meta = requestMeta(request);

    const existing = await prisma.waybillAllocation.findUnique({
      where: { id },
      include: { waybill: true }
    });
    if (!existing || existing.tenantId !== actor.tenantId) {
      console.log("EXISTING NOT FOUND OR TENANT MISMATCH:", existing?.tenantId, actor.tenantId);
      throw new DomainError(404, "not_found", "Waybill allocation not found.");
    }

    if (existing.status !== "DISPATCHED") {
      console.log("STATUS IS NOT DISPATCHED:", existing.status);
      throw new DomainError(400, "already_processed", `Waybill allocation status is currently: ${existing.status}`);
    }
    
    console.log("VALIDATION PASSED, PROCEEDING TO UPDATE");

    const existingPictures = Array.isArray(existing.waybill.pictures) ? existing.waybill.pictures : [];
    const incomingPictures = Array.isArray(body.pictures) ? body.pictures : [];
    const updatedPictures = [...existingPictures, ...incomingPictures];

    const isCompleted = !!(body.tankId && body.litersReceived);

    const allocation = await prisma.waybillAllocation.update({
      where: { id },
      data: {
        status: isCompleted ? "COMPLETED" : "DELIVERED",
        litersReceived: body.litersReceived,
        gpsLatitude: body.gpsLatitude !== undefined ? body.gpsLatitude : existing.gpsLatitude,
        gpsLongitude: body.gpsLongitude !== undefined ? body.gpsLongitude : existing.gpsLongitude,
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : existing.arrivalTime,
        truckNumberVerified: body.truckNumberVerified ?? existing.truckNumberVerified,
        driverVerified: body.driverVerified ?? existing.driverVerified,
        waybillVerified: body.waybillVerified ?? existing.waybillVerified,
        arrivalPictures: body.arrivalPictures ?? (Array.isArray(existing.arrivalPictures) ? existing.arrivalPictures : []),
        deliveredAt: new Date(),
      },
      include: {
        waybill: true
      }
    });

    if (isCompleted && body.litersReceived !== undefined) {
      await checkAndCreateVarianceTicket({
        tenantId: actor.tenantId,
        stationId: existing.stationId,
        raisedById: actor.userId,
        varianceType: "WAYBILL_DELIVERY",
        expectedVolume: Number(existing.litersToDispense),
        actualVolume: Number(body.litersReceived),
        waybillId: existing.waybillId,
        referenceNumber: existing.waybill.number,
      });
    }

    // Update dispatch pictures if any new dispatch pictures were uploaded
    if (body.pictures && body.pictures.length > 0) {
      await prisma.waybill.update({
        where: { id: existing.waybillId },
        data: {
          pictures: updatedPictures
        }
      });
    }

    // Sync with corresponding Delivery to ensure Distribution metrics are accurate
    const matchingSale = allocation.deliveryId ? await prisma.delivery.findUnique({
      where: {
        id: allocation.deliveryId,
      }
    }) : null;

    if (matchingSale && body.litersReceived !== undefined) {
      await prisma.delivery.update({
        where: { id: matchingSale.id },
        data: {
          litersReceived: body.litersReceived
        }
      });

      // Recalculate transport loss if Delivery belongs to a transport
      if (matchingSale.transportId) {
        const transport = await prisma.transport.findUnique({ where: { id: matchingSale.transportId } });
        if (transport) {
          const allSales = await prisma.delivery.findMany({ 
            where: { transportId: transport.id },
            include: { station: true }
          });
          let totalReceived = allSales.reduce((sum, d) => {
            if (d.id === matchingSale.id) return sum + Number(body.litersReceived || 0);
            return sum + Number(d.litersReceived ?? 0);
          }, 0);
          
          // Deprecated: Add volume from custom distributions in transportTripLegs
          // const transportTripLegs = Array.isArray(transport.transportTripLegs) ? transport.transportTripLegs : [];
          // const salesStationNames = allSales.map((d) => d.station?.name).filter(Boolean);
          // const customDistributions = transportTripLegs.filter((loc: any) => loc.isCustom || loc.productPrice !== undefined || (!loc.deliveryId && !salesStationNames.includes(loc.location)));
          // const locsVol = customDistributions.reduce((acc: number, loc: any) => acc + (Number(loc.litersDelivered) || 0), 0);
          // totalReceived += locsVol;

          const litersLost = Math.max(0, Number(transport.litersCarried) - totalReceived);
          const ratePerLiter = Number(transport.ratePerLiter);
          const cashDeductionForLoss = litersLost * ratePerLiter;
          const totalDeduction = Number(transport.maintenanceCost) + cashDeductionForLoss;
          const netTransportFeePaid = Math.max(0, (ratePerLiter * Number(transport.litersCarried)) - totalDeduction);

          await prisma.transport.update({
            where: { id: transport.id },
            data: { litersLost, totalDeduction, netTransportFeePaid }
          });
        }
      }
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

    console.log("AUDIT DONE, RETURNING MAPPED");

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
    console.error("PATCH /api/tenant/waybills/[id] ERROR:", e);
    return handleError(e);
  }
}

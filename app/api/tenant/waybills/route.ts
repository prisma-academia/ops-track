import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { sendPushNotification } from "@/lib/notifications";

const CreateWaybillSchema = z.object({
  number: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive(),
  truckPlate: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().optional().nullable(),
  pictures: z.array(z.string()).optional(),
  deliveryDatetime: z.string().optional().nullable(),
  supplier: z.string().min(1, "Supplier is required"),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
  allocations: z.array(z.object({
    stationId: z.string().min(1),
    litersToDispense: z.coerce.number().positive(),
    costPerLiter: z.coerce.number().positive(),
    transportationCost: z.coerce.number().nonnegative(),
  })).min(1, "At least one station assignment is required"),
}).refine((data) => {
  const sum = data.allocations.reduce((acc, a) => acc + Number(a.litersToDispense), 0);
  return Math.abs(sum - data.litersLoaded) < 0.01;
}, {
  message: "The sum of station allocations must equal the total liters loaded.",
  path: ["litersLoaded"]
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    
    const stationId = url.searchParams.get("stationId") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const allocations = await prisma.waybillAllocation.findMany({
      where: { 
        tenantId: actor.tenantId,
        ...(stationId ? { stationId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { waybill: { dispatchedAt: "desc" } },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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
      },
    });

    const mapped = allocations.map((a) => ({
      id: a.id, // Return allocation ID as waybill ID for the mobile client
      stationId: a.stationId,
      number: a.waybill.number,
      productType: a.waybill.productType,
      litersLoaded: Number(a.litersToDispense),
      litersReceived: a.litersReceived ? Number(a.litersReceived) : null,
      truckPlate: a.waybill.truckPlate,
      driverName: a.waybill.driverName,
      driverPhone: a.waybill.driverPhone,
      status: a.status,
      gpsLatitude: a.gpsLatitude ? Number(a.gpsLatitude) : null,
      gpsLongitude: a.gpsLongitude ? Number(a.gpsLongitude) : null,
      pictures: a.waybill.pictures || [],
      arrivalPictures: a.arrivalPictures || [],
      deliveryDatetime: a.waybill.deliveryDatetime?.toISOString() ?? null,
      arrivalTime: a.arrivalTime?.toISOString() ?? null,
      supplier: a.waybill.supplier,
      depot: a.waybill.depot,
      transportCompany: a.waybill.transportCompany,
      truckNumberVerified: a.truckNumberVerified,
      driverVerified: a.driverVerified,
      waybillVerified: a.waybillVerified,
      dispatchedAt: a.waybill.dispatchedAt.toISOString(),
      deliveredAt: a.deliveredAt?.toISOString() ?? null,
      recordedById: a.waybill.recordedById,
      recordedBy: a.waybill.recordedBy,
      station: a.station,
    }));

    return ok(mapped, buildPageMeta(allocations, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_WRITE.key);
    const body = CreateWaybillSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify all station ownerships
    const stationIds = body.allocations.map(a => a.stationId);
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds }, tenantId: actor.tenantId }
    });
    if (stations.length !== new Set(stationIds).size) {
      throw new DomainError(404, "not_found", "One or more stations not found or belong to a different tenant.");
    }

    // Verify waybill number uniqueness within this tenant
    const existing = await prisma.waybill.findUnique({
      where: {
        tenantId_number: {
          tenantId: actor.tenantId,
          number: body.number,
        },
      },
    });
    if (existing) {
      throw new DomainError(409, "waybill_exists", "Waybill number already exists in this tenant.");
    }

    const waybill = await prisma.waybill.create({
      data: {
        tenantId: actor.tenantId,
        number: body.number,
        productType: body.productType,
        litersLoaded: body.litersLoaded,
        truckPlate: body.truckPlate,
        driverName: body.driverName,
        driverPhone: body.driverPhone ?? null,
        pictures: body.pictures ?? [],
        deliveryDatetime: body.deliveryDatetime ? new Date(body.deliveryDatetime) : null,
        supplier: body.supplier ?? null,
        depot: body.depot ?? null,
        transportCompany: body.transportCompany ?? null,
        recordedById: actor.userId,
        allocations: {
          create: body.allocations.map(a => ({
            tenantId: actor.tenantId,
            stationId: a.stationId,
            litersToDispense: a.litersToDispense,
            costPerLiter: a.costPerLiter,
            transportationCost: a.transportationCost,
          }))
        }
      },
      include: {
        allocations: true
      }
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill.dispatch",
      tenantId: actor.tenantId,
      targetType: "Waybill",
      targetId: waybill.id,
      after: { number: waybill.number, litersLoaded: waybill.litersLoaded, allocationsCount: waybill.allocations.length } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Notify assigned staff for each allocated station
    try {
      const stationsWithStaff = await prisma.station.findMany({
        where: {
          id: { in: stationIds },
          tenantId: actor.tenantId,
        },
        include: {
          staff: {
            select: {
              id: true,
              expoPushTokens: true,
            },
          },
        },
      });

      for (const station of stationsWithStaff) {
        const allocation = waybill.allocations.find((a) => a.stationId === station.id);
        if (!allocation) continue;

        // Gather all push tokens for staff assigned to this station
        const tokens = station.staff.flatMap((s) => s.expoPushTokens);
        if (tokens.length === 0) continue;

        const liters = Number(allocation.litersToDispense).toLocaleString();
        const product = waybill.productType;
        const title = "New Dispatch Assigned";
        const notifBody = `A new dispatch of ${liters} L of ${product} has been created for ${station.name} (Waybill: #${waybill.number}).`;

        await sendPushNotification(
          tokens,
          title,
          notifBody,
          {
            waybillId: waybill.id,
            allocationId: allocation.id,
            stationId: station.id,
            action: "waybill.assigned",
          }
        );
      }
    } catch (err) {
      console.error("Failed to send waybill push notifications:", err);
    }

    return ok({ waybill });
  } catch (e) {
    return handleError(e);
  }
}

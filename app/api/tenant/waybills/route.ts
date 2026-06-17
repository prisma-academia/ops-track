import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateWaybillSchema = z.object({
  stationId: z.string().min(1),
  number: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive(),
  truckPlate: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  pictures: z.array(z.string()).optional(),
  deliveryDatetime: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    
    const stationId = url.searchParams.get("stationId") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const rows = await prisma.waybill.findMany({
      where: { 
        tenantId: actor.tenantId,
        ...(stationId ? { stationId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { dispatchedAt: "desc" },
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
        recordedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);
    const body = CreateWaybillSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: body.stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
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
        stationId: body.stationId,
        number: body.number,
        productType: body.productType,
        litersLoaded: body.litersLoaded,
        truckPlate: body.truckPlate,
        driverName: body.driverName,
        driverPhone: body.driverPhone ?? null,
        gpsLatitude: body.gpsLatitude ?? null,
        gpsLongitude: body.gpsLongitude ?? null,
        pictures: body.pictures ?? [],
        deliveryDatetime: body.deliveryDatetime ? new Date(body.deliveryDatetime) : null,
        supplier: body.supplier ?? null,
        depot: body.depot ?? null,
        transportCompany: body.transportCompany ?? null,
        recordedById: actor.userId,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "waybill.dispatch",
      tenantId: actor.tenantId,
      targetType: "Waybill",
      targetId: waybill.id,
      after: { number: waybill.number, litersLoaded: waybill.litersLoaded, stationId: waybill.stationId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ waybill });
  } catch (e) {
    return handleError(e);
  }
}

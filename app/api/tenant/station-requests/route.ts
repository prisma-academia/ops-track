import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateStationRequestSchema = z.object({
  stationId: z.string().min(1, "Station is required"),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  requestedLiters: z.coerce.number().positive("Must be positive"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    // Both Station Managers and Fleet Managers need to read these
    const actor = await requireTenantActor();
    if (!actor.permissions.has(PERMISSIONS.TENANT_STATIONS_READ.key) && !actor.permissions.has(PERMISSIONS.TENANT_FLEET_READ.key) && !actor.isOwner) {
      throw new DomainError(403, "forbidden", "You don't have permission to read station requests.");
    }
    
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    
    const stationId = url.searchParams.get("stationId") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const requests = await prisma.stationSupplyRequest.findMany({
      where: { 
        tenantId: actor.tenantId,
        ...(stationId ? { stationId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
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
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        waybillAllocation: {
          include: {
            waybill: true
          }
        }
      },
    });

    return ok(requests, buildPageMeta(requests, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key);
    const body = CreateStationRequestSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({
      where: { id: body.stationId, tenantId: actor.tenantId }
    });
    if (!station) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const stationRequest = await prisma.stationSupplyRequest.create({
      data: {
        tenantId: actor.tenantId,
        stationId: body.stationId,
        productType: body.productType,
        requestedLiters: body.requestedLiters,
        notes: body.notes ?? null,
        requestedById: actor.userId,
        status: "PENDING",
      }
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "station_request.create",
      tenantId: actor.tenantId,
      targetType: "StationSupplyRequest",
      targetId: stationRequest.id,
      after: { productType: stationRequest.productType, requestedLiters: stationRequest.requestedLiters } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ stationRequest });
  } catch (e) {
    return handleError(e);
  }
}

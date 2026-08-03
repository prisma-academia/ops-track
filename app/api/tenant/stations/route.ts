import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { stationIncludeQuery, formatStationRows } from "@/lib/station-format";

const CreateStationSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  location: z.string().max(255).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  lga: z.string().max(100).optional().nullable(),
  ward: z.string().max(100).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  altitude: z.number().optional().nullable(),
  staffUserIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const salesMin = url.searchParams.get("salesMin") ? Number(url.searchParams.get("salesMin")) : undefined;
    const salesMax = url.searchParams.get("salesMax") ? Number(url.searchParams.get("salesMax")) : undefined;
    const stockMin = url.searchParams.get("stockMin") ? Number(url.searchParams.get("stockMin")) : undefined;
    const stockMax = url.searchParams.get("stockMax") ? Number(url.searchParams.get("stockMax")) : undefined;
    
    const hasPostFilters = salesMin !== undefined || salesMax !== undefined || stockMin !== undefined || stockMax !== undefined;

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      
      const include = stationIncludeQuery;

      if (hasPostFilters) {
        // Fetch all, format, post-filter, then paginate
        const rawRows = await prisma.station.findMany({
          where: { tenantId: actor.tenantId },
          orderBy: { createdAt: "desc" },
          include,
        });
        
        let rows = await formatStationRows(rawRows);
        
        // Post-filtering
        rows = rows.filter((r) => {
          const totalSales = r.todaySales.PMS + r.todaySales.AGO + r.todaySales.LPG;
          if (salesMin !== undefined && totalSales < salesMin) return false;
          if (salesMax !== undefined && totalSales > salesMax) return false;
          if (stockMin !== undefined && r.lastClosingStock < stockMin) return false;
          if (stockMax !== undefined && r.lastClosingStock > stockMax) return false;
          return true;
        });

        const totalCount = rows.length;
        const pagedRows = rows.slice(skip, skip + take);
        
        return ok(pagedRows, buildOffsetPageMeta(totalCount, page, take));
      } else {
        const [totalCount, rawRows] = await Promise.all([
          prisma.station.count({
            where: { tenantId: actor.tenantId },
          }),
          prisma.station.findMany({
            where: { tenantId: actor.tenantId },
            orderBy: { createdAt: "desc" },
            take,
            skip,
            include,
          }),
        ]);
        
        const rows = await formatStationRows(rawRows);
        return ok(rows, buildOffsetPageMeta(totalCount, page, take));
      }
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
  
      const include = stationIncludeQuery;

      const rawRows = await prisma.station.findMany({
        where: { tenantId: actor.tenantId },
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include,
      });
  
      const rows = await formatStationRows(rawRows);

      return ok(rows, buildPageMeta(rows, take));
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key);
    const body = CreateStationSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify code uniqueness in this tenant
    const existing = await prisma.station.findUnique({
      where: {
        tenantId_code: {
          tenantId: actor.tenantId,
          code: body.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new DomainError(409, "code_taken", "Station code is already in use for this tenant.");
    }

    // Connect staff if provided
    const staffConnect = body.staffUserIds && body.staffUserIds.length > 0
      ? body.staffUserIds.map((id) => ({ id }))
      : [];

    const station = await prisma.station.create({
      data: {
        tenantId: actor.tenantId,
        code: body.code.toUpperCase(),
        name: body.name,
        location: body.location ?? null,
        state: body.state ?? null,
        lga: body.lga ?? null,
        ward: body.ward ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        altitude: body.altitude ?? null,
        staff: {
          connect: staffConnect,
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "station.create",
      tenantId: actor.tenantId,
      targetType: "Station",
      targetId: station.id,
      after: { code: station.code, name: station.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ station });
  } catch (e) {
    return handleError(e);
  }
}

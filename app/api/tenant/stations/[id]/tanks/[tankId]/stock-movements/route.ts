import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";


export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; tankId: string }> }
) {
  try {
    const params = await props.params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const url = new URL(req.url);
    const { page, take: pageSize, skip } = parseOffsetPagination(url.searchParams);
    
    // Instead of using QuerySchema for pagination, use parseOffsetPagination.
    // If you need search:
    const search = url.searchParams.get("search") || undefined;

    const where = {
      tankId: params.tankId,
      stationId: params.id,
      tenantId: actor.tenantId,
      ...(search && {
        OR: [
          { notes: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, totalItems] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          station: { select: { name: true } },
          tank: { select: { name: true, productType: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const pageMeta = buildOffsetPageMeta(totalItems, page, pageSize);
    return ok(items, pageMeta);
  } catch (error: any) {
    console.error("GET /api/tenant/stations/[id]/tanks/[tankId]/stock-movements error:", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateStationSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  location: z.string().max(255).optional().nullable(),
  staffUserIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);

    const rows = await prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: {
          select: {
            staff: true,
            tanks: true,
            pumps: true,
            tickets: true,
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
        region: body.region,
        location: body.location ?? null,
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

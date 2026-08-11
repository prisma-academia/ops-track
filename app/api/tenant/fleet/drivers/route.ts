import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateDriverSchema = z.object({
  transporterId: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiryDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key, "FLEET");
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const transporterId = url.searchParams.get("transporterId");

    const rows = await prisma.driver.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(transporterId ? { transporterId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        transporter: { select: { id: true, name: true } },
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const body = CreateDriverSchema.parse(await request.json());
    const meta = requestMeta(request);

    const driver = await prisma.driver.create({
      data: {
        tenantId: actor.tenantId,
        transporterId: body.transporterId,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone ?? null,
        licenseNumber: body.licenseNumber ?? null,
        licenseExpiryDate: body.licenseExpiryDate ? new Date(body.licenseExpiryDate) : null,
        address: body.address ?? null,
      },
      include: {
        transporter: { select: { id: true, name: true } },
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "driver.create",
      tenantId: actor.tenantId,
      targetType: "Driver",
      targetId: driver.id,
      after: { name: `${driver.firstName} ${driver.lastName}`, transporter: driver.transporter.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ driver });
  } catch (e) {
    return handleError(e);
  }
}

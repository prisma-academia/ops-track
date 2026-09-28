import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateDriverSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  licenseNumber: z.string().max(50).optional().nullable(),
  idCardPhotoUrl: z.string().url().optional().nullable(),
  driverPhotoUrl: z.string().url().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    const drivers = await prisma.clientDriver.findMany({
      where: { clientId: id, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return ok({ drivers });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = CreateDriverSchema.parse(await request.json());
    const meta = requestMeta(request);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    const driver = await prisma.clientDriver.create({
      data: {
        tenantId: actor.tenantId,
        clientId: id,
        fullName: body.fullName,
        phone: body.phone,
        licenseNumber: body.licenseNumber ?? null,
        idCardPhotoUrl: body.idCardPhotoUrl ?? null,
        driverPhotoUrl: body.driverPhotoUrl ?? null,
        isActive: true,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.driver.create",
      tenantId: actor.tenantId,
      targetType: "ClientDriver",
      targetId: driver.id,
      after: driver as unknown as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ driver });
  } catch (e) {
    return handleError(e);
  }
}

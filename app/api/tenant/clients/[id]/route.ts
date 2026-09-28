import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateClientSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  rcNumber: z.string().max(50).optional().nullable(),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  billingModel: z.enum(["PREPAID", "POSTPAID"]).optional(),
  creditLimit: z.number().min(0).optional(),
  billingCycleDays: z.number().min(1).max(365).optional(),
  approvalRequirement: z.enum(["MANAGER_ONLY", "CLIENT_ADMIN_ALWAYS", "OVER_THRESHOLD_ONLY"]).optional(),
  approvalThresholdLiters: z.number().min(0).optional().nullable(),
  dailyMaxLiters: z.number().min(0).optional().nullable(),
  allowedStationIds: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        allowedStations: {
          include: {
            station: {
              select: {
                id: true,
                code: true,
                name: true,
                location: true,
                state: true,
              },
            },
          },
        },
        vehicles: {
          orderBy: { createdAt: "desc" },
        },
        drivers: {
          orderBy: { createdAt: "desc" },
        },
        walletLedgers: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
        fuelOrders: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            station: { select: { id: true, name: true, code: true } },
            vehicle: { select: { id: true, plateNumber: true, makeModel: true, fuelType: true } },
            driver: { select: { id: true, fullName: true, phone: true } },
            manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!client || client.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client organization not found.");
    }

    return ok({ client });
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = UpdateClientSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Client not found.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id },
        data: {
          companyName: body.companyName ?? existing.companyName,
          rcNumber: body.rcNumber !== undefined ? body.rcNumber : existing.rcNumber,
          contactPerson: body.contactPerson !== undefined ? body.contactPerson : existing.contactPerson,
          phone: body.phone !== undefined ? body.phone : existing.phone,
          address: body.address !== undefined ? body.address : existing.address,
          status: body.status ?? existing.status,
          billingModel: body.billingModel ?? existing.billingModel,
          creditLimit: body.creditLimit !== undefined ? body.creditLimit : existing.creditLimit,
          billingCycleDays: body.billingCycleDays ?? existing.billingCycleDays,
          approvalRequirement: body.approvalRequirement ?? existing.approvalRequirement,
          approvalThresholdLiters:
            body.approvalThresholdLiters !== undefined ? body.approvalThresholdLiters : existing.approvalThresholdLiters,
          dailyMaxLiters: body.dailyMaxLiters !== undefined ? body.dailyMaxLiters : existing.dailyMaxLiters,
        },
      });

      if (body.allowedStationIds !== undefined) {
        await tx.clientStationAccess.deleteMany({
          where: { clientId: id },
        });

        if (body.allowedStationIds.length > 0) {
          await tx.clientStationAccess.createMany({
            data: body.allowedStationIds.map((stationId) => ({
              tenantId: actor.tenantId,
              clientId: id,
              stationId,
            })),
          });
        }
      }

      return client;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.update",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: updated.id,
      before: existing as unknown as object,
      after: updated as unknown as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ client: updated });
  } catch (e) {
    return handleError(e);
  }
}

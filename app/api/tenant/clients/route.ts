import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const CreateBody = z.object({
  email: z.string().email(),
  companyName: z.string().min(1).max(200),
  rcNumber: z.string().max(50).optional().nullable(),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  billingModel: z.enum(["PREPAID", "POSTPAID"]).default("PREPAID"),
  creditLimit: z.number().min(0).default(0),
  billingCycleDays: z.number().min(1).max(365).default(30),
  approvalRequirement: z.enum(["MANAGER_ONLY", "CLIENT_ADMIN_ALWAYS", "OVER_THRESHOLD_ONLY"]).default("MANAGER_ONLY"),
  approvalThresholdLiters: z.number().min(0).optional().nullable(),
  dailyMaxLiters: z.number().min(0).optional().nullable(),
  allowedStationIds: z.array(z.string()).default([]),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    
    const stationId = url.searchParams.get("stationId");
    const includeDetails = url.searchParams.get("includeDetails") === "true";

    const where: any = { tenantId: actor.tenantId };
    if (stationId) {
      where.allowedStations = { some: { stationId } };
    }

    const includeClause: any = {
      _count: {
        select: {
          allowedStations: true,
          vehicles: true,
          drivers: true,
          fuelOrders: true,
        },
      },
      ...(includeDetails
        ? {
            vehicles: {
              where: { isActive: true },
              select: {
                id: true,
                plateNumber: true,
                makeModel: true,
                fuelType: true,
                tankCapacity: true,
                dailyLimitLiters: true,
              },
            },
            drivers: {
              where: { isActive: true },
              select: {
                id: true,
                fullName: true,
                phone: true,
                licenseNumber: true,
                driverPhotoUrl: true,
                idCardPhotoUrl: true,
              },
            },
            allowedStations: {
              include: {
                station: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          }
        : {}),
    };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include: includeClause,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
      const rows = await prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: includeClause,
      });
      return ok(rows, buildPageMeta(rows, take));
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);
    const existing = await prisma.client.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });
    if (existing) throw new DomainError(409, "email_taken", "Client email already exists in this tenant.");

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          tenantId: actor.tenantId,
          email: body.email.toLowerCase(),
          companyName: body.companyName,
          rcNumber: body.rcNumber ?? null,
          contactPerson: body.contactPerson ?? null,
          phone: body.phone ?? null,
          address: body.address ?? null,
          billingModel: body.billingModel,
          creditLimit: body.creditLimit,
          billingCycleDays: body.billingCycleDays,
          approvalRequirement: body.approvalRequirement,
          approvalThresholdLiters: body.approvalThresholdLiters ?? null,
          dailyMaxLiters: body.dailyMaxLiters ?? null,
        },
      });

      if (body.allowedStationIds && body.allowedStationIds.length > 0) {
        await tx.clientStationAccess.createMany({
          data: body.allowedStationIds.map((stationId) => ({
            tenantId: actor.tenantId,
            clientId: created.id,
            stationId,
          })),
        });
      }

      return created;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.create",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: client.id,
      after: {
        email: client.email,
        companyName: client.companyName,
        billingModel: client.billingModel,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ client });
  } catch (e) {
    return handleError(e);
  }
}

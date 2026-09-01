import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const AssignBody = z.object({
  stationIds: z.array(z.string().min(1)),
});
const AssignAtLeastOneBody = z.object({
  stationIds: z.array(z.string().min(1)).min(1),
});

async function loadStationAccount(id: string, tenantId: string, organizationId: string | null) {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
    select: { id: true, tenantId: true, scope: true, organizationId: true },
  });
  if (!account || account.tenantId !== tenantId) {
    throw new DomainError(404, "not_found", "Bank account not found.");
  }
  if (account.scope !== "STATION") {
    throw new DomainError(400, "invalid_input", "Fleet bank accounts cannot be assigned to stations.");
  }
  if (organizationId && account.organizationId !== organizationId) {
    throw new DomainError(403, "forbidden", "You can only assign accounts owned by your organization.");
  }
  if (!account.organizationId) {
    throw new DomainError(400, "invalid_input", "Organization bank account is missing an organization.");
  }
  return account;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key, "STATION");
    const { id } = await params;
    const account = await loadStationAccount(id, actor.tenantId, actor.organizationId);
    const assignments = await prisma.stationBankAccount.findMany({
      where: { tenantId: actor.tenantId, bankAccountId: account.id },
      include: {
        station: { select: { id: true, name: true, code: true, organizationId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ assignments });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_BANK_ACCOUNTS_WRITE.key, "STATION");
    const { id } = await params;
    const body = AssignAtLeastOneBody.parse(await request.json());
    const meta = requestMeta(request);
    const account = await loadStationAccount(id, actor.tenantId, actor.organizationId);

    const stations = await prisma.station.findMany({
      where: {
        id: { in: body.stationIds },
        tenantId: actor.tenantId,
        organizationId: account.organizationId!,
      },
      select: { id: true },
    });
    if (stations.length !== body.stationIds.length) {
      throw new DomainError(
        400,
        "invalid_input",
        "One or more stations are invalid or do not belong to this organization.",
      );
    }

    await prisma.$transaction(
      stations.map((station) =>
        prisma.stationBankAccount.upsert({
          where: {
            stationId_bankAccountId: {
              stationId: station.id,
              bankAccountId: account.id,
            },
          },
          update: { isActive: true, assignedById: actor.userId },
          create: {
            tenantId: actor.tenantId,
            stationId: station.id,
            bankAccountId: account.id,
            assignedById: actor.userId,
            isActive: true,
          },
        }),
      ),
    );

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.assign_stations",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: account.id,
      after: { stationIds: body.stationIds } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const assignments = await prisma.stationBankAccount.findMany({
      where: { tenantId: actor.tenantId, bankAccountId: account.id, isActive: true },
      include: {
        station: { select: { id: true, name: true, code: true } },
      },
    });

    return ok({ assignments });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_BANK_ACCOUNTS_WRITE.key, "STATION");
    const { id } = await params;
    const body = AssignBody.parse(await request.json());
    const meta = requestMeta(request);
    const account = await loadStationAccount(id, actor.tenantId, actor.organizationId);

    const stations = await prisma.station.findMany({
      where: {
        id: { in: body.stationIds },
        tenantId: actor.tenantId,
        organizationId: account.organizationId!,
      },
      select: { id: true },
    });
    if (stations.length !== body.stationIds.length) {
      throw new DomainError(
        400,
        "invalid_input",
        "One or more stations are invalid or do not belong to this organization.",
      );
    }

    const keepIds = stations.map((s) => s.id);
    if (keepIds.length === 0) {
      await prisma.stationBankAccount.deleteMany({
        where: { tenantId: actor.tenantId, bankAccountId: account.id },
      });
    } else {
    await prisma.$transaction([
      prisma.stationBankAccount.deleteMany({
        where: {
          tenantId: actor.tenantId,
          bankAccountId: account.id,
          stationId: { notIn: keepIds },
        },
      }),
      ...stations.map((station) =>
        prisma.stationBankAccount.upsert({
          where: {
            stationId_bankAccountId: {
              stationId: station.id,
              bankAccountId: account.id,
            },
          },
          update: { isActive: true, assignedById: actor.userId },
          create: {
            tenantId: actor.tenantId,
            stationId: station.id,
            bankAccountId: account.id,
            assignedById: actor.userId,
            isActive: true,
          },
        }),
      ),
    ]);
    }

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.replace_stations",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: account.id,
      after: { stationIds: keepIds } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const assignments = await prisma.stationBankAccount.findMany({
      where: { tenantId: actor.tenantId, bankAccountId: account.id, isActive: true },
      include: {
        station: { select: { id: true, name: true, code: true } },
      },
    });

    return ok({ assignments });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_BANK_ACCOUNTS_WRITE.key, "STATION");
    const { id } = await params;
    const body = AssignBody.parse(await request.json());
    const meta = requestMeta(request);
    const account = await loadStationAccount(id, actor.tenantId, actor.organizationId);

    await prisma.stationBankAccount.deleteMany({
      where: {
        tenantId: actor.tenantId,
        bankAccountId: account.id,
        stationId: { in: body.stationIds },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.unassign_stations",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: account.id,
      after: { stationIds: body.stationIds } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

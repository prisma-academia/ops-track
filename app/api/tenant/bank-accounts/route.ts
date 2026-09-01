import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS, AuthError } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { resolveStationBankAccountOrgId, stationAccountListFilter } from "@/lib/bank-accounts/org";

const CreateBankAccountSchema = z.object({
  scope: z.enum(["STATION", "FLEET"]),
  accountName: z.string().min(2).max(255),
  accountNumber: z.string().min(2).max(50),
  bankName: z.string().min(2).max(255),
  isActive: z.boolean().default(true),
  organizationId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const isActive = url.searchParams.get("isActive");
    const stationId = url.searchParams.get("stationId");
    const requestedOrgId = url.searchParams.get("organizationId");

    const where: Record<string, unknown> = { tenantId: actor.tenantId };
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (scope === "FLEET") {
      if (!hasPermission(actor, PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_READ.key)) {
        throw new AuthError(403, "Forbidden.");
      }
      where.scope = "FLEET";
      where.organizationId = null;
    } else if (scope === "STATION") {
      if (!hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key)) {
        throw new AuthError(403, "Forbidden.");
      }
      if (stationId) {
        const station = await prisma.station.findFirst({
          where: { id: stationId, tenantId: actor.tenantId },
          select: { id: true, organizationId: true },
        });
        if (!station) {
          throw new DomainError(404, "not_found", "Station not found.");
        }
        if (actor.organizationId && actor.organizationId !== station.organizationId) {
          throw new AuthError(403, "Forbidden.");
        }
        where.scope = "STATION";
        where.stationAssignments = {
          some: { stationId: station.id, isActive: true },
        };
      } else {
        const orgId = await resolveStationBankAccountOrgId(actor, requestedOrgId);
        Object.assign(where, stationAccountListFilter(actor, orgId));
      }
    } else {
      throw new DomainError(400, "invalid_input", "A bank account scope is required.");
    }

    const include = {
      stationAssignments: {
        where: { isActive: true },
        select: {
          stationId: true,
          station: { select: { id: true, name: true, code: true } },
        },
      },
      organization: { select: { id: true, name: true } },
    };

    if (url.searchParams.has("page")) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows] = await Promise.all([
        prisma.bankAccount.count({ where }),
        prisma.bankAccount.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include,
        }),
      ]);
      return ok(rawRows, buildOffsetPageMeta(totalCount, page, take));
    }

    const { cursor, take } = parsePagination(url.searchParams);
    const rawRows = await prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include,
    });

    return ok(rawRows, buildPageMeta(rawRows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = CreateBankAccountSchema.parse(await request.json());
    const actor = await requireTenantActor(
      body.scope === "STATION"
        ? PERMISSIONS.TENANT_BANK_ACCOUNTS_WRITE.key
        : PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_WRITE.key,
      body.scope === "STATION" ? "STATION" : "FLEET",
    );
    const meta = requestMeta(request);

    if (body.scope === "FLEET" && body.organizationId) {
      throw new DomainError(400, "invalid_input", "Fleet bank accounts cannot belong to an organization.");
    }

    const organizationId =
      body.scope === "STATION"
        ? await resolveStationBankAccountOrgId(actor, body.organizationId)
        : null;

    const existing = await prisma.bankAccount.findFirst({
      where: {
        tenantId: actor.tenantId,
        accountNumber: body.accountNumber,
        bankName: body.bankName,
      },
    });

    if (existing) {
      throw new DomainError(409, "account_exists", "This account number already exists for this bank in your tenant.");
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        tenantId: actor.tenantId,
        scope: body.scope,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        bankName: body.bankName,
        isActive: body.isActive,
        organizationId,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.create",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: bankAccount.id,
      after: {
        accountNumber: bankAccount.accountNumber,
        bankName: bankAccount.bankName,
        scope: bankAccount.scope,
        organizationId,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ bankAccount });
  } catch (e) {
    return handleError(e);
  }
}

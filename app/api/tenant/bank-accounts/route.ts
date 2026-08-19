import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateBankAccountSchema = z.object({
  scope: z.enum(["STATION", "FLEET"]),
  accountName: z.string().min(2).max(255),
  accountNumber: z.string().min(2).max(50),
  bankName: z.string().min(2).max(255),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const scope = url.searchParams.get("scope");
    const isActive = url.searchParams.get("isActive");

    const where: any = { tenantId: actor.tenantId };
    if (scope === "STATION" || scope === "FLEET") {
      where.scope = scope;
    }
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const rawRows = await prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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
        : PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_WRITE.key
    );
    const meta = requestMeta(request);

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
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.create",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: bankAccount.id,
      after: { accountNumber: bankAccount.accountNumber, bankName: bankAccount.bankName } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ bankAccount });
  } catch (e) {
    return handleError(e);
  }
}

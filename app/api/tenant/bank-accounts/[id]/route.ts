import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS, AuthError } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateBankAccountSchema = z.object({
  accountName: z.string().min(2).max(255).optional(),
  accountNumber: z.string().min(2).max(50).optional(),
  bankName: z.string().min(2).max(255).optional(),
  isActive: z.boolean().optional(),
});

function writePermissionForScope(scope: "STATION" | "FLEET") {
  return scope === "STATION"
    ? PERMISSIONS.TENANT_BANK_ACCOUNTS_WRITE.key
    : PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_WRITE.key;
}

async function loadOwnedAccount(id: string, tenantId: string) {
  const existingAccount = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existingAccount || existingAccount.tenantId !== tenantId) {
    throw new DomainError(404, "not_found", "Bank account not found.");
  }
  return existingAccount;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const body = UpdateBankAccountSchema.parse(await request.json());
    const meta = requestMeta(request);
    const { id } = await params;

    const existingAccount = await loadOwnedAccount(id, actor.tenantId);

    if (!hasPermission(actor, writePermissionForScope(existingAccount.scope))) {
      throw new AuthError(403, "Forbidden.");
    }
    if (
      existingAccount.scope === "STATION" &&
      actor.organizationId &&
      existingAccount.organizationId !== actor.organizationId
    ) {
      throw new AuthError(403, "Forbidden.");
    }

    if (body.accountNumber && body.accountNumber.trim() !== existingAccount.accountNumber) {
      // Check if account has any existing transactions
      const [txCount, salesPaymentCount, salesLogCount, expenseCount] = await Promise.all([
        prisma.transaction.count({ where: { bankAccountId: id } }),
        prisma.salesPayment.count({ where: { bankAccountId: id } }),
        prisma.salesLog.count({
          where: {
            OR: [
              { posBankAccountId: id },
              { transferBankAccountId: id },
            ],
          },
        }),
        prisma.expense.count({ where: { bankAccountId: id } }),
      ]);

      const totalActivity = txCount + salesPaymentCount + salesLogCount + expenseCount;
      if (totalActivity > 0) {
        throw new DomainError(
          400,
          "account_has_transactions",
          "Cannot change the account number of a bank account that has existing transaction history."
        );
      }

      const cleanAccountNumber = body.accountNumber.trim();

      const duplicate = await prisma.bankAccount.findFirst({
        where: {
          tenantId: actor.tenantId,
          accountNumber: { equals: cleanAccountNumber, mode: "insensitive" },
          scope: existingAccount.scope,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new DomainError(
          409,
          "account_exists",
          `Account number ${cleanAccountNumber} already exists in ${existingAccount.scope.toLowerCase()} accounts (${duplicate.bankName} - ${duplicate.accountName}).`
        );
      }
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(body.accountName && { accountName: body.accountName.trim() }),
        ...(body.accountNumber && body.accountNumber.trim() !== existingAccount.accountNumber && {
          accountNumber: body.accountNumber.trim(),
        }),
        ...(body.bankName && { bankName: body.bankName.trim() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.update",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: bankAccount.id,
      before: existingAccount as object,
      after: bankAccount as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ bankAccount });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const meta = requestMeta(request);
    const { id } = await params;

    const existingAccount = await loadOwnedAccount(id, actor.tenantId);

    if (!hasPermission(actor, writePermissionForScope(existingAccount.scope))) {
      throw new AuthError(403, "Forbidden.");
    }
    if (
      existingAccount.scope === "STATION" &&
      actor.organizationId &&
      existingAccount.organizationId !== actor.organizationId
    ) {
      throw new AuthError(403, "Forbidden.");
    }

    // Check if account has any financial transactions or activity
    const [txCount, salesPaymentCount, salesLogCount, expenseCount] = await Promise.all([
      prisma.transaction.count({ where: { bankAccountId: id } }),
      prisma.salesPayment.count({ where: { bankAccountId: id } }),
      prisma.salesLog.count({
        where: {
          OR: [
            { posBankAccountId: id },
            { transferBankAccountId: id },
          ],
        },
      }),
      prisma.expense.count({ where: { bankAccountId: id } }),
    ]);

    const totalActivity = txCount + salesPaymentCount + salesLogCount + expenseCount;
    if (totalActivity > 0) {
      throw new DomainError(
        400,
        "account_has_transactions",
        "Cannot delete a bank account that has existing transactions or sales records. You can deactivate it instead."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.stationBankAccount.deleteMany({
        where: { bankAccountId: id },
      });
      await tx.bankAccount.delete({
        where: { id },
      });
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "bank_account.delete",
      tenantId: actor.tenantId,
      targetType: "BankAccount",
      targetId: id,
      before: existingAccount as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

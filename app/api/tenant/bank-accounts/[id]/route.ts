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

    if (body.accountNumber || body.bankName) {
      const duplicate = await prisma.bankAccount.findFirst({
        where: {
          tenantId: actor.tenantId,
          accountNumber: body.accountNumber ?? existingAccount.accountNumber,
          bankName: body.bankName ?? existingAccount.bankName,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new DomainError(409, "account_exists", "This account number already exists for this bank in your tenant.");
      }
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(body.accountName && { accountName: body.accountName }),
        ...(body.accountNumber && { accountNumber: body.accountNumber }),
        ...(body.bankName && { bankName: body.bankName }),
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

    await prisma.bankAccount.delete({
      where: { id },
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

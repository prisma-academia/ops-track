import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateBankAccountSchema = z.object({
  scope: z.enum(["STATION", "FLEET"]).optional(),
  accountName: z.string().min(2).max(255).optional(),
  accountNumber: z.string().min(2).max(50).optional(),
  bankName: z.string().min(2).max(255).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SETTINGS_WRITE.key);
    const body = UpdateBankAccountSchema.parse(await request.json());
    const meta = requestMeta(request);
    const { id } = await params;

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount || existingAccount.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Bank account not found.");
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
        ...(body.scope && { scope: body.scope }),
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SETTINGS_WRITE.key);
    const meta = requestMeta(request);
    const { id } = await params;

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount || existingAccount.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Bank account not found.");
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

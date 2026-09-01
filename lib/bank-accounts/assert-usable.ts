import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";

export async function assertBankAccountUsable(params: {
  accountId: string;
  tenantId: string;
  context: "FLEET" | "STATION";
  stationId?: string | null;
}): Promise<{ id: string; scope: "FLEET" | "STATION"; organizationId: string | null }> {
  const account = await prisma.bankAccount.findFirst({
    where: { id: params.accountId, tenantId: params.tenantId, isActive: true },
    select: { id: true, scope: true, organizationId: true },
  });
  if (!account) {
    throw new DomainError(400, "invalid_input", "Bank account is invalid or inactive.");
  }

  if (params.context === "FLEET") {
    if (account.scope !== "FLEET") {
      throw new DomainError(400, "invalid_input", "Only fleet bank accounts can be used for fleet payments.");
    }
    return account;
  }

  if (account.scope !== "STATION") {
    throw new DomainError(400, "invalid_input", "Only organization bank accounts can be used at stations.");
  }
  if (!params.stationId) {
    throw new DomainError(400, "invalid_input", "A station is required to use an organization bank account.");
  }

  const assignment = await prisma.stationBankAccount.findFirst({
    where: {
      tenantId: params.tenantId,
      bankAccountId: account.id,
      stationId: params.stationId,
      isActive: true,
    },
    select: { id: true },
  });
  if (!assignment) {
    throw new DomainError(
      400,
      "invalid_input",
      "This bank account is not assigned to the selected station.",
    );
  }

  return account;
}

export async function assertOptionalBankAccount(params: {
  accountId?: string | null;
  tenantId: string;
  context: "FLEET" | "STATION";
  stationId?: string | null;
}): Promise<void> {
  if (!params.accountId) return;
  await assertBankAccountUsable({
    accountId: params.accountId,
    tenantId: params.tenantId,
    context: params.context,
    stationId: params.stationId,
  });
}

export async function assertBankAccountsUsableForStation(params: {
  accountIds: string[];
  tenantId: string;
  stationId: string;
}): Promise<void> {
  const uniqueIds = [...new Set(params.accountIds.filter(Boolean))];
  for (const accountId of uniqueIds) {
    await assertBankAccountUsable({
      accountId,
      tenantId: params.tenantId,
      context: "STATION",
      stationId: params.stationId,
    });
  }
}

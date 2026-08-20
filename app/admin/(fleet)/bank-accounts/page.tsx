import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { BankAccountsTable } from "@/components/bank-accounts/bank-accounts-table";
import { PageHeader } from "@/components/shell";

export default async function FleetBankAccountsPage() {
  const actor = await requireTenantPage(undefined, "FLEET");
  const canReadFleet = hasPermission(actor, PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_READ.key);
  const canReadStation = hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key);
  if (!canReadFleet && !canReadStation) {
    redirect("/admin?error=unauthorized");
  }

  const take = 25;
  const skip = 0;
  const scopeFilter: "FLEET" | "STATION" | undefined =
    canReadFleet && canReadStation ? undefined : canReadFleet ? "FLEET" : "STATION";
  const where: { tenantId: string; scope?: "FLEET" | "STATION" } = {
    tenantId: actor.tenantId,
  };
  if (scopeFilter) where.scope = scopeFilter;

  const [totalCount, rawRows] = await Promise.all([
    prisma.bankAccount.count({ where }),
    prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page: 1,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: 1 < totalPages,
    hasPreviousPage: false,
  };

  const rows = rawRows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader 
        title="Bank Accounts" 
      />
      <div className="mt-6">
        <BankAccountsTable
          tenantSlug={actor.tenantId}
          initialData={rows}
          initialMeta={initialMeta}
          scopeFilter={scopeFilter}
        />
      </div>
    </div>
  );
}

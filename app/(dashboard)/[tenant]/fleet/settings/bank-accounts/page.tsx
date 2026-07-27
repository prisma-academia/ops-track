import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BankAccountsTable } from "@/components/bank-accounts/bank-accounts-table";
import { PageHeader } from "@/components/shell";

export default async function FleetBankAccountsPage({ params }: { params: { tenant: string } }) {
  // It's possible we might want a different permission for Fleet, but for now we use settings
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SETTINGS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, rawRows] = await Promise.all([
    prisma.bankAccount.count({
      where: { tenantId: actor.tenantId, scope: "FLEET" },
    }),
    prisma.bankAccount.findMany({
      where: { tenantId: actor.tenantId, scope: "FLEET" },
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
    <div className="p-6">
      <PageHeader 
        title="Fleet Bank Accounts" 
      />
      <div className="mt-6">
        <BankAccountsTable
          tenantSlug={params.tenant}
          initialData={rows}
          initialMeta={initialMeta}
          scopeFilter="FLEET"
        />
      </div>
    </div>
  );
}

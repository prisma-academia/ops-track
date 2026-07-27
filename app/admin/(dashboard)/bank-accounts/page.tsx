import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BankAccountsTable } from "@/components/bank-accounts/bank-accounts-table";
import { PageHeader } from "@/components/shell";

export default async function StationBankAccountsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SETTINGS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, rawRows] = await Promise.all([
    prisma.bankAccount.count({
      where: { tenantId: actor.tenantId, scope: "STATION" },
    }),
    prisma.bankAccount.findMany({
      where: { tenantId: actor.tenantId, scope: "STATION" },
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
        title="Station Bank Accounts" 
      />
      <div className="mt-6">
        <BankAccountsTable
          tenantSlug={actor.tenantId} // tenantSlug is usually derived from context, but we use ID here or they can just let the API infer it
          initialData={rows}
          initialMeta={initialMeta}
          scopeFilter="STATION"
        />
      </div>
    </div>
  );
}

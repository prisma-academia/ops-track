import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { BankAccountsTable } from "@/components/bank-accounts/bank-accounts-table";
import { PageHeader } from "@/components/shell";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { orgStationBankAccountWhere } from "@/lib/bank-accounts/queries";

export default async function StationBankAccountsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key, "STATION");
  if (!hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key)) {
    redirect("/admin/station/profile?error=unauthorized");
  }

  const take = 25;
  const skip = 0;
  const activeOrgId = await resolveActiveOrgId(actor);
  let organizationId = actor.organizationId ?? activeOrgId;
  if (!organizationId) {
    const internal = await prisma.organization.findFirst({
      where: { tenantId: actor.tenantId, type: "INTERNAL" },
      select: { id: true },
    });
    organizationId = internal?.id ?? null;
  }
  const where = orgStationBankAccountWhere({
    tenantId: actor.tenantId,
    organizationId,
  });

  const [totalCount, rawRows] = await Promise.all([
    prisma.bankAccount.count({ where }),
    prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        stationAssignments: {
          where: { isActive: true },
          select: {
            stationId: true,
            station: { select: { id: true, name: true, code: true } },
          },
        },
      },
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

  const rows = rawRows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="Bank Accounts" />
      <div className="mt-6">
        <BankAccountsTable
          tenantSlug={actor.tenantId}
          initialData={rows}
          initialMeta={initialMeta}
          scopeFilter="STATION"
          createScope="STATION"
          detailBase="/admin/station/bank-accounts"
        />
      </div>
    </div>
  );
}

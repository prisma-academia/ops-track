import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesManager } from "./expenses-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { orgStationBankAccountWhere } from "@/lib/bank-accounts/queries";

export default async function ExpensesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_EXPENSES_READ.key);

  const take = 25;
  const skip = 0;

  const activeOrgId = await resolveActiveOrgId(actor);

  const expenseWhere: any = { tenantId: actor.tenantId, status: "APPROVED" };
  if (activeOrgId) {
    expenseWhere.station = { organizationId: activeOrgId };
  }

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const [totalCount, expenses] = await Promise.all([
    prisma.expense.count({ where: expenseWhere }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        bankAccount: true,
        recordedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        ticket: {
          select: { id: true, title: true, status: true, category: true },
        },
      },
    }),
  ]);

  const stations = await prisma.station.findMany({
    where: stationWhere,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: orgStationBankAccountWhere({
      tenantId: actor.tenantId,
      organizationId: actor.organizationId ?? activeOrgId,
      isActive: true,
    }),
    select: {
      id: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
    },
    orderBy: { bankName: "asc" },
  });

  const serializedExpenses = JSON.parse(JSON.stringify(expenses));
  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedBankAccounts = JSON.parse(JSON.stringify(bankAccounts));

  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page: 1,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: 1 < totalPages,
    hasPreviousPage: false,
  };

  return (
    <ExpensesManager
      initialExpenses={serializedExpenses}
      stations={serializedStations}
      bankAccounts={serializedBankAccounts}
      initialMeta={initialMeta}
    />
  );
}

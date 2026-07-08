import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesManager } from "./expenses-manager";

export default async function ExpensesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_EXPENSES_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, expenses] = await Promise.all([
    prisma.expense.count({ where: { tenantId: actor.tenantId } }),
    prisma.expense.findMany({
      where: { tenantId: actor.tenantId },
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
      },
    }),
  ]);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const serializedExpenses = JSON.parse(JSON.stringify(expenses));
  const serializedStations = JSON.parse(JSON.stringify(stations));

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
      initialMeta={initialMeta}
    />
  );
}

import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CustomersManager } from "./customers-manager";

export default async function CustomersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CUSTOMERS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, customers] = await Promise.all([
    prisma.customer.count({ where: { tenantId: actor.tenantId } }),
    prisma.customer.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
  ]);

  const serializedCustomers = JSON.parse(JSON.stringify(customers));

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
    <CustomersManager
      initialCustomers={serializedCustomers}
      initialMeta={initialMeta}
    />
  );
}

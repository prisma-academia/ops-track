import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CustomersManager } from "./customers-manager";

export default async function CustomersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CUSTOMERS_READ.key);

  const customers = await prisma.customer.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const serializedCustomers = JSON.parse(JSON.stringify(customers));

  return (
    <CustomersManager
      initialCustomers={serializedCustomers}
    />
  );
}

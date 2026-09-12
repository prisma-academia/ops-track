import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { CustomersTable, type CustomerRow } from "./table";

export default async function CustomersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key);

  const take = 25;
  const skip = 0;

  const whereClause = { tenantId: actor.tenantId };

  const [totalCount, customers] = await Promise.all([
    prisma.customer.count({ where: whereClause }),
    prisma.customer.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        deliveries: {
          select: {
            totalExpectedAmount: true,
            paymentReceived: true,
          },
        },
      },
    }),
  ]);

  const rows: CustomerRow[] = customers.map((c) => {
    const deliveryBalance = (c.deliveries || []).reduce((sum, d) => {
      const expected = d.totalExpectedAmount ? d.totalExpectedAmount.toNumber() : 0;
      const paid = d.paymentReceived ? d.paymentReceived.toNumber() : 0;
      return sum + Math.max(0, expected - paid);
    }, 0);

    const outstandingBalance =
      c.deliveries && c.deliveries.length > 0
        ? deliveryBalance
        : c.outstandingBalance.toNumber();

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      contactPerson: c.contactPerson,
      contactPhone: c.contactPhone,
      contactPosition: c.contactPosition,
      outstandingBalance,
      depositBalance: c.depositBalance.toNumber(),
      createdAt: c.createdAt.toISOString(),
    };
  });

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
    <div>
      <DataTableToolbar 
        title="Customers" 
        action={
          <Link
            href="/admin/customers/create"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Add Customer
          </Link>
        }
      />
      <CustomersTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}

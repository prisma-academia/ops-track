import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SuppliersTable, type SupplierRow } from "./table";
import { formatSupplierRow } from "@/lib/fleet/suppliers";

export default async function SuppliersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, suppliers] = await Promise.all([
    prisma.supplier.count({ where: { tenantId: actor.tenantId } }),
    prisma.supplier.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { name: "asc" },
      take,
      skip,
      include: {
        orders: {
          select: {
            pricePerLitre: true,
            loadingCostPerLitre: true,
            litersOrdered: true,
            paymentPaid: true,
          },
        },
      },
    }),
  ]);

  const rows: SupplierRow[] = suppliers.map((s) => {
    const formatted = formatSupplierRow(s);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      contactPerson: s.contactPerson,
      contactPhone: s.contactPhone,
      contactPosition: s.contactPosition,
      outstandingBalance: formatted.outstandingBalance,
      depositBalance: formatted.depositBalance,
      createdAt: s.createdAt.toISOString(),
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
        title="Suppliers"
        action={
          <Link
            href="/admin/suppliers/create"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Add Supplier
          </Link>
        }
      />
      <SuppliersTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}

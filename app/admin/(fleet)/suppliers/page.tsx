import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SuppliersTable, type SupplierRow } from "./table";
import {
  aggregateSupplierListTotals,
  mapSupplierListRow,
  supplierMetricsOrderInclude,
} from "@/lib/fleet/supplier-list";
import { FleetStatGroupCard } from "../_components/overview/fleet-stat-group-card";
import type { FleetStatGroup } from "../types";
import { formatShortCurrency } from "@/lib/utils";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SuppliersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, allSuppliers, tenant] = await Promise.all([
    prisma.supplier.count({ where: { tenantId: actor.tenantId } }),
    prisma.supplier.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { name: "asc" },
      include: supplierMetricsOrderInclude,
    }),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    }),
  ]);

  const mappedRows = await Promise.all(
    allSuppliers.map(async (s) => {
      const row = await mapSupplierListRow(s, actor.tenantId, tenant?.settingsJson);
      return {
        ...row,
        name: s.name,
        email: s.email,
        phone: s.phone,
        contactPerson: s.contactPerson,
        contactPhone: s.contactPhone,
        contactPosition: s.contactPosition,
        outstandingBalance: Number(row.outstandingBalance),
        depositBalance: Number(row.depositBalance),
        supplierType: row.supplierType as SupplierRow["supplierType"],
        totalExpectedAmount: row.totalExpectedAmount,
        amountPaid: row.amountPaid,
        saleProfit: row.saleProfit,
        createdAt: s.createdAt.toISOString(),
      };
    })
  );

  const totals = aggregateSupplierListTotals(mappedRows);

  const statGroups: FleetStatGroup[] = [
    {
      id: "supplier-payments",
      title: "Supplier Payments",
      accent: "violet",
      headerIcon: "supplier",
      hint: `${totalCount.toLocaleString()} supplier${totalCount === 1 ? "" : "s"}`,
      metrics: [
        {
          label: "Total Expected Amount",
          icon: "expected",
          value: formatShortCurrency(totals.totalExpectedAmount),
          tooltip: formatNaira(totals.totalExpectedAmount),
        },
        {
          label: "Total Paid",
          icon: "paid",
          value: formatShortCurrency(totals.amountPaid),
          tooltip: formatNaira(totals.amountPaid),
        },
      ],
    },
    {
      id: "supplier-balance",
      title: "Balances & P&L",
      accent: "emerald",
      headerIcon: "sales",
      hint: "All suppliers",
      metrics: [
        {
          label: "Amount Owed",
          icon: "collected",
          value: formatShortCurrency(totals.outstandingBalance),
          tooltip: formatNaira(totals.outstandingBalance),
        },
        {
          label: "Profit on Sale",
          icon: "sold",
          value: formatShortCurrency(totals.saleProfit),
          tooltip: formatNaira(totals.saleProfit),
        },
      ],
    },
  ];

  const rows: SupplierRow[] = mappedRows.slice(skip, skip + take);

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
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statGroups.map((group) => (
          <FleetStatGroupCard key={group.id} group={group} />
        ))}
      </div>

      <SuppliersTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}

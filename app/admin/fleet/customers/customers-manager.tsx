"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Plus, User } from "lucide-react";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerRow = {
  id: string;
  name: string;
  outstandingBalance: number | string;
  depositBalance: number | string;
  createdAt: string;
};

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: "name",
    header: "Customer Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
          <User size={16} />
        </div>
        <span className="font-semibold text-stone-800">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "outstandingBalance",
    header: () => <div className="text-right">Outstanding Balance</div>,
    cell: ({ row }) => {
      const bal = Number(row.original.outstandingBalance);
      return (
        <div className={`text-right font-mono font-bold text-sm ${bal > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {bal.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "depositBalance",
    header: () => <div className="text-right">Deposit Balance</div>,
    cell: ({ row }) => {
      const bal = Number(row.original.depositBalance || 0);
      return (
        <div className={`text-right font-mono font-bold text-sm ${bal > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-stone-500"}`}>
          {bal.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => (
      <span className="text-xs text-stone-500">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

export function CustomersManager({
  initialCustomers,
  initialMeta,
}: {
  initialCustomers: any[];
  initialMeta: any;
}) {


  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<CustomerRow>({
    baseUrl: "/api/tenant/customers",
  });

  useEffect(() => {
    setInitialData(initialCustomers, initialMeta);
  }, [initialCustomers, initialMeta, setInitialData]);

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="B2B Customers"
        description="Manage corporate customer accounts and track outstanding balances."
        action={
          <Button asChild>
            <Link href="/admin/fleet/customers/create">
              <Plus size={16} className="mr-1" /> Add Customer
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data.length > 0 ? data : initialCustomers}
        isLoading={isLoading}
        serverPagination={{
          ...meta,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        filterColumnId="name"
        searchPlaceholder="Search by name…"
        rowHref={(row) => `/admin/fleet/customers/${row.id}`}
      />
    </div>
  );
}

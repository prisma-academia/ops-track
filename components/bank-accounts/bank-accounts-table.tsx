"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Building2 } from "lucide-react";
import { BankAccountFormModal } from "./bank-account-form-modal";

export type BankAccountRow = {
  id: string;
  scope: "STATION" | "FLEET";
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive: boolean;
  stationAssignments?: { stationId: string; station: { id: string; name: string; code: string } }[];
};

export function BankAccountsTable({
  initialData,
  initialMeta,
  tenantSlug,
  scopeFilter,
  createScope,
  detailBase,
}: {
  initialData: BankAccountRow[];
  initialMeta?: unknown;
  tenantSlug: string;
  scopeFilter?: "STATION" | "FLEET";
  createScope?: "STATION" | "FLEET";
  detailBase?: string;
}) {
  const router = useRouter();
  const [editingAccount, setEditingAccount] = useState<BankAccountRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const baseUrl = scopeFilter 
    ? `/api/tenant/bank-accounts?scope=${scopeFilter}` 
    : `/api/tenant/bank-accounts`;

  const { data, meta, isLoading, setPage, setPageSize, setInitialData, refresh } = usePaginatedQuery<BankAccountRow>({
    baseUrl,
    initialData,
    initialMeta,
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const columns: ColumnDef<BankAccountRow>[] = [
    {
      accessorKey: "bankName",
      header: "Bank Name",
      cell: ({ row }) => <span className="font-semibold">{row.original.bankName}</span>,
    },
    {
      accessorKey: "accountName",
      header: "Account Name",
    },
    {
      accessorKey: "accountNumber",
      header: "Account Number",
      cell: ({ row }) => <span className="font-mono">{row.original.accountNumber}</span>,
    },
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => (
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {row.original.scope}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isActive ? (
            <><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-sm">Active</span></>
          ) : (
            <><XCircle className="size-4 text-muted-foreground" /><span className="text-sm">Inactive</span></>
          )}
        </div>
      ),
    },
    ...(createScope === "STATION" || scopeFilter === "STATION"
      ? [{
          id: "assignedStations",
          header: "Assigned Stations",
          cell: ({ row }: { row: { original: BankAccountRow } }) => {
            const count = (row.original.stationAssignments ?? []).length;
            if (count === 0) {
              return (
                <span className="text-xs text-muted-foreground italic">
                  0 Stations
                </span>
              );
            }
            return (
              <Badge variant="secondary" className="font-normal text-xs gap-1.5 py-0.5">
                <Building2 className="size-3 text-muted-foreground" />
                <span>{count} {count === 1 ? "Station" : "Stations"}</span>
              </Badge>
            );
          },
        } satisfies ColumnDef<BankAccountRow>]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        serverPagination={{
          ...meta,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        filterColumnId="bankName"
        searchPlaceholder="Search by bank name..."
        rowHref={(row) => {
          if (detailBase) return `${detailBase}/${row.id}`;
          return scopeFilter === "STATION"
            ? `/admin/station/bank-accounts/${row.id}`
            : `/admin/bank-accounts/${row.id}`;
        }}
        headerAction={
          <Button onClick={() => {
            setEditingAccount(null);
            setIsModalOpen(true);
          }}>
            Add Account
          </Button>
        }
      />

      <BankAccountFormModal
        tenantSlug={tenantSlug}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refresh();
          router.refresh();
        }}
        initialData={editingAccount}
        fixedScope={createScope ?? scopeFilter}
      />
    </>
  );
}

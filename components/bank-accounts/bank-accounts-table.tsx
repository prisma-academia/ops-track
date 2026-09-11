"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Building2 } from "lucide-react";
import { BankAccountFormModal } from "./bank-account-form-modal";
import { AssignStationsModal } from "./assign-stations-modal";
import { toast } from "sonner";
import { apiDelete } from "@/lib/client/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [assigningAccount, setAssigningAccount] = useState<BankAccountRow | null>(null);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/tenant/bank-accounts/${deletingId}`);
      if (res.error) throw new Error(res.error.message);
      toast.success("Bank account deleted");
      refresh();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

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
          id: "stations",
          header: "Stations",
          cell: ({ row }: { row: { original: BankAccountRow } }) => {
            const names = (row.original.stationAssignments ?? []).map((a) => a.station?.name).filter(Boolean);
            return (
              <span className="text-sm text-muted-foreground">
                {names.length > 0 ? names.join(", ") : "Unassigned"}
              </span>
            );
          },
        } satisfies ColumnDef<BankAccountRow>]
      : []),
    ...(createScope === "STATION" || scopeFilter === "STATION"
      ? [{
          id: "assign",
          header: "",
          cell: ({ row }: { row: { original: BankAccountRow } }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAssigningAccount(row.original);
              }}
            >
              <Building2 className="size-3.5" />
              Assign
            </Button>
          ),
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

      {assigningAccount && (
        <AssignStationsModal
          accountId={assigningAccount.id}
          accountLabel={`${assigningAccount.bankName} · ${assigningAccount.accountNumber}`}
          isOpen={!!assigningAccount}
          onClose={() => setAssigningAccount(null)}
          onSuccess={() => {
            refresh();
            router.refresh();
          }}
          initiallyAssignedIds={(assigningAccount.stationAssignments ?? []).map((a) => a.stationId)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

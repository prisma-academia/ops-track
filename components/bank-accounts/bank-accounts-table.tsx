"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { BankAccountFormModal } from "./bank-account-form-modal";
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
};

export function BankAccountsTable({
  initialData,
  initialMeta,
  tenantSlug,
  scopeFilter,
}: {
  initialData: BankAccountRow[];
  initialMeta: any;
  tenantSlug: string;
  scopeFilter?: "STATION" | "FLEET";
}) {
  const router = useRouter();
  const [editingAccount, setEditingAccount] = useState<BankAccountRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseUrl = scopeFilter 
    ? `/api/tenant/bank-accounts?scope=${scopeFilter}` 
    : `/api/tenant/bank-accounts`;

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<BankAccountRow>({
    baseUrl,
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
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const detailUrl = scopeFilter === "FLEET" 
          ? `/admin/fleet/bank-accounts/${row.original.id}`
          : `/admin/bank-accounts/${row.original.id}`;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(detailUrl);
              }}
            >
              View Details
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setEditingAccount(row.original);
                setIsModalOpen(true);
              }}
            >
              <Edit2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(row.original.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={(data ?? []).length > 0 ? data : initialData}
        isLoading={isLoading}
        serverPagination={{
          ...meta,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        filterColumnId="bankName"
        searchPlaceholder="Search by bank name..."
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
        onSuccess={() => router.refresh()}
        initialData={editingAccount}
        fixedScope={scopeFilter}
      />

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

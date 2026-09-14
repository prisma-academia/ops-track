"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Trash2,
  Building2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
  type DataTableFilterField,
} from "@/components/tables";
import { BankAccountFormModal } from "./bank-account-form-modal";
import { AssignStationsModal } from "./assign-stations-modal";

type TransactionRow = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  date: string;
  category: string;
  description: string;
  payerName?: string | null;
  reference?: string | null;
  sourceModule: string;
  status: string;
};

type BankAccountDetails = {
  account: {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    scope: "STATION" | "FLEET";
    isActive: boolean;
    stationAssignments?: {
      stationId: string;
      station: { id: string; name: string; code: string };
    }[];
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalCredited: number;
    totalDebited: number;
    netBalance: number;
    transactionCount: number;
  };
  transactions: TransactionRow[];
};

const formatMoney = (value: number) =>
  `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        {format(new Date(row.original.date), "LLL dd, y HH:mm")}
      </span>
    ),
    footer: () => "Total",
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    meta: { label: "Type" },
    cell: ({ row }) => {
      const isCredit = row.original.type === "CREDIT";
      return (
        <Badge
          variant="outline"
          className={
            isCredit
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }
        >
          {isCredit ? (
            <ArrowDownLeft className="mr-1 size-3" />
          ) : (
            <ArrowUpRight className="mr-1 size-3" />
          )}
          {isCredit ? "Credit" : "Debit"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "payerName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payer" />,
    meta: { label: "Payer" },
    cell: ({ row }) => {
      const payer = row.original.payerName;
      const isCredit = row.original.type === "CREDIT";
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {payer || "—"}
          </span>
          {payer ? (
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {isCredit ? "Payer" : "Payee"}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    meta: { label: "Category" },
    cell: ({ row }) => (
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {row.original.category.replace(/_/g, " ")}
      </span>
    ),
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    meta: { label: "Description" },
  },
  {
    accessorKey: "reference",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.reference || "—"}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    meta: { label: "Amount" },
    cell: ({ row }) => {
      const isCredit = row.original.type === "CREDIT";
      return (
        <span
          className={`font-mono font-semibold ${
            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isCredit ? "+" : "-"}
          {formatMoney(row.original.amount)}
        </span>
      );
    },
    footer: ({ table }) => {
      const net = table.getFilteredRowModel().rows.reduce((sum, row) => {
        const amt = row.original.amount;
        return sum + (row.original.type === "CREDIT" ? amt : -amt);
      }, 0);
      return (
        <span
          className={`font-mono font-semibold ${
            net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {formatMoney(net)}
        </span>
      );
    },
  },
];

export function BankAccountDetailsView({
  initialDetails,
  backUrl,
}: {
  initialDetails: BankAccountDetails;
  backUrl: string;
}) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { account, summary, transactions } = initialDetails;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/tenant/bank-accounts/${account.id}`);
      if (res.error) throw new Error(res.error.message);
      toast.success("Bank account deleted");
      router.push(backUrl);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const insightStats = useMemo(
    () =>
      buildPctStats([
        {
          key: "credited",
          label: "Total Credited",
          value: summary.totalCredited,
          color: "#10b981",
          format: formatMoney,
        },
        {
          key: "debited",
          label: "Total Debited",
          value: summary.totalDebited,
          color: "#ef4444",
          format: formatMoney,
        },
        {
          key: "netBalance",
          label: "Net Balance",
          value: summary.netBalance,
          color: summary.netBalance >= 0 ? "#10b981" : "#ef4444",
          format: formatMoney,
        },
      ]),
    [summary]
  );

  const filterFields: DataTableFilterField<TransactionRow>[] = useMemo(() => {
    const categories = Array.from(new Set(transactions.map((t) => t.category).filter(Boolean)));
    return [
      {
        id: "type",
        label: "Type",
        options: [
          { label: "Credit", value: "CREDIT" },
          { label: "Debit", value: "DEBIT" },
        ],
      },
      {
        id: "category",
        label: "Category",
        options: categories.map((category) => ({
          label: category.replace(/_/g, " "),
          value: category,
        })),
      },
    ];
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{account.bankName}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-primary/10 text-primary uppercase">
                {account.scope}
              </span>
              {account.isActive ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <XCircle className="size-3" /> Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account.accountName} • <span className="font-mono">{account.accountNumber}</span>
            </p>
            {account.scope === "STATION" && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span>
                  {account.stationAssignments && account.stationAssignments.length > 0
                    ? `${account.stationAssignments.length} Assigned Station${account.stationAssignments.length === 1 ? "" : "s"} (${account.stationAssignments.map((a) => a.station?.name).filter(Boolean).join(", ")})`
                    : "0 Stations Assigned"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {account.scope === "STATION" && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <Building2 className="size-4" />
              Assign Stations
            </Button>
          )}
          <Button onClick={() => setIsEditModalOpen(true)}>Edit Details</Button>
          {transactions.length === 0 && (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete Account
            </Button>
          )}
        </div>
      </div>

      <TableInsightCards stats={insightStats} breakdownTitle="Cashflow mix" />

      <DataTable
        columns={columns}
        data={transactions}
        tableId="bank-account-transactions"
        filterFields={filterFields}
        searchPlaceholder="Search payer, description, reference, category..."
        emptyMessage="No transactions recorded for this account."
        pageSize={25}
      />

      <BankAccountFormModal
        tenantSlug=""
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
        initialData={{
          id: account.id,
          scope: account.scope,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          isActive: account.isActive,
        }}
        fixedScope={account.scope}
        hasTransactions={transactions.length > 0}
      />

      {account.scope === "STATION" && (
        <AssignStationsModal
          accountId={account.id}
          accountLabel={`${account.bankName} · ${account.accountNumber}`}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
          initiallyAssignedIds={(account.stationAssignments ?? []).map((a) => a.stationId)}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank account ({account.bankName} - {account.accountNumber})? This action cannot be undone.
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
    </div>
  );
}

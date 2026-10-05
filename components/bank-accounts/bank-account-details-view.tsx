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
  Copy,
  Check,
  Landmark,
  Wifi,
  ReceiptText,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  const [copied, setCopied] = useState(false);

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

  const copyAccountNumber = () => {
    if (!account.accountNumber) return;
    navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    toast.success("Account number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCardNumber = (num: string) => {
    const clean = num.replace(/\s+/g, "");
    return clean.replace(/(\d{4})/g, "$1 ").trim();
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{account.bankName} Account</h1>
              <Badge variant="outline" className="text-xs font-semibold uppercase">
                {account.scope}
              </Badge>
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
            {/* {account.scope === "STATION" && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span>
                  {account.stationAssignments && account.stationAssignments.length > 0
                    ? `${account.stationAssignments.length} Assigned Station${account.stationAssignments.length === 1 ? "" : "s"} (${account.stationAssignments.map((a) => a.station?.name).filter(Boolean).join(", ")})`
                    : "0 Stations Assigned"}
                </span>
              </div>
            )} */}
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

      {/* Main Bank Account Header Card with Balance (Left) & ATM Card (Right) */}
      <Card className="overflow-hidden border border-border/60 shadow-xs bg-card">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* LEFT: Balance & Transaction Metrics */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Account Balance
                  </span>
                  <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0">
                    {account.scope} LEDGER
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2
                    className={cn(
                      "font-heading text-3xl font-bold tracking-tight font-mono",
                      summary.netBalance >= 0 ? "text-foreground" : "text-rose-600"
                    )}
                  >
                    {formatMoney(summary.netBalance)}
                  </h2>
                </div>
              </div>

              {/* 3 Metric Summary Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-xs font-medium">Total Credited</span>
                    <ArrowDownLeft className="size-4 text-emerald-500" />
                  </div>
                  <span className="font-mono text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(summary.totalCredited)}
                  </span>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-xs font-medium">Total Debited</span>
                    <ArrowUpRight className="size-4 text-rose-500" />
                  </div>
                  <span className="font-mono text-sm sm:text-base font-semibold text-rose-600 dark:text-rose-400">
                    -{formatMoney(summary.totalDebited)}
                  </span>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-xs font-medium">Total Transactions</span>
                    <ReceiptText className="size-4 text-primary" />
                  </div>
                  <span className="font-mono text-sm sm:text-base font-semibold text-foreground">
                    {summary.transactionCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: ATM Card Design */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] sm:max-w-[380px] h-[215px] sm:h-[225px] rounded-2xl p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between select-none bg-gradient-to-br from-slate-900 via-neutral-900 to-zinc-950 border border-white/10 group transition-all duration-300">
                {/* Decorative background glow & shapes */}
                <div className="absolute -right-12 -top-12 w-44 h-44 bg-primary/25 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/35 transition-all duration-500" />
                <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_70%)] pointer-events-none" />

                {/* Top of Card: Bank Name & Wireless Contactless Icon */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="size-4 sm:size-5 text-amber-300 shrink-0" />
                    <span className="font-bold tracking-wider text-sm sm:text-base text-zinc-100 uppercase truncate max-w-[200px]">
                      {account.bankName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="size-4 text-zinc-400 rotate-90" />
                    <span className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase">
                      {account.scope}
                    </span>
                  </div>
                </div>

                {/* Middle: EMV Chip & Account Number */}
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Metallic Golden Chip */}
                    <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 p-[1.5px] shadow-sm">
                      <div className="w-full h-full rounded-[3px] border border-amber-900/40 grid grid-cols-3 grid-rows-2 gap-[1.5px] p-[1.5px] opacity-85">
                        <div className="border-r border-b border-amber-900/30 rounded-tl" />
                        <div className="border-b border-amber-900/30" />
                        <div className="border-l border-b border-amber-900/30 rounded-tr" />
                        <div className="border-r border-amber-900/30 rounded-bl" />
                        <div />
                        <div className="border-l border-amber-900/30 rounded-br" />
                      </div>
                    </div>
                  </div>

                  {/* Formatted Account Number with Copy Button */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base sm:text-lg font-bold tracking-[0.2em] text-zinc-100">
                      {formatCardNumber(account.accountNumber)}
                    </span>
                    <button
                      type="button"
                      onClick={copyAccountNumber}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy account number"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom of Card: Card Holder & Overlapping Circles */}
                <div className="relative z-10 flex items-end justify-between pt-1">
                  <div className="space-y-0.5 max-w-[220px]">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-medium">
                      Account Holder
                    </div>
                    <div className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase truncate">
                      {account.accountName}
                    </div>
                  </div>
                  <div className="flex -space-x-2.5 opacity-80">
                    <div className="size-6 sm:size-7 rounded-full bg-rose-500/80" />
                    <div className="size-6 sm:size-7 rounded-full bg-amber-400/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
